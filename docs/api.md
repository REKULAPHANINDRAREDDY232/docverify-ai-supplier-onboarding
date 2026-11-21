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

### Admin provisioning

| Method | Path | Access |
| --- | --- | --- |
| `POST` | `/api/admin/users` | `ADMIN` creates `REVIEWER` or `ADMIN` |
| `GET` | `/api/admin/users` | `ADMIN` |
| `GET` | `/api/admin/audit-logs` | `ADMIN` |

## Planned

- Checklist check updates
- Review decision endpoints
- Document request creation by reviewers

Do not introduce mocked supplier payloads in place of these endpoints.
