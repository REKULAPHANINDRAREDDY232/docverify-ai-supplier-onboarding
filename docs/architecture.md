# Architecture

## Purpose

DocVerify AI Phase 2 provides a multi-role supplier onboarding workspace. Suppliers submit company profiles and documents; reviewers assess packets manually; administrators configure access and catalogues. Persistence is PostgreSQL. Artificial intelligence features are deferred to Phase 3.

## Logical architecture

```text
┌──────────────────────────────────────────────────────────┐
│                     React SPA (Vite)                     │
│  /supplier/*   /reviewer/*   /admin/*   /login|/register │
└────────────────────────────┬─────────────────────────────┘
                             │ cookie session (credentials)
┌────────────────────────────▼─────────────────────────────┐
│                 Express API (TypeScript)                 │
│  auth │ suppliers │ documents │ reviewer │ admin │ health│
└───────┬───────────────┬───────────────────┬──────────────┘
        │               │                   │
        ▼               ▼                   ▼
   PostgreSQL      Upload volume        Qdrant
   (Prisma)        (files on disk)      (reserved)
```

## Frontend

- **Stack:** React 19, React Router, TypeScript, Vite
- **Shell:** shared responsive `AppShell` with sidebar navigation
- **Auth client:** `credentials: 'include'` for cookie sessions; role-based `ProtectedRoute`
- **Portals:**
  - Supplier: dashboard, profile, documents, onboarding status
  - Reviewer: dashboard, supplier list/detail, checklist, decisions, requests
  - Admin: dashboard, users, suppliers, document types, checklists, reference sources, audit logs

The SPA talks only to documented backend APIs. It does not embed fake supplier payloads.

## Backend

- **Stack:** Node.js, Express 5, TypeScript, Zod validation
- **Layers:** routes → services → Prisma / filesystem
- **Auth:** bcrypt password verification; JWT signed access token in HttpOnly cookie `docverify_access_token`
- **Authorization:** middleware `authenticate` + `authorize(role…)`; service-level ownership checks for suppliers/documents
- **Uploads:** Multer memory storage → magic-byte validation → UUID filenames under `UPLOAD_DIR`
- **Audit:** `AuditLog` rows for auth, admin mutations, and key review actions

## Data store

PostgreSQL holds users, suppliers, documents metadata, checklist definitions/checks, review actions, document requests, reference sources, and audit logs. Prisma migrations are the source of truth for schema evolution. See [`database-design.md`](./database-design.md).

Binary files are stored on disk (or the Docker `uploads_data` volume). Database rows store metadata and paths only. There are no OCR/LLM result columns in Phase 2.

## Qdrant

Compose starts Qdrant on port 6333 so the environment is ready for Phase 3 retrieval work. Phase 2 application code does **not** index documents into Qdrant or query vectors.

## Deployment topology (Docker Compose)

| Service | Image / build | Host port (default) | Depends on |
| --- | --- | --- | --- |
| `frontend` | Nginx serving Vite build | 3000 | healthy `backend` |
| `backend` | Node runtime + Prisma migrate entrypoint | 4000 | healthy `postgres`, healthy `qdrant` |
| `postgres` | `postgres:16-alpine` | 5434 → 5432 | — |
| `qdrant` | `qdrant/qdrant:v1.13.2` | 6333, 6334 | — |

Services share the bridge network `docverify-net` and resolve each other by hostname (`postgres`, `qdrant`, `backend`, `frontend`).

## Security boundaries

1. Unauthenticated callers may only register, login, logout, and hit health/root metadata.
2. Supplier contacts may mutate only their own supplier packet.
3. Reviewer APIs reject `SUPPLIER_CONTACT`.
4. Admin APIs reject non-`ADMIN` roles.
5. Deactivated users fail login and subsequent authenticated requests.

## Phase boundary

| Concern | Phase 2 | Phase 3 |
| --- | --- | --- |
| Document presence / checklist | Manual reviewer entry | Assisted by OCR/LLM (planned) |
| Field extraction | Not implemented | Planned |
| Authenticity scoring | Not implemented | Planned |
| Policy Q&A / RAG | Not implemented | Planned via Qdrant |

## Related documents

- [`api-documentation.md`](./api-documentation.md)
- [`database-design.md`](./database-design.md)
- [`docker-setup.md`](./docker-setup.md)
