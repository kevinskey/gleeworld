#!/usr/bin/env bash
# Build the SPA and push it to the gleeworld droplet.
#
# Two things this script does that a bare `rsync -az dist/ ...` did not:
#   1. `chmod -R a+rX` on the served dir. rsync -a preserves the source
#      permissions, and Kevin's local dist/ is written mode 600 for
#      sw.js — nginx then serves 403 for that file, service workers
#      never learn there is an update, and clients keep loading a
#      stale bundle even after a rsync. Fix perms every deploy.
#   2. Verifies the CACHE_VERSION on the live site matches the local
#      build so we notice broken pushes immediately.
#
# Usage: from repo root:  bash scripts/deploy-frontend.sh
#   Skip the build step:  bash scripts/deploy-frontend.sh --skip-build
set -euo pipefail

DROPLET="root@198.211.113.144"
REMOTE_DIR="/var/www/gleeworld/html"
SITE="https://gleeworld.org"

# 1. Build (unless caller says otherwise)
if [ "${1:-}" != "--skip-build" ]; then
  echo "==> Building"
  npm run build
fi

if [ ! -f dist/index.html ] || [ ! -f dist/sw.js ]; then
  echo "!! dist/index.html or dist/sw.js missing — did the build fail?"
  exit 1
fi

LOCAL_HASH=$(grep -oE 'index-[A-Za-z0-9_-]+\.js' dist/index.html | head -1)
LOCAL_CACHE=$(grep -oE "CACHE_VERSION = '[^']+'" dist/sw.js | head -1)
echo "==> Local build: $LOCAL_HASH · $LOCAL_CACHE"

# 2. Sync — no --delete: /var/www/gleeworld/html/tenants/ has per-tenant
#    bootstrap files that are not in dist/ and MUST survive.
#    --chmod forces perms at transfer time (Files 644, Dirs 755) so
#    every file lands nginx-readable even when the local mode was
#    tighter. This is the root-cause fix for the "sw.js is 403" and
#    "logo PNG is 403" bugs that a post-rsync chmod could only paper
#    over.
echo "==> Rsync to $DROPLET:$REMOTE_DIR"
rsync -az --chmod=F644,D755 dist/ "$DROPLET:$REMOTE_DIR/"

# 3. Belt-and-suspenders chmod. Cheap, and covers any file rsync
#    couldn't rewrite (e.g. changing mtime on an existing 600 file
#    without --chmod would leave it at 600 on some rsync builds).
echo "==> Fixing perms on $REMOTE_DIR"
ssh "$DROPLET" "find $REMOTE_DIR -type f -exec chmod a+r {} + && find $REMOTE_DIR -type d -exec chmod a+rx {} +"

# 4. Verify what the live site is actually serving.
echo "==> Verifying"
LIVE_HASH=$(curl -fsS "$SITE/?nocache=$(date +%s)" | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1)
LIVE_CACHE=$(curl -fsS "$SITE/sw.js?nocache=$(date +%s)" | grep -oE "CACHE_VERSION = '[^']+'" | head -1)
echo "==> Live: $LIVE_HASH · $LIVE_CACHE"

if [ "$LOCAL_HASH" != "$LIVE_HASH" ] || [ "$LOCAL_CACHE" != "$LIVE_CACHE" ]; then
  echo "!! Mismatch — the deploy landed but the live site is serving a different bundle."
  echo "   local:  $LOCAL_HASH · $LOCAL_CACHE"
  echo "   live:   $LIVE_HASH · $LIVE_CACHE"
  echo "   Check the CDN / any caching layer in front of nginx."
  exit 1
fi

echo "==> Done. Hard-refresh $SITE in the browser to pick up the new bundle."
