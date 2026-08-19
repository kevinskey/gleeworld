#!/usr/bin/env bash
# One-shot web deploy for PR #175 (Academy AI course form).
# Uploads the locally-built dist/ to the GleeWorld web root WITHOUT --delete
# (per the tenants/ safety rule), then verifies the tenant bootstrap files survived.
set -euo pipefail

REPO="/Users/kevinjohnson/Documents/GitHub/gleeworld"
DROPLET="root@198.211.113.144"
WEBROOT="/var/www/gleeworld/html/"

cd "$REPO"

if [ ! -f dist/index.html ]; then
  echo "✖ dist/ not built — run 'npx vite build' first." >&2
  exit 1
fi

echo "=== uploading web build (no --delete) ==="
rsync -az --progress dist/ "$DROPLET:$WEBROOT"

echo "=== tenant check ==="
ssh "$DROPLET" "ls $WEBROOT""tenants/ && echo TENANTS_INTACT"

echo "=== DONE ==="
