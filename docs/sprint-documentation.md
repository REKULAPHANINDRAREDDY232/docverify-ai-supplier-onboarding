# Sprint Documentation — Phase 2

Project: **DocVerify AI Supplier Onboarding**  
Branch focus: `phase2`  
Base documentation date: November 2026

This record describes the Phase 2 implementation sprint. Claims are limited to verified repository behaviour.

## Sprint goal

Deliver a working supplier-onboarding workspace where:

1. suppliers can authenticate, manage profiles, upload documents, and submit packets  
2. reviewers can perform **manual** checklist review and decisions  
3. administrators can manage users, catalogues, and audit visibility  
4. data persists in PostgreSQL  
5. the stack runs under Docker Compose  
6. automated tests and GitHub Actions prove the critical paths  

**Non-goal:** OCR, automatic extraction, LLM verification, and RAG.

## Sprint backlog

| ID | Backlog item | Status |
| --- | --- | --- |
| P2-01 | Prisma domain model, migrations, seed, schema validation | Done |
| P2-02 | Auth + RBAC (register/login/logout/me, HttpOnly JWT cookie) | Done |
| P2-03 | Supplier portal APIs + UI (profile, documents, submit) | Done |
| P2-04 | Reviewer APIs + UI (list, checklist, decisions, requests, corrections) | Done |
| P2-05 | Admin APIs + UI (dashboard, users, types, checklists, references, audits) | Done |
| P2-06 | Automated Jest/Supertest unit + integration suite | Done |
| P2-07 | Full Docker Compose packaging (frontend/backend/postgres/qdrant) | Done |
| P2-08 | GitHub Actions CI (lint, typecheck, tests, migrate, images) | Done |
| P2-09 | Phase 2 technical documentation pack | Done |
| P3-* | OCR / extraction / LLM / RAG | Deferred to Phase 3 |

## Completed work

### Data & auth

- Ten-model Prisma schema with enums for roles, supplier status, documents, checklist, review, requests  
- Migrations including `User.isActive`  
- bcrypt + HttpOnly JWT cookie authentication  
- Role middleware and ownership guards  

### Supplier workflow

- Profile create/update  
- Document upload/replace/download with PDF/JPG/PNG validation  
- Submit gate requiring required ACTIVE documents  
- Status tracking from `DRAFT` to later review states  

### Reviewer workflow (manual)

- Packet search/list and detail  
- Checklist check upsert  
- Decisions (`APPROVED`, `ON_HOLD`, `NEEDS_INFORMATION`)  
- Document requests and manual corrections with audit metadata  

### Admin workflow

- Live dashboard counts from PostgreSQL  
- User create/search/role/`isActive`  
- Document type and checklist CRUD (versions, effective dates, type links)  
- Reference source CRUD  
- Audit log listing/search  

### Platform

- Dockerfiles, Compose network/volumes/healthchecks, migrate-on-start  
- CI workflow with Postgres service and Docker image builds  
- Documentation under `docs/`

## Pull request references

| Reference | Description |
| --- | --- |
| Branch `phase2` commits | Incremental Phase 2 delivery (`implement supplier onboarding data models` → auth → portal → review/admin → Docker/CI) |
| [PR #15](https://github.com/REKULAPHANINDRAREDDY232/docverify-ai-supplier-onboarding/pull/15) | Docker packaging + GitHub Actions CI (+ test hardening) |
| [Actions run 44902889109](https://github.com/REKULAPHANINDRAREDDY232/docverify-ai-supplier-onboarding/actions/runs/44902889109) | Verified green CI on PR #15 (frontend, backend+Postgres tests, Docker builds, CI gate) |

Additional earlier Phase 2 feature work lives on `phase2` ahead of `main` (`main` historically held the README-first baseline). Merge strategy may keep feature history on `phase2` until the team merges to `main`.

## Sprint review

### Demonstrable outcomes

- Supplier can register, upload required synthetic documents, and submit.  
- Reviewer can open the packet, mark checklist items, request a document, and record a decision.  
- Admin can create users, adjust roles, manage checklist items linked to document types, and view audit rows.  
- `docker compose up --build` starts four healthy services; data survives restart.  
- CI fails closed on lint/type/test/migrate/image errors.

### Explicit exclusions shown to stakeholders

- No automatic reading of PDF contents.  
- No AI “verified / confidence” badges.  
- No Qdrant-powered answers in the UI.

## Sprint retrospective

### What went well

- Clear role separation kept authorization tests meaningful.  
- Prisma migrations + dedicated `docverify_ai_test` database made integration tests reproducible.  
- Compose healthchecks and migrate entrypoint reduced “API up before schema” failures.  
- Splitting unit vs integration scripts clarified CI stages.

### What was difficult

- Host port collisions with older Docker containers during packaging.  
- Postgres volume password drift when Compose secrets changed after first init.  
- Frontend lint rule `react-hooks/set-state-in-effect` required explicit handling on admin list pages.  
- Keeping documentation honest about Phase 3 boundaries while shipping a complete Phase 2 surface.

### Improvements for next sprint (Phase 3 prep)

- Add feature flags so OCR/LLM work cannot accidentally become default behaviour.  
- Design storage for extraction artefacts without breaking Phase 2 document metadata.  
- Introduce contract tests for any future AI provider adapters.  
- Keep Qdrant usage behind an explicit Phase 3 module boundary.

## Individual contribution log

Member 2 / Phase 2 implementation log (repository evidence):

| Area | Contribution evidence |
| --- | --- |
| Foundation & docs baseline | Initial README/main scaffolding; Phase docs structure |
| Database architecture | Prisma schema, migrations, seed, validation scripts, database docs |
| Authentication & RBAC | Auth routes/services, cookie JWT, inactive-user handling, auth tests |
| Supplier portal | Supplier/document services, Multer validation, supplier UI + workflow tests |
| Reviewer workspace | Reviewer APIs/UI for manual checklist/decisions/requests/corrections + tests |
| Admin workspace | Admin CRUD APIs/UI, live dashboard counts, admin tests |
| Docker | Frontend/backend Dockerfiles, Compose services/volumes, migrate entrypoint |
| CI | `.github/workflows/ci.yml`, script gates, Postgres service tests, image builds |
| Verification | Local Jest suite green; Docker persistence check; GitHub Actions run on PR #15 green |
| Phase 2 documentation | README + architecture/database/API/docker/testing/sprint docs |

Assisted engineering tooling (Cursor) was used during implementation; final behaviour is defined by the committed source, tests, and CI results above.
