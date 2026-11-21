# DocVerify AI: Supplier Onboarding

Academic Senior IT Project foundation for supplier onboarding used by small procurement teams.

Member 2 Phase 1 focuses on project scaffolding, workspace layouts, API health, environment validation, and documentation — not AI verification or external registry integrations.

## Features in this foundation

- Supplier portal layout
- Reviewer dashboard layout
- Admin dashboard layout
- Sidebar navigation
- Responsive tables and forms
- Onboarding status indicators
- Express health endpoint
- Prisma domain model for roles and documents
- Docker Compose for PostgreSQL and Qdrant
- GitHub Actions CI for lint/test/build

## Roles

- `SUPPLIER_CONTACT`
- `REVIEWER`
- `ADMIN`

## Initial document types

- `BUSINESS_REGISTRATION`
- `BANK_CONFIRMATION`
- `INSURANCE_CERTIFICATE`

## Project structure

```text
.
├── backend/                 # Express + TypeScript API
├── frontend/                # React + Vite + TypeScript UI
├── docs/                    # Product and setup documentation
├── .github/workflows/       # CI pipelines
├── docker-compose.yml       # PostgreSQL + Qdrant
├── .env.example
├── .gitignore
└── .dockerignore
```

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, TypeScript |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth (planned) | JWT + bcrypt |
| Uploads (planned) | Multer |
| Vector DB (reserved) | Qdrant |
| Containers | Docker Compose |
| Testing | Jest + Supertest |

## Quick start (Docker Compose)

```bash
# Configure secrets (never commit .env)
cp .env.example .env

# Build and start frontend, backend, PostgreSQL, and Qdrant
docker compose up --build
```

- UI: http://localhost:3000
- API health: http://localhost:4000/api/health
- Qdrant: http://localhost:6333/readyz

The backend entrypoint runs `prisma migrate deploy` before serving traffic. Uploads, PostgreSQL, and Qdrant data use named volumes.

## Local development (without full Compose app stack)

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Configure environment
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start Postgres + Qdrant only
docker compose up -d postgres qdrant

# Run API
cd backend && npm run dev

# Run UI (new terminal)
cd frontend && npm run dev
```

- UI: http://localhost:5173
- API health: http://localhost:4000/api/health

## Scripts

### Backend

| Script | Description |
| --- | --- |
| `npm run dev` | Start API with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled API |
| `npm run lint` | ESLint |
| `npm test` | Jest + Supertest against `docverify_ai_test` |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | Integration tests only |
| `npm run typecheck` | TypeScript `--noEmit` check |
| `npm run test:db:migrate` | Apply Prisma migrations to the test database |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Create/apply migrations |
| `npm run prisma:seed` | Seed document types, checklist, users |
| `npm run prisma:validate` | Validate seeded relationships |

Automated tests use synthetic `@example.test` accounts, a dedicated PostgreSQL database (`docverify_ai_test`), and never production credentials.

### Frontend

| Script | Description |
| --- | --- |
| `npm run dev` | Vite development server |
| `npm run build` | Typecheck + production build |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build |

## Out of scope (Phase 1)

- OCR / LLM / RAG / AI verification
- Real bank or government registry integrations
- Hardcoded credentials
- Fake backend API responses
- Real supplier financial or personal data

## Documentation

See [`docs/`](./docs/README.md) for product definition, architecture, API notes, and setup guidance.
# docverify-ai-supplier-onboarding
