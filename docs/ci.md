# Continuous Integration (GitHub Actions)

DocVerify AI runs automated quality checks on every push and pull request to `main`.

Workflow file: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

## What the pipeline checks

| Job | Checks |
| --- | --- |
| **Frontend** | `npm ci`, lint, TypeScript typecheck, production build |
| **Backend** | `npm ci`, Prisma generate/validate/migrate against a PostgreSQL service, lint, typecheck, unit tests, integration tests |
| **Docker** | `docker compose config`, frontend image build, backend image build |
| **CI gate** | Succeeds only when all jobs above succeed |

Installs always use lockfiles (`npm ci`). The workflow fails if a required npm script is missing or any check fails. Tests are not suppressed.

CI uses synthetic Postgres credentials and a dedicated `docverify_ai_test` database inside the GitHub-hosted Postgres service. No production secrets are required or committed.

## How to inspect GitHub Actions execution

1. Open the repository on GitHub.
2. Select the **Actions** tab.
3. Choose the **CI** workflow in the left sidebar.
4. Open the latest run for your branch or pull request.
5. Expand each job (**Frontend**, **Backend**, **Docker**, **CI gate**) to view step logs.
6. From a pull request, open the **Checks** tab to see pass/fail status before merge.

### CLI (optional)

If GitHub CLI is authenticated:

```bash
# List recent CI runs
gh run list --workflow=ci.yml

# Watch the latest run
gh run watch

# Open the latest run in the browser
gh run view --web

# Download logs for a failed run
gh run view <run-id> --log-failed
```

### Local equivalents

```bash
# Frontend
cd frontend && npm ci && npm run lint && npm run typecheck && npm run build

# Backend (requires Postgres reachable via TEST_DATABASE_URL)
cd backend && npm ci
npm run prisma:generate
npm run prisma:validate:schema
npm run prisma:migrate:deploy
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration

# Docker
cp .env.example .env   # replace placeholders with local synthetic values
docker compose config --quiet
docker build -f frontend/Dockerfile frontend
docker build -f backend/Dockerfile backend
```
