#!/usr/bin/env bash
# MongoDB Backup Script - Creates/updates backup files in mongodb-backup-full
# Requires: MongoDB tools (mongodump) installed and in PATH

set -e

MONGO_HOST="${MONGO_HOST:-localhost}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_DATABASE="${MONGO_DATABASE:-mrd_audit}"
MONGO_USER="${MONGO_ROOT_USERNAME:-admin}"
MONGO_PASSWORD="${MONGO_ROOT_PASSWORD:-}"
OUT_DIR="${OUT_DIR:-mongodb-backup-full}"

echo "========================================="
echo "MongoDB Backup (Update backup files)"
echo "========================================="
echo ""
echo "Backup Configuration:"
echo "  Host: $MONGO_HOST"
echo "  Port: $MONGO_PORT"
echo "  Database: $MONGO_DATABASE"
echo "  Output: $OUT_DIR/$MONGO_DATABASE"
echo ""

mkdir -p "$OUT_DIR"

if [ -n "$MONGO_PASSWORD" ]; then
  mongodump --host "$MONGO_HOST" --port "$MONGO_PORT" \
    --username "$MONGO_USER" --password "$MONGO_PASSWORD" --authenticationDatabase admin \
    --db "$MONGO_DATABASE" --out "$OUT_DIR"
else
  mongodump --host "$MONGO_HOST" --port "$MONGO_PORT" \
    --db "$MONGO_DATABASE" --out "$OUT_DIR"
fi

echo ""
echo "========================================="
echo "Backup completed successfully"
echo "========================================="
echo "  Location: $OUT_DIR/$MONGO_DATABASE"
echo ""
