#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"

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
    # trim optional surrounding quotes
    MONGODB_URI="${MONGODB_URI#\"}"
    MONGODB_URI="${MONGODB_URI%\"}"
    break
  fi
done < "$ENV_FILE"

if [[ -z "$MONGODB_URI" ]]; then
  echo "MONGODB_URI not found in .env.local" >&2
  exit 1
fi

if [[ "${1:-}" ]]; then
  OUT="$ROOT/backup/$1"
else
  OUT="$ROOT/backup/$(date +%d-%m-%Y)"
fi

mkdir -p "$OUT"
echo "Dumping to $OUT ..."
mongodump --uri="$MONGODB_URI" --out="$OUT"
echo "Done."
