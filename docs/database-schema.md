# Database Schema

PostgreSQL schema for DocVerify AI Supplier Onboarding, managed with Prisma.

This model is organised around **companies and supplier onboarding packets**, not student applications.

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
- Indexes: `role`
- Relations: optional `Supplier` as contact, uploaded documents, checklist checks, review actions, document requests, audit logs

### Supplier

Company onboarding packet and contact details.

- Unique: `contactUserId`
- Indexes: `status`, `companyName`, `registrationNumber`, `contactEmail`
- Relations: contact `User`, documents, checklist checks, review actions, document requests

### DocumentType

Configurable required document catalogue.

- Unique: `code`
- Seeded codes: `BUSINESS_REGISTRATION`, `BANK_CONFIRMATION`, `INSURANCE_CERTIFICATE`

### SupplierDocument

Uploaded file metadata for a supplier packet.

- Self-relation: `supersededDocumentId` supports document replacement history
- Status values track whether a file is currently `ACTIVE` or `REPLACED`
- No AI extraction fields in this phase

### ChecklistItem

Admin-managed onboarding requirement definitions.

- Optional link to `DocumentType`
- Versioned with `version` and `effectiveDate`

### ChecklistCheck

Manual reviewer outcome for one checklist item on one supplier.

- Unique: `(supplierId, checklistItemId)`

### ReviewAction

Packet-level reviewer decisions and comments.

### DocumentRequest

Requests for missing or updated documents.

### ReferenceSource

Checklist guidance and versioned reference material.

- Unique: `(title, version)`

### AuditLog

System activity trail.

- Indexes: `actorId`, `(entityType, entityId)`, `action`, `createdAt`
- `metadata` stored as JSON

## Seed behaviour

`npm run prisma:seed` loads:

1. Three document types
2. Synthetic checklist items linked to those types
3. One reference source
4. Configurable test users from environment variables
5. One synthetic supplier linked to the supplier-contact user
6. An audit log entry for seed completion

Seed accounts are configured through `SEED_*` environment variables. Production seeding is blocked unless `ALLOW_PRODUCTION_SEED=true`.

## Commands

```bash
cd backend
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run prisma:validate
```
