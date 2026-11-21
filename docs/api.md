# API Notes

## Implemented

### `GET /`

Returns basic service identity.

### `GET /api/health`

Returns API health status.

Example response shape:

```json
{
  "success": true,
  "data": {
    "service": "docverify-ai-backend",
    "status": "ok",
    "timestamp": "2026-11-21T00:00:00.000Z"
  }
}
```

## Planned (not implemented in foundation)

- Authentication (`/api/auth/*`)
- Supplier profile CRUD
- Document upload and listing
- Reviewer decision endpoints
- Admin user management

Do not introduce mocked supplier payloads in place of these endpoints.
