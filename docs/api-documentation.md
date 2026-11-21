# API Documentation

Base URL (local Docker): `http://localhost:4000`

Unless noted, successful responses use:

```json
{ "success": true, "data": { ... } }
```

Errors use:

```json
{ "success": false, "error": { "message": "..." } }
```

Authentication for protected routes is the HttpOnly cookie `docverify_access_token` set by login/register. Clients must send `credentials: 'include'`. JWTs are not stored in `localStorage`.

## Health and service identity

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/` | Public | Service name/version |
| `GET` | `/api/health` | Public | Liveness JSON |

## Authentication (`/api/auth`)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Creates `SUPPLIER_CONTACT` + draft supplier; ignores attempted role escalation |
| `POST` | `/api/auth/login` | Public | Validates password; rejects inactive accounts |
| `POST` | `/api/auth/logout` | Public | Clears auth cookie |
| `GET` | `/api/auth/me` | Authenticated | Current user profile (never includes `passwordHash`) |

## Document types (`/api/document-types`)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/document-types` | Authenticated | Active catalogue for upload/review UIs |

Admin mutations of document types use `/api/admin/document-types`.

## Supplier portal (`/api/suppliers`, `/api/documents`)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/suppliers` | `SUPPLIER_CONTACT` | Create own profile if missing |
| `GET` | `/api/suppliers` | Contact: own only; staff: all | List suppliers |
| `GET` | `/api/suppliers/:id` | Owner / `REVIEWER` / `ADMIN` | Packet detail |
| `PATCH` | `/api/suppliers/:id` | Owner | Update profile fields |
| `POST` | `/api/suppliers/:id/submit` | Owner | Move `DRAFT` → `SUBMITTED` when required ACTIVE docs exist |
| `GET` | `/api/suppliers/:id/requests` | Owner / staff | Document requests |
| `POST` | `/api/suppliers/:id/documents` | Owner | Multipart upload/replace |
| `GET` | `/api/suppliers/:id/documents` | Owner / staff | List documents |
| `GET` | `/api/documents/:id/download` | Owner / staff | Authenticated file download |

### Upload constraints

- Content types: `application/pdf`, `image/jpeg`, `image/png`
- Max size: `MAX_UPLOAD_BYTES` (default 10 MB)
- Declared MIME must match file signature
- Replacement sets prior document to `REPLACED` and links `supersededDocumentId`

## Reviewer (`/api/reviewer`)

Access: `REVIEWER` or `ADMIN`. Supplier contacts receive `403`.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/reviewer/dashboard` | Status counts + recent packets |
| `GET` | `/api/reviewer/suppliers` | Search `q`, filter `status` |
| `GET` | `/api/reviewer/suppliers/:id` | Packet, documents, checklist, history, audits |
| `PUT` | `/api/reviewer/suppliers/:id/checklist/:itemId` | Manual checklist result |
| `POST` | `/api/reviewer/suppliers/:id/decisions` | `APPROVED` / `ON_HOLD` / `NEEDS_INFORMATION` |
| `POST` | `/api/reviewer/suppliers/:id/document-requests` | Request document; status → `NEEDS_INFORMATION` |
| `PATCH` | `/api/reviewer/suppliers/:id/corrections` | Manual field correction with audit previous/next |
| `GET` | `/api/reviewer/checklist-items` | Active checklist catalogue |

**Manual review only.** These endpoints do not run OCR, LLM verification, or confidence scoring.

## Admin (`/api/admin`)

Access: `ADMIN` only.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/admin/dashboard` | Live supplier/user/catalogue counts from PostgreSQL |
| `GET` | `/api/admin/users` | Search/filter users |
| `POST` | `/api/admin/users` | Create user with role |
| `PATCH` | `/api/admin/users/:id` | Update name, role, `isActive` |
| `GET` | `/api/admin/suppliers` | Search/filter suppliers |
| `GET`/`POST`/`PATCH` | `/api/admin/document-types` | Catalogue CRUD |
| `GET`/`POST`/`PATCH` | `/api/admin/checklists` | Checklist items with versions/effective dates |
| `GET`/`POST`/`PATCH` | `/api/admin/reference-sources` | Reference metadata |
| `GET` | `/api/admin/audit-logs` | Audit search |

Admin responses never include password hashes.

## Status codes commonly returned

| Code | Meaning |
| --- | --- |
| `200` / `201` | Success |
| `400` | Validation or business-rule failure (e.g. incomplete submit, oversized file) |
| `401` | Missing/invalid session or inactive account |
| `403` | Authenticated but forbidden for role/ownership |
| `404` | Missing entity |
| `409` | Conflict (duplicate email, existing supplier profile, duplicate codes) |

## Out of scope endpoints

Phase 2 does not expose:

- OCR/job status APIs
- Extraction result APIs
- LLM verification APIs
- RAG query APIs
- Qdrant management APIs
