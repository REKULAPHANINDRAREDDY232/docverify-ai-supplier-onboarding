# Local Setup

## Prerequisites

- Node.js 22+
- npm 10+
- Docker Desktop (for PostgreSQL and Qdrant)

## 1. Clone and install

```bash
cd frontend && npm install
cd ../backend && npm install
```

## 2. Environment files

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

Replace `JWT_SECRET` with a long random value before any authentication work.

## 3. Start infrastructure

```bash
docker compose up -d
```

PostgreSQL is published on host port `5434` by default to avoid conflicts with local Postgres installs. Use the `DATABASE_URL` from `.env.example`.

## 4. Run apps

```bash
# terminal 1
cd backend
npm run dev

# terminal 2
cd frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend health: http://localhost:4000/api/health

## 5. Database migrate and seed

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init_supplier_onboarding
npm run prisma:seed
npm run prisma:validate
```

Configure `SEED_*` values in `backend/.env` before seeding. Do not commit real credentials.

## 6. Quality checks

```bash
cd backend && npm run lint && npm test && npm run build
cd ../frontend && npm run lint && npm run build
```
