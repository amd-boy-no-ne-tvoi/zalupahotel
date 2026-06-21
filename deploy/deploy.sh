#!/bin/bash
set -e

APP_DIR="/var/www/pet-hotel"
FRONTEND_DIST="$APP_DIR/apps/frontend/dist"
WEB_ROOT="/var/www/pet-hotel/frontend"

echo "=== Pet Hotel Deploy ==="

cd $APP_DIR

echo "→ Pull latest code..."
git pull origin main

echo "→ Install dependencies..."
pnpm install --frozen-lockfile

echo "→ Generate Prisma client..."
cd apps/backend && pnpm db:generate

echo "→ Run DB migrations..."
pnpm prisma migrate deploy

echo "→ Build backend..."
pnpm build
cd $APP_DIR

echo "→ Build frontend..."
cd apps/frontend && pnpm build
cd $APP_DIR

echo "→ Copy frontend to web root..."
mkdir -p $WEB_ROOT
cp -r $FRONTEND_DIST/* $WEB_ROOT/

echo "→ Restart API via PM2..."
pm2 reload deploy/ecosystem.config.cjs --env production || pm2 start deploy/ecosystem.config.cjs --env production

echo "→ Save PM2 process list..."
pm2 save

echo "✓ Deploy complete!"
