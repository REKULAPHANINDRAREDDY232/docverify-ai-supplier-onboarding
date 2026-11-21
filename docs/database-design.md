# Database Design

PostgreSQL schema for DocVerify AI Supplier Onboarding, managed with Prisma.

The model is organised around **companies and supplier onboarding packets**, not academic applications.

## Design goals

1. One contact user maps to at most one supplier profile.
2. Document types and checklist items are administrator-configurable.
3. Document replacement preserves history via `REPLACED` status and `supersededDocumentId`.
4. Review outcomes are explicit rows (`ChecklistCheck`, `ReviewAction`, `DocumentRequest`).
5. Sensitive credentials stay in `User.passwordHash` and are never selected for API responses.
6. Phase 2 stores **no** OCR text, extraction JSON, LLM scores, or RAG embeddings.

## Entity relationship overview

```text
User
  │
  ├── SUPPLIER_CONTACT ──► Supplier
  │                          ├── SupplierDocument
  │                          ├── ChecklistCheck
  │                          ├── ReviewAction
  │                          └── DocumentRequest
  │
  └── REVIEWER / ADMIN
         │
         ├── ReviewAction
         ├── ChecklistCheck
         ├── DocumentRequest
         └── AuditLog

ADMIN-managed configuration
  ├── DocumentType
  ├── ChecklistItem
  └── ReferenceSource
```

## Enums

| Enum | Values |
| --- | --- |
| `UserRole` | `SUPPLIER_CONTACT`, `REVIEWER`, `ADMIN` |
| `SupplierStatus` | `DRAFT`, `SUBMITTED`, `IN_REVIEW`, `NEEDS_INFORMATION`, `APPROVED`, `ON_HOLD` |
| `DocumentStatus` | `ACTIVE`, `REPLACED` |
| `ChecklistStatus` | `PRESENT`, `MISSING`, `NEEDS_REVIEW`, `NOT_APPLICABLE` |
| `ReviewDecision` | `APPROVED`, `ON_HOLD`, `NEEDS_INFORMATION` |
| `DocumentRequestStatus` | `OPEN`, `RESOLVED` |

## Models

### User

Authentication identity and role assignment.

- Unique: `email`
- `isActive` (default `true`); inactive users cannot authenticate
- Indexes: `role`, `isActive`
- Relations: optional supplier-as-contact, uploads, checklist checks, review actions, document requests, audit logs

### Supplier

Company onboarding packet and contact details.

- Unique: `contactUserId`
- Indexes: `status`, `companyName`, `registrationNumber`, `contactEmail`
- Status advances through the onboarding lifecycle as suppliers submit and reviewers decide

### DocumentType

Configurable document catalogue.

- Unique: `code`
- Seeded codes: `BUSINESS_REGISTRATION`, `BANK_CONFIRMATION`, `INSURANCE_CERTIFICATE`
- Flags: `required`, `active`

### SupplierDocument

Uploaded file metadata for a supplier packet.

- Stores original filename, UUID storage name, path, MIME type, size
- Self-relation `supersededDocumentId` supports replacement history
- Status `ACTIVE` or `REPLACED`
- No AI extraction fields

### ChecklistItem

Admin-managed requirement definition.

- Optional foreign key to `DocumentType`
- `version`, `effectiveDate`, `isRequired`, `isActive`

Example requirements used in the product:

| Requirement | Document type code | Required |
| --- | --- | --- |
| Business registration certificate | `BUSINESS_REGISTRATION` | Yes |
| Bank confirmation letter | `BANK_CONFIRMATION` | Yes |
| Insurance certificate | `INSURANCE_CERTIFICATE` | Yes |

### ChecklistCheck

Manual reviewer outcome for one checklist item on one supplier.

- Unique: `(supplierId, checklistItemId)`

### ReviewAction

Packet-level reviewer decision and comment.

### DocumentRequest

Request for a missing or clearer document; typically moves supplier status to `NEEDS_INFORMATION`.

### ReferenceSource

Versioned guidance metadata for procurement teams.

- Unique: `(title, version)`

### AuditLog

Activity trail with optional actor, action name, entity coordinates, and JSON `metadata`.

## Migrations

Migrations live under `backend/prisma/migrations/`.

| Migration | Purpose |
| --- | --- |
| `20261121101555_init_supplier_onboarding` | Initial ten-model schema and enums |
| `20261121115153_add_user_is_active` | Adds `User.isActive` |

Apply with:

```bash
cd backend
npx prisma migrate deploy
```

Docker backend entrypoint runs the same command before the API starts.

## Seed behaviour

`npm run prisma:seed` (when enabled) loads:

1. Three document types
2. Synthetic checklist items linked to those types
3. One reference source
4. Configurable test users from `SEED_*` environment variables
5. One synthetic supplier linked to the supplier-contact user
6. An audit log entry for seed completion

Production seeding is blocked unless `ALLOW_PRODUCTION_SEED=true`.

## Commands

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed          # optional
npm run prisma:validate      # relationship smoke validation after seed
npm run prisma:validate:schema
```

## Explicit non-goals (Phase 2)

- Embedding tables or Qdrant collection IDs
- OCR transcript columns
- LLM verdict / confidence fields
- External registry response caches
