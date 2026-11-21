# Phase 1 Product Definition — Member 2

## Product

**DocVerify AI: Supplier Onboarding** helps small procurement teams collect, review, and track supplier compliance documents before a supplier is approved for purchasing activity.

## Users and roles

| Role | Responsibility |
| --- | --- |
| `SUPPLIER_CONTACT` | Completes company profile and uploads required documents |
| `REVIEWER` | Reviews submitted documents and records decisions |
| `ADMIN` | Manages user access and monitors onboarding operations |

## Initial document types

- `BUSINESS_REGISTRATION`
- `BANK_CONFIRMATION`
- `INSURANCE_CERTIFICATE`

## Onboarding statuses

- `DRAFT`
- `SUBMITTED`
- `IN_REVIEW`
- `CHANGES_REQUESTED`
- `APPROVED`
- `REJECTED`

## Phase 1 deliverables

1. Monorepo foundation (`frontend`, `backend`, `docs`, CI)
2. Supplier portal, reviewer dashboard, and admin dashboard layouts
3. Sidebar navigation, responsive tables/forms, status indicators
4. Express health endpoint and environment validation
5. Prisma domain model and Docker Compose services

## Explicit exclusions

- No OCR, LLM, RAG, or AI verification features
- No real bank or government registry integrations
- No real supplier personal/financial sample data
- No fake backend API response payloads
- No hardcoded passwords or credentials in source
