#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"

usage() {
  echo "Usage: npm run db:restore -- <backup-folder> [--yes]" >&2
  echo "  Example: npm run db:restore -- 18-06-2026" >&2
  echo "  backup/ folder names match db:dump output (e.g. backup/18-06-2026/)" >&2
  exit 1
}

[[ "${1:-}" ]] || usage

BACKUP_NAME="$1"
AUTO_YES=false
if [[ "${2:-}" == "--yes" ]]; then
  AUTO_YES=true
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env.local at $ENV_FILE" >&2
  exit 1
fi

MONGODB_URI=""
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line// }" ]] && continue
  if [[ "$line" =~ ^MONGODB_URI= ]]; then
    MONGODB_URI="${line#MONGODB_URI=}"
    MONGODB_URI="${MONGODB_URI#\"}"
    MONGODB_URI="${MONGODB_URI%\"}"
    MONGODB_URI="${MONGODB_URI#\'}"
    MONGODB_URI="${MONGODB_URI%\'}"
    break
  fi
done < "$ENV_FILE"

if [[ -z "$MONGODB_URI" ]]; then
  echo "MONGODB_URI not found in .env.local" >&2
  exit 1
fi

DUMP_ROOT="$ROOT/backup/$BACKUP_NAME"
if [[ ! -d "$DUMP_ROOT" ]]; then
  echo "Backup folder not found: $DUMP_ROOT" >&2
  exit 1
fi

# mongodump creates backup/<date>/<db-name>/*.bson
DB_DIRS=()
while IFS= read -r d; do
  DB_DIRS+=("$d")
done < <(find "$DUMP_ROOT" -mindepth 1 -maxdepth 1 -type d)

if [[ "${#DB_DIRS[@]}" -eq 0 ]]; then
  echo "No database folder inside $DUMP_ROOT" >&2
  exit 1
fi
if [[ "${#DB_DIRS[@]}" -gt 1 ]]; then
  echo "Multiple database folders found; restore the dump root manually:" >&2
  printf '  %s\n' "${DB_DIRS[@]}" >&2
  exit 1
fi

SOURCE_DB="$(basename "${DB_DIRS[0]}")"

# Database name from URI path (mongodb[+srv]://host/<db>?...)
TARGET_DB="$(node -e "
  const uri = process.argv[1];
  const normalized = uri.replace(/^mongodb\\+srv:/, 'mongodb:');
  const path = new URL(normalized).pathname.replace(/^\\//, '').split('?')[0];
  console.log(path || '');
" "$MONGODB_URI")"

if [[ -z "$TARGET_DB" ]]; then
  echo "Could not parse database name from MONGODB_URI path." >&2
  echo "Add the dev database name to the URI, e.g. ...mongodb.net/your-dev-db" >&2
  exit 1
fi

if ! command -v mongorestore &>/dev/null; then
  echo "mongorestore not found. Install MongoDB Database Tools:" >&2
  echo "  https://www.mongodb.com/docs/database-tools/installation/" >&2
  exit 1
fi

echo "Restore plan:"
echo "  Backup:  backup/$BACKUP_NAME"
echo "  Source:  $SOURCE_DB (from dump)"
echo "  Target:  $TARGET_DB (from MONGODB_URI in .env.local)"
echo ""
echo "  WARNING: --drop will remove existing collections in the target DB first."
echo ""

if [[ "$AUTO_YES" != true ]]; then
  read -r -p "Continue? [y/N] " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

RESTORE_PATH="${DB_DIRS[0]}"
RESTORE_ARGS=(--uri="$MONGODB_URI" --drop)
if [[ "$SOURCE_DB" != "$TARGET_DB" ]]; then
  echo "Mapping namespaces: $SOURCE_DB.* -> $TARGET_DB.*"
  RESTORE_ARGS+=(--nsFrom="${SOURCE_DB}.*" --nsTo="${TARGET_DB}.*")
  RESTORE_PATH="$DUMP_ROOT"
fi

echo "Restoring from $RESTORE_PATH ..."
mongorestore "${RESTORE_ARGS[@]}" "$RESTORE_PATH"
echo "Done. Dev DB '$TARGET_DB' restored from backup/$BACKUP_NAME."
