# Documentation

DocVerify AI: Supplier Onboarding documentation for the Senior IT Project.

## Structure

| Path | Purpose |
| --- | --- |
| `phase-1-product-definition.md` | Member 2 Phase 1 product scope and constraints |
| `architecture.md` | High-level system architecture |
| `database-schema.md` | PostgreSQL / Prisma schema and relationships |
| `api.md` | API endpoint notes |
| `setup.md` | Local development setup |
| `ci.md` | GitHub Actions CI checks and how to inspect runs |

## Current phase focus

Phase 1 established the project foundation:

- React + Vite + TypeScript frontend workspace layouts
- Express + TypeScript API with health endpoint
- Docker Compose services for PostgreSQL and Qdrant
- CI lint/build checks

Phase 2 adds the supplier-onboarding database:

- Prisma models for users, suppliers, documents, checklists, reviews, requests, references, and audit logs
- Migrations and environment-driven seed accounts
- Schema documentation and relationship validation

Out of scope:

- OCR / LLM / RAG / AI verification fields or results
- Real banking or government registry integrations
- Hardcoded production credentials
- Fake backend API responses
