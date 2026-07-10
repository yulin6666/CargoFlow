#!/bin/sh
set -e

echo "Running database migrations..."
cd /app/packages/database && npx prisma migrate deploy

echo "Starting backend server..."
cd /app/apps/backend && node dist/main
