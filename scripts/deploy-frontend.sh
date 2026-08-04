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
#   3. Refuses to publish a tree that is behind origin/main (see below).
#
# Usage: from repo root:  bash scripts/deploy-frontend.sh
#   Skip the build step:  bash scripts/deploy-frontend.sh --skip-build
#   Publish anyway:       bash scripts/deploy-frontend.sh --allow-behind
set -euo pipefail

DROPLET="root@198.211.113.144"
REMOTE_DIR="/var/www/gleeworld/html"
SITE="https://gleeworld.org"

SKIP_BUILD=0
ALLOW_BEHIND=0
for arg in "$@"; do
  case "$arg" in
    --skip-build)   SKIP_BUILD=1 ;;
    --allow-behind) ALLOW_BEHIND=1 ;;
    *) echo "!! Unknown option: $arg"; exit 1 ;;
  esac
done

# 0. Staleness guard.
#
# One build serves every tenant, so publishing a feature branch that forked
# before other work landed silently REMOVES that work from the live site —
# and every check below still reports success, because the bundle it verifies
# is exactly the (stale) one we just pushed. That happened on 2026-08-04: a
# branch that predated the Audition block went out, and the block vanished
# from the builder for every tenant while the deploy reported "Done".
#
# So: origin/main must be an ancestor of HEAD. Merge it, or pass
# --allow-behind if you genuinely mean to publish something older (rollback).
if [ "$ALLOW_BEHIND" -eq 0 ] && git rev-parse --git-dir >/dev/null 2>&1; then
  echo "==> Checking this tree against origin/main"
  git fetch -q origin main 2>/dev/null || echo "   (fetch failed — using the last-known origin/main)"
  if git rev-parse --verify -q origin/main >/dev/null; then
    if ! git merge-base --is-ancestor origin/main HEAD; then
      echo "!! This tree is missing $(git rev-list --count HEAD..origin/main) commit(s) from origin/main."
      echo "   Publishing it would take that work off the live site."
      echo "   Fix:      git merge origin/main"
      echo "   Override: bash scripts/deploy-frontend.sh --allow-behind"
      exit 1
    fi
  else
    echo "   (no origin/main ref — skipping)"
  fi
fi

# Not fatal, and deliberately outside the guard above so it still prints under
# --allow-behind: the build reads the working tree, so uncommitted edits ship
# and this deploy records them nowhere.
if git rev-parse --git-dir >/dev/null 2>&1 \
   && [ -n "$(git status --porcelain -- src public index.html 2>/dev/null)" ]; then
  echo "==> note: uncommitted changes in src/ will be included in this build"
fi

# 1. Build (unless caller says otherwise)
if [ "$SKIP_BUILD" -eq 0 ]; then
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
#    Note: --chmod=F644,D755 was tried but macOS BSD rsync rejects it
#    ("invalid argument"). We do the perms fix on the droplet after
#    rsync instead — see step 3.
echo "==> Rsync to $DROPLET:$REMOTE_DIR"
rsync -az dist/ "$DROPLET:$REMOTE_DIR/"

# 3. Force perms on the droplet — every file readable by all, every
#    dir readable+traversable by all. Splits into two find loops so
#    we do not repeat the `chmod -R a+rX` bug where 51 files stayed
#    600 because +X is conditional.
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
