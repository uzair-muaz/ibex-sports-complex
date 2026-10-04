#!/usr/bin/env bash
# Deploy IBEX Sports Complex on a Linux VPS (nginx + PM2 + Next.js).
#
# Run ON the staging server, from the repo root (or any clone path):
#   chmod +x scripts/deploy-staging.sh
#   ./scripts/deploy-staging.sh
#
# Optional env overrides:
#   DOMAIN=staging.ibexsportscomplex.com
#   PORT=3000
#   PM2_APP_NAME=ibex-sports-complex
#   SETUP_NGINX=1          # write/enable nginx site (needs sudo)
#   SETUP_SSL=1            # run certbot after nginx (needs sudo + DNS)
#   SKIP_INSTALL=1         # skip npm ci
#   SKIP_BUILD=1           # skip npm run build
#
# Prerequisites on the server:
#   - Node.js 20+ and npm
#   - pm2 (npm i -g pm2)
#   - nginx (apt install nginx)
#   - .env.local (or .env) present in the repo with production values
#   - DNS A record for DOMAIN → this server

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DOMAIN="${DOMAIN:-staging.ibexsportscomplex.com}"
PORT="${PORT:-3000}"
PM2_APP_NAME="${PM2_APP_NAME:-ibex-sports-complex}"
SETUP_NGINX="${SETUP_NGINX:-1}"
SETUP_SSL="${SETUP_SSL:-0}"
SKIP_INSTALL="${SKIP_INSTALL:-0}"
SKIP_BUILD="${SKIP_BUILD:-0}"

NGINX_SRC="$ROOT/deploy/nginx/staging.conf"
NGINX_AVAILABLE="/etc/nginx/sites-available/${DOMAIN}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"
ECOSYSTEM="$ROOT/deploy/ecosystem.config.cjs"

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"
}

log "Deploying $PM2_APP_NAME → $DOMAIN (port $PORT)"
log "Repo: $ROOT"

need_cmd node
need_cmd npm
need_cmd pm2

if [[ ! -f "$ROOT/.env.local" && ! -f "$ROOT/.env" ]]; then
  die "No .env.local or .env found. Copy env onto the server before deploying."
fi

# --- deps ---
if [[ "$SKIP_INSTALL" != "1" ]]; then
  log "Installing dependencies"
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
else
  log "Skipping npm install (SKIP_INSTALL=1)"
fi

# --- build ---
if [[ "$SKIP_BUILD" != "1" ]]; then
  log "Building Next.js"
  export NODE_ENV=production
  npm run build
else
  log "Skipping build (SKIP_BUILD=1)"
fi

# --- PM2 ---
log "Starting / reloading PM2"
export PORT
export PM2_APP_NAME
if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  pm2 reload "$ECOSYSTEM" --update-env
else
  pm2 start "$ECOSYSTEM"
fi
pm2 save
# Ensure PM2 survives reboot (idempotent; may prompt for sudo once)
pm2 startup systemd -u "$(whoami)" --hp "$HOME" >/dev/null 2>&1 || true

log "PM2 status"
pm2 status "$PM2_APP_NAME" || pm2 list

log "Health check (local Next.js on :$PORT)"
READY=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "http://127.0.0.1:${PORT}/api/auth/session" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done
if [[ "$READY" != "1" ]]; then
  echo "WARNING: App not responding on 127.0.0.1:${PORT}" >&2
  echo "  Run: pm2 logs ${PM2_APP_NAME} --lines 80" >&2
  echo "  Cloudflare 502 usually means PM2/Next is down or nginx points at the wrong port." >&2
else
  log "App is healthy on 127.0.0.1:${PORT}"
fi

# --- nginx ---
if [[ "$SETUP_NGINX" == "1" ]]; then
  need_cmd nginx
  [[ -f "$NGINX_SRC" ]] || die "Missing nginx template: $NGINX_SRC"

  log "Installing nginx site for $DOMAIN (sudo)"
  # Rewrite upstream port if PORT != 3000
  TMP_CONF="$(mktemp)"
  sed "s/127\\.0\\.0\\.1:3000/127.0.0.1:${PORT}/g; s/staging\\.ibexsportscomplex\\.com/${DOMAIN}/g" \
    "$NGINX_SRC" > "$TMP_CONF"

  sudo cp "$TMP_CONF" "$NGINX_AVAILABLE"
  rm -f "$TMP_CONF"

  if [[ ! -e "$NGINX_ENABLED" ]]; then
    sudo ln -s "$NGINX_AVAILABLE" "$NGINX_ENABLED"
  fi

  # Avoid default site stealing requests on :80
  if [[ -L /etc/nginx/sites-enabled/default ]]; then
    sudo rm -f /etc/nginx/sites-enabled/default
  fi

  sudo nginx -t
  sudo systemctl reload nginx
  log "Nginx reloaded"
else
  log "Skipping nginx setup (SETUP_NGINX=0)"
fi

# --- SSL (optional) ---
if [[ "$SETUP_SSL" == "1" ]]; then
  need_cmd certbot
  log "Requesting Let's Encrypt cert for $DOMAIN"
  sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
    ${CERTBOT_EMAIL:+--email "$CERTBOT_EMAIL"} \
    --redirect || die "Certbot failed. Ensure DNS for $DOMAIN points here, then retry SETUP_SSL=1"
  log "SSL configured"
fi

log "Done"
echo "  App:    http://127.0.0.1:${PORT}"
echo "  Public: https://${DOMAIN}"
echo "  Logs:   pm2 logs ${PM2_APP_NAME}"
echo ""
echo "Reminders:"
echo "  - NEXTAUTH_URL=https://${DOMAIN}"
echo "  - AUTH_URL=https://${DOMAIN}   (Auth.js v5 alias; recommended)"
echo "  - Google OAuth redirect: https://${DOMAIN}/api/auth/callback/google"
echo "  - Cloudflare SSL/TLS: Full (after origin HTTPS) or Flexible (HTTP origin only)"
echo "  - If 502: curl -I http://127.0.0.1:${PORT}/api/auth/session && pm2 logs ${PM2_APP_NAME}"
echo "  - First SSL: CERTBOT_EMAIL=you@example.com SETUP_SSL=1 ./scripts/deploy-staging.sh"
