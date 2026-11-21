# Local Setup

For full Phase 2 instructions, use:

- Root [`README.md`](../README.md)
- [`docker-setup.md`](./docker-setup.md)
- [`testing.md`](./testing.md)
- [`ci.md`](./ci.md)

## Quick paths

### Docker (recommended)

```bash
cp .env.example .env
# replace secrets
docker compose up --build
```

- UI: http://localhost:3000  
- API health: http://localhost:4000/api/health  

### Host apps + Compose infrastructure

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

docker compose up -d postgres qdrant

cd backend && npm ci && npx prisma migrate deploy && npm run dev
cd ../frontend && npm ci && npm run dev
```

- UI: http://localhost:5173  
- API: http://localhost:4000  

Never commit real `.env` files. Phase 2 does not include OCR/LLM/RAG features.
