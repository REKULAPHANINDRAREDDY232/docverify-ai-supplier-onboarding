# Testing

Phase 2 automated tests use **Jest** and **Supertest** against a dedicated PostgreSQL database. They exercise real routes, Prisma persistence, and authorization behaviour. Tests do not claim OCR/LLM/RAG coverage because those features are not implemented.

## Layout

```text
backend/tests/
  unit/                     # pure unit tests (no HTTP)
    fileValidation.test.ts
    password.test.ts
  auth.test.ts              # auth + role gates
  supplier-workflow.test.ts # supplier portal + uploads
  reviewer-workflow.test.ts # manual review APIs
  admin-workflow.test.ts    # admin CRUD + audit
  health.test.ts            # health + test-DB assertion
  helpers.ts
  setupEnv.ts               # forces TEST_DATABASE_URL
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm test` | Full suite (unit + integration) |
| `npm run test:unit` | `tests/unit` only |
| `npm run test:integration` | Everything except `tests/unit` |
| `npm run test:db:migrate` / `prisma:migrate:deploy` | Apply migrations to the test database |

Installs use `npm ci` in CI for lockfile reproducibility.

## Test database

`tests/setupEnv.ts` sets:

```text
TEST_DATABASE_URL → DATABASE_URL
```

Default local target: `docverify_ai_test` on host port `5434`.  
GitHub Actions uses a Postgres **service container** on port `5432` with synthetic credentials.

The health suite asserts `current_database() = 'docverify_ai_test'` so tests fail if pointed at the wrong database.

Synthetic emails use the `@example.test` domain. Production credentials are never required.

## Coverage mapped to requirements

### Authentication

1. Supplier contact registration  
2. Duplicate email rejection  
3. Successful login  
4. Incorrect password rejection  
5. Logout  
6. Reviewer authorization (allow reviewer / block supplier)  
7. Administrator authorization (allow admin / block supplier)

### Supplier

8. Profile creation  
9. Profile update  
10. Document upload  
11. Unsupported file rejection  
12. Oversized file rejection  
13. Ownership validation (cross-supplier 403)  
14. Document replacement  
15. Onboarding status tracking (`DRAFT` → `SUBMITTED`)

### Reviewer

16. Supplier packet listing  
17. Document access/download  
18. Checklist result creation  
19. Reviewer decision recording  
20. Additional document request  
21. Review history / audit visibility  

### Admin

22. User role management / activation  
23. Document type management  
24. Checklist item CRUD  
25. Reference source management  
26. Audit log access  

### Security assertions included above

- One supplier cannot read/update another supplier’s data or documents  
- Unauthorized users cannot call reviewer APIs  
- Supplier contacts cannot call admin APIs  
- Upload MIME/signature/size restrictions fail closed  

## Verified results

| Environment | Result |
| --- | --- |
| Local Jest (unit + integration) after Phase 2 expansion | **36 passed / 0 failed** (suite count at documentation time; includes health DB assertion) |
| Local Docker Compose restart persistence | Supplier record + uploaded PDF survived `docker compose restart` |
| GitHub Actions CI on PR #15 | Frontend, Backend (Postgres service + tests), Docker image builds, and CI gate all **passed** |

Run URL (historical verification):  
https://github.com/REKULAPHANINDRAREDDY232/docverify-ai-supplier-onboarding/actions/runs/44902889109

## How to run locally

```bash
# ensure Postgres is up and docverify_ai_test exists
export TEST_DATABASE_URL='postgresql://USER:PASS@127.0.0.1:5434/docverify_ai_test?schema=public'
export DATABASE_URL="$TEST_DATABASE_URL"

cd backend
npm ci
npm run prisma:generate
npm run prisma:migrate:deploy
npm run test:unit
npm run test:integration
```

Frontend quality gates used in CI:

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm run build
```

## What is not tested (and not built)

- OCR pipelines  
- Automatic extraction accuracy  
- LLM verification quality  
- RAG retrieval relevance  
- Live bank/government registry connectors  

Those belong to Phase 3 and must not be marked complete in reports.
