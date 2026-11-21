# Architecture Overview

## Stack

- **Frontend:** React, Vite, TypeScript, React Router
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL via Prisma
- **Auth (planned):** JWT + bcrypt
- **Uploads (planned):** Multer
- **Vector store (reserved):** Qdrant
- **Containers:** Docker Compose for PostgreSQL and Qdrant
- **Testing:** Jest + Supertest

## Runtime topology

```text
Browser (React)
    |
    | HTTP /api
    v
Express API
    |
    +--> PostgreSQL (Prisma)
    |
    +--> File uploads directory (later)
    |
    +--> Qdrant (reserved for later retrieval features)
```

## Frontend workspaces

- `/supplier` — supplier portal
- `/reviewer` — reviewer dashboard
- `/admin` — admin dashboard

Layouts share a responsive shell with sidebar navigation and onboarding status badges.

## Backend foundation

- `GET /` service metadata
- `GET /api/health` health check
- Zod-validated environment configuration
- Prisma schema for users, suppliers, document types, checklist checks, review actions, document requests, reference sources, and audit logs

See [`database-schema.md`](./database-schema.md) for the full relational model.
