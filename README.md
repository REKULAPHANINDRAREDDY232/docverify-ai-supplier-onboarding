# DocVerify AI: Supplier Onboarding

DocVerify AI is a procurement supplier-onboarding workspace for small teams that need structured company intake, document collection, and **manual** review before a supplier is approved.

This repository implements **Phase 2**: authenticated supplier/reviewer/admin workflows on PostgreSQL, with Docker packaging and GitHub Actions CI. It does **not** implement OCR, automatic field extraction, LLM verification, or RAG.

## Supplier onboarding problem

Small procurement teams often collect supplier packs through email and shared drives. That process makes it hard to:

- know which required documents are missing
- keep one authoritative company profile
- record reviewer decisions with an audit trail
- control who can change roles and catalogues

DocVerify AI addresses those operational gaps with role-based portals and persistent PostgreSQL records.

## Product objectives

1. Let supplier contacts create and update a company profile and upload required documents.
2. Let reviewers inspect packets, record checklist results, request corrections, and decide outcomes.
3. Let administrators manage users, document types, checklist items, reference sources, and audit visibility.
4. Persist all operational data in PostgreSQL with Prisma migrations.
5. Package the stack for local/production-like runs with Docker Compose.
6. Prove behaviour with automated Jest/Supertest tests and GitHub Actions.

## User roles

| Role | Capabilities in Phase 2 |
| --- | --- |
| `SUPPLIER_CONTACT` | Register/login, maintain own supplier profile, upload/replace documents, submit for review, view document requests |
| `REVIEWER` | Browse submitted packets, download documents, record checklist checks, request documents, apply manual corrections, record decisions |
| `ADMIN` | All admin APIs/UI: dashboard stats, users/roles/activation, suppliers list, document types, checklists, reference sources, audit logs |

Public registration always creates `SUPPLIER_CONTACT`. Reviewer and admin accounts are provisioned by an administrator.

## Supported document types

Seeded / default catalogue codes:

| Code | Typical requirement |
| --- | --- |
| `BUSINESS_REGISTRATION` | Business registration certificate |
| `BANK_CONFIRMATION` | Bank confirmation letter |
| `INSURANCE_CERTIFICATE` | Insurance certificate |

Administrators can create additional document types and checklist items. Uploads accept PDF, JPG, and PNG only (max 10 MB), with MIME and magic-byte validation.

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, TypeScript, React Router |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Auth | JWT in HttpOnly cookie + bcrypt password hashes |
| Uploads | Multer (memory) + filesystem persistence |
| Vector DB | Qdrant container reserved only (not used by Phase 2 application logic) |
| Containers | Docker Compose |
| CI | GitHub Actions |
| Tests | Jest + Supertest |

## Project architecture

```text
Browser (React SPA)
        |
        | HTTPS/HTTP + credentials (cookie)
        v
Express API (/api/*)
        |
        +--> PostgreSQL (Prisma models + migrations)
        +--> Upload volume (/app/uploads)
        +--> Qdrant (running service reserved for Phase 3 retrieval)
```

Frontend route groups:

- `/supplier/*` — supplier portal
- `/reviewer/*` — manual review workspace
- `/admin/*` — administration workspace

Detailed design: [`docs/architecture.md`](docs/architecture.md).

## Installation

### Prerequisites

- Node.js 22+
- npm 10+
- Docker Desktop (recommended)

### Application dependencies

```bash
cd backend && npm ci
cd ../frontend && npm ci
```

Use lockfiles (`npm ci`) for reproducible installs.

## Environment configuration

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Replace placeholder secrets before use:

- `POSTGRES_PASSWORD` / matching `DATABASE_URL` password
- `JWT_SECRET` (min 16 characters)
- optional `SEED_*` accounts for local seeding only

Never commit real `.env` files. Examples are templates only.

## Docker startup

```bash
cp .env.example .env
# edit secrets
docker compose up --build
```

| Service | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| Backend health | http://localhost:4000/api/health |
| Qdrant | http://localhost:6333/readyz |
| PostgreSQL (host) | `localhost:5434` |

The backend entrypoint runs `prisma migrate deploy` before listening. Named volumes persist PostgreSQL, Qdrant, and uploads.

