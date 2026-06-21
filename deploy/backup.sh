#!/bin/bash
# PostgreSQL backup script for Pet Hotel
# Usage: bash backup.sh
# Cron: 0 3 * * * /var/www/pet-hotel/deploy/backup.sh >> /var/log/pet-hotel/backup.log 2>&1

set -euo pipefail

BACKUP_DIR="/var/backups/pet-hotel"
DB_NAME="pet_hotel"
DB_USER="pet_hotel_user"
KEEP_DAYS=30
DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILE="$BACKUP_DIR/db_$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup..."

pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$FILE"

SIZE=$(du -sh "$FILE" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Saved: $FILE ($SIZE)"

# Remove backups older than KEEP_DAYS
DELETED=$(find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +"$KEEP_DAYS" -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Removed $DELETED old backup(s)"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Done."
