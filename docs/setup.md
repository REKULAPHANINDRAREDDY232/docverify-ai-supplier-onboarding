# Local Setup

## Prerequisites

- Node.js 22+ (for local non-Docker development)
- npm 10+
- Docker Desktop

## Full stack with Docker Compose

```bash
cp .env.example .env
# Replace POSTGRES_PASSWORD, DATABASE_URL password, and JWT_SECRET
docker compose up --build
```

Services:

| Service | Host URL | Notes |
| --- | --- | --- |
| Frontend | http://localhost:3000 | Nginx serves the Vite production build |
| Backend | http://localhost:4000/api/health | Runs `prisma migrate deploy` on start |
| PostgreSQL | localhost:5434 | Named volume `postgres_data` |
| Qdrant | http://localhost:6333/readyz | Named volume `qdrant_data` |

Persistent named volumes:

- `postgres_data`
- `qdrant_data`
- `uploads_data` (mounted at `/app/uploads` in the backend)

Never commit a real `.env`. Use `.env.example` as the template only.

## Local development (apps on host)

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# Infrastructure only
docker compose up -d postgres qdrant

cd backend && npm install && npx prisma migrate deploy && npm run dev
cd ../frontend && npm install && npm run dev
```

- Frontend: http://localhost:5173
- Backend health: http://localhost:4000/api/health

For host-based backend development, `DATABASE_URL` should target `127.0.0.1:5434` (see `backend/.env.example`). Compose service networking uses hostname `postgres`.

## Seed (optional)

```bash
cd backend
npm run prisma:seed
npm run prisma:validate
```

Configure `SEED_*` values in `backend/.env` before seeding. Do not commit real credentials.

## Quality checks

```bash
cd backend && npm run lint && npm run typecheck && npm test && npm run build
cd ../frontend && npm run lint && npm run typecheck && npm run build
docker compose config
```

GitHub Actions CI runs these checks on pushes and pull requests to `main`. See [`ci.md`](./ci.md) for pipeline details and how to inspect workflow runs.