Full guide: [`docs/docker-setup.md`](docs/docker-setup.md).

## Database migrations

```bash
cd backend
npx prisma generate
npx prisma migrate deploy    # CI / Docker / shared DBs
# or for local schema iteration:
npx prisma migrate dev
npm run prisma:seed          # optional synthetic seed data
```

Schema design: [`docs/database-design.md`](docs/database-design.md).

## API overview

| Area | Base path | Notes |
| --- | --- | --- |
| Auth | `/api/auth` | Register, login, logout, session (`/me`) |
| Suppliers / documents | `/api/suppliers`, `/api/documents` | Profile, upload, submit, download |
| Reviewer | `/api/reviewer` | Manual checklist, decisions, requests, corrections |
| Admin | `/api/admin` | Users, catalogues, audit, dashboard counts |
| Health | `/api/health` | Liveness |

Full endpoint reference: [`docs/api-documentation.md`](docs/api-documentation.md).

## Testing

```bash
# dedicated test DB (example)
export TEST_DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5434/docverify_ai_test?schema=public'
export DATABASE_URL="$TEST_DATABASE_URL"

cd backend
npm run prisma:migrate:deploy
npm run test:unit
npm run test:integration
# or
npm test
```

Verified locally and in GitHub Actions: unit + integration suites against PostgreSQL using synthetic `@example.test` accounts. See [`docs/testing.md`](docs/testing.md).

## GitHub Actions

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

On every push/PR to `main`, CI runs:

1. Frontend lint, typecheck, build
2. Backend lint, typecheck, unit + integration tests with a Postgres service
3. Prisma schema/migrate validation
4. Docker Compose config validation and image builds

How to inspect runs: [`docs/ci.md`](docs/ci.md).

## Security measures (Phase 2)

- Passwords hashed with bcrypt; hashes never returned in API responses
- JWT access token stored in HttpOnly cookie (`docverify_access_token`), not `localStorage`
- Role guards on reviewer and admin routes
- Supplier ownership checks prevent cross-supplier access
- Inactive users cannot log in or call authenticated APIs
- Upload allow-list: PDF/JPG/PNG, size limit, MIME + signature checks
- Audit log records authentication and administrative/review changes
- Secrets supplied via environment variables; `.env` is gitignored

## Phase 2 implemented features

- Authentication and RBAC (`SUPPLIER_CONTACT`, `REVIEWER`, `ADMIN`)
- Supplier profile create/update/submit with status tracking
- Document upload, replacement, and authenticated download
- Reviewer packet listing, **manual** checklist results, decisions, document requests, corrections
- Admin dashboard counts from PostgreSQL (not static placeholders)
- Admin CRUD for users/roles/activation, document types, checklist items, reference sources, audit log viewing
- Prisma schema, migrations, seed, and relationship validation
- Docker Compose for frontend, backend, PostgreSQL, Qdrant
- Jest/Supertest unit and integration tests
- GitHub Actions CI

## Phase 3 planned features (not implemented)

The following are **out of scope for Phase 2** and must not be treated as complete:

- OCR / scanned-document text recognition
- Automatic field extraction from uploaded files
- LLM-based authenticity or compliance scoring
- RAG / Qdrant-backed retrieval for policy answers
- Confidence scores or AI verification results in the UI/API
- Real bank or government registry integrations

In Phase 2, document assessment is **manual human review** only.

## Documentation index

| Document | Purpose |
| --- | --- |
| [`docs/architecture.md`](docs/architecture.md) | System architecture |
| [`docs/database-design.md`](docs/database-design.md) | Database design |
| [`docs/api-documentation.md`](docs/api-documentation.md) | API reference |
| [`docs/docker-setup.md`](docs/docker-setup.md) | Docker Compose guide |
| [`docs/testing.md`](docs/testing.md) | Test strategy and results |
| [`docs/sprint-documentation.md`](docs/sprint-documentation.md) | Sprint / agile records |
| [`docs/ci.md`](docs/ci.md) | CI inspection guide |

## Project structure

```text
.
├── backend/                 # Express + Prisma API
├── frontend/                # React + Vite UI
├── docs/                    # Phase documentation
├── docker/                  # Postgres init helpers
├── .github/workflows/       # CI
├── docker-compose.yml
└── .env.example
```
