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

Registration creates a draft `Supplier` linked to the new contact user. Public clients cannot self-assign `REVIEWER` or `ADMIN`.

### Supplier access

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/api/suppliers/me` | `SUPPLIER_CONTACT` own profile |
| `GET` | `/api/suppliers/:id` | Owner, `REVIEWER`, or `ADMIN` |

### Admin provisioning

| Method | Path | Access |
| --- | --- | --- |
| `POST` | `/api/admin/users` | `ADMIN` creates `REVIEWER` or `ADMIN` |
| `GET` | `/api/admin/users` | `ADMIN` |
| `GET` | `/api/admin/audit-logs` | `ADMIN` |

## Planned

- Document upload and listing
- Checklist check updates
- Review decision endpoints
- Document request workflows

Do not introduce mocked supplier payloads in place of these endpoints.
