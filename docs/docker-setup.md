# Docker Setup

DocVerify AI Phase 2 runs as four Compose services: frontend, backend, PostgreSQL, and Qdrant.

## Prerequisites

- Docker Desktop (or compatible Engine + Compose plugin)
- A local `.env` created from `.env.example` with replaced secrets

## Files

| Path | Role |
| --- | --- |
| `docker-compose.yml` | Service definitions, network, volumes, health checks |
| `frontend/Dockerfile` | Multi-stage Vite build → Nginx on port 3000 |
| `backend/Dockerfile` | Multi-stage Node build → migrate entrypoint → API on 4000 |
| `backend/docker-entrypoint.sh` | `prisma migrate deploy` then `node dist/index.js` |
| `.dockerignore` / `*/.dockerignore` | Keep secrets and local artefacts out of build context |
| `docker/postgres/init-test-db.sql` | Creates `docverify_ai_test` on first Postgres volume init |

## Configure environment

```bash
cp .env.example .env
```

Required replacements before first start:

- `POSTGRES_PASSWORD`
- matching password inside `DATABASE_URL`
- `JWT_SECRET` (≥ 16 characters)

Compose uses service hostnames inside the network:

- `DATABASE_URL=...@postgres:5432/...`
- `QDRANT_URL=http://qdrant:6333`
- `CORS_ORIGIN=http://localhost:3000` (browser origin)
- `VITE_API_BASE_URL=http://localhost:4000` (baked into the frontend build)

Do not commit `.env`.

## Start the stack

```bash
docker compose up --build
```

Detached:

```bash
docker compose up --build -d
docker compose ps
```

| Service | Default host URL | Health |
| --- | --- | --- |
| Frontend | http://localhost:3000 | HTTP `/` |
| Backend | http://localhost:4000/api/health | HTTP health |
| PostgreSQL | localhost:5434 | `pg_isready` |
| Qdrant | http://localhost:6333/readyz | TCP/ready check |

## Migration deployment

The backend container applies migrations automatically:

```text
prisma migrate deploy → node dist/index.js
```

The API does not start until migrations succeed (with retries while Postgres becomes ready).

## Persistent volumes

| Volume | Mount | Survives restart |
| --- | --- | --- |
| `postgres_data` | `/var/lib/postgresql/data` | Yes |
| `qdrant_data` | `/qdrant/storage` | Yes |
| `uploads_data` | `/app/uploads` | Yes |

Verified during Phase 2 packaging: supplier rows and uploaded files remained available after `docker compose restart`.

## Validate Compose without starting

```bash
cp .env.example .env
# replace placeholders with synthetic local values
docker compose config --quiet
```

GitHub Actions runs the same configuration check and builds both application images.

## Infrastructure-only mode (local Node apps)

```bash
docker compose up -d postgres qdrant
```

Point `backend/.env` `DATABASE_URL` at `127.0.0.1:5434` and run `npm run dev` for API/UI on the host.

## Tear down

```bash
docker compose down          # keep volumes
docker compose down -v       # destroy DB/uploads/Qdrant data
```

## Notes

- Qdrant is started for readiness, not used by Phase 2 business logic.
- `COOKIE_SECURE=false` is appropriate for local HTTP. Enable `COOKIE_SECURE=true` only behind HTTPS.
- Changing `POSTGRES_PASSWORD` after a volume already exists does not rewrite the existing database password; recreate volumes or align `.env` with the existing password.
