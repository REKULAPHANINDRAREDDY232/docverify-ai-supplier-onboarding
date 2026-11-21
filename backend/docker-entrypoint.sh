#!/bin/sh
set -eu

echo "Waiting for PostgreSQL and applying Prisma migrations..."

attempt=1
max_attempts=30

until npx prisma migrate deploy; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Prisma migrate deploy failed after ${max_attempts} attempts."
    exit 1
  fi

  echo "Migration attempt ${attempt}/${max_attempts} failed; retrying in 2s..."
  attempt=$((attempt + 1))
  sleep 2
done

echo "Migrations applied. Starting DocVerify AI API..."
exec node dist/index.js
