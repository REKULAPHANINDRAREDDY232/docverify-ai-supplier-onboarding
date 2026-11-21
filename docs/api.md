# API Notes

## Implemented

### `GET /`

Returns basic service identity.

### `GET /api/health`

Returns API health status.

### Authentication

Auth uses bcrypt password hashes and JWT access tokens stored in an **HttpOnly** cookie (`docverify_access_token`). Tokens are never returned for localStorage storage.

| Method | Path | Access |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Public. Always creates `SUPPLIER_CONTACT`. |
| `POST` | `/api/auth/login` | Public |
| `POST` | `/api/auth/logout` | Clears auth cookie |
| `GET` | `/api/auth/me` | Authenticated |

### Document types

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/api/document-types` | Authenticated |

### Supplier portal

| Method | Path | Access |
| --- | --- | --- |
| `POST` | `/api/suppliers` | `SUPPLIER_CONTACT` create own profile |
| `GET` | `/api/suppliers` | Own supplier for contacts; all for staff |
| `GET` | `/api/suppliers/:id` | Owner, `REVIEWER`, or `ADMIN` |
| `PATCH` | `/api/suppliers/:id` | Owner only |
| `POST` | `/api/suppliers/:id/submit` | Owner only; requires all required ACTIVE docs |
| `GET` | `/api/suppliers/:id/requests` | Owner or staff |
| `POST` | `/api/suppliers/:id/documents` | Owner upload/replace (`multipart/form-data`) |
| `GET` | `/api/suppliers/:id/documents` | Owner or staff |
| `GET` | `/api/documents/:id/download` | Owner or staff; authenticated download |

Upload rules:

- PDF / JPG / PNG only
- Max 10 MB
- MIME + file-signature validation
- UUID storage filenames under `UPLOAD_DIR`
- Replacement marks previous ACTIVE document as `REPLACED` and links via `supersededDocumentId`

### Reviewer dashboard

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/api/reviewer/dashboard` | `REVIEWER` / `ADMIN` |
| `GET` | `/api/reviewer/suppliers` | Search `q`, filter `status` |
| `GET` | `/api/reviewer/suppliers/:id` | Packet detail + checklist + history |
| `PUT` | `/api/reviewer/suppliers/:id/checklist/:itemId` | Record checklist result |
| `POST` | `/api/reviewer/suppliers/:id/decisions` | `APPROVED` / `ON_HOLD` / `NEEDS_INFORMATION` |
| `POST` | `/api/reviewer/suppliers/:id/document-requests` | Creates request + sets `NEEDS_INFORMATION` |
| `PATCH` | `/api/reviewer/suppliers/:id/corrections` | Manual field correction with audit previous/next |
| `GET` | `/api/reviewer/checklist-items` | Active checklist catalogue |

No OCR, AI classification, authenticity checks, or confidence scores are implemented.

### Admin workspace

All `/api/admin/*` routes require an authenticated `ADMIN` user. Inactive accounts cannot authenticate. Password hashes are never returned.

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/api/admin/dashboard` | Supplier totals and status counts, user totals, catalogue counts |
| `GET` | `/api/admin/users` | Search `q`, filter `role` / `isActive` |
| `POST` | `/api/admin/users` | Create `SUPPLIER_CONTACT`, `REVIEWER`, or `ADMIN` |
| `PATCH` | `/api/admin/users/:id` | Update name, role, or `isActive` |
| `GET` | `/api/admin/suppliers` | Search `q`, filter `status` |
| `GET` | `/api/admin/document-types` | Full document type catalogue |
| `POST` | `/api/admin/document-types` | Create document type |
| `PATCH` | `/api/admin/document-types/:id` | Update document type |
| `GET` | `/api/admin/checklists` | Checklist items with linked document types |
| `POST` | `/api/admin/checklists` | Create checklist item (version + effective date) |
| `PATCH` | `/api/admin/checklists/:id` | Update / deactivate checklist item |
| `GET` | `/api/admin/reference-sources` | Reference source metadata |
| `POST` | `/api/admin/reference-sources` | Create reference source |
| `PATCH` | `/api/admin/reference-sources/:id` | Update reference source |
| `GET` | `/api/admin/audit-logs` | Important audit records (`q`, `action`, `entityType`) |

Do not introduce mocked supplier payloads in place of these endpoints.
