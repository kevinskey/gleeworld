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
#   4. Refuses to publish commits that are not IN origin/main (see below).
#
# Usage: from repo root:  bash scripts/deploy-frontend.sh
#   Skip the build step:  bash scripts/deploy-frontend.sh --skip-build
#   Publish older code:   bash scripts/deploy-frontend.sh --allow-behind
#   Publish unmerged:     bash scripts/deploy-frontend.sh --allow-ahead
set -euo pipefail

DROPLET="root@198.211.113.144"
REMOTE_DIR="/var/www/gleeworld/html"
SITE="https://gleeworld.org"

SKIP_BUILD=0
ALLOW_BEHIND=0
ALLOW_AHEAD=0
for arg in "$@"; do
  case "$arg" in
    --skip-build)   SKIP_BUILD=1 ;;
    --allow-behind) ALLOW_BEHIND=1 ;;
    --allow-ahead)  ALLOW_AHEAD=1 ;;
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
if git rev-parse --git-dir >/dev/null 2>&1; then
  echo "==> Checking this tree against origin/main"
  git fetch -q origin main 2>/dev/null || echo "   (fetch failed — using the last-known origin/main)"
  if git rev-parse --verify -q origin/main >/dev/null; then
    if [ "$ALLOW_BEHIND" -eq 0 ] && ! git merge-base --is-ancestor origin/main HEAD; then
      echo "!! This tree is missing $(git rev-list --count HEAD..origin/main) commit(s) from origin/main."
      echo "   Publishing it would take that work off the live site."
      echo "   Fix:      git merge origin/main"
      echo "   Override: bash scripts/deploy-frontend.sh --allow-behind"
      exit 1
    fi

    # 0b. Unmerged-work guard — the other half of the same problem.
    #
    # The check above only catches a tree that is BEHIND. It cannot catch a
    # tree that is AHEAD, and being ahead is how the live site drifts out of
    # the history entirely: publish an unmerged branch and the deploy passes,
    # because at that moment the branch really does contain all of main. The
    # divergence arrives LATER, when a sibling branch merges to main and goes
    # out — now each deploy silently removes the other's work, and the guard
    # above waves both through.
    #
    # That is 2026-08-20: four branches deployed over each other in an
    # afternoon. The live bundle reported CACHE_VERSION bf88984fe — a commit
    # on merge/main-2026-08-19 that was never merged — so Giving (#789, in
    # main) was absent from the live site while main had it, and the branch's
    # own last commit was absent too. Nothing in the deploy path complained.
    #
    # So: HEAD must be IN origin/main. Merge the PR first, then deploy from
    # main. --allow-ahead exists for the genuine exception (testing a build
    # on the box before the PR lands), and it is a decision you make out loud
    # rather than the default.
    if [ "$ALLOW_AHEAD" -eq 0 ]; then
      AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)
      if [ "$AHEAD" -gt 0 ]; then
        echo "!! This tree has $AHEAD commit(s) that are NOT in origin/main:"
        git log --oneline --no-decorate -5 origin/main..HEAD | sed 's/^/     /'
        # An `if`, not `[ … ] && echo`: under `set -e` a bare AND-list whose
        # test fails takes the whole script's exit status with it, and the
        # help below would never print.
        if [ "$AHEAD" -gt 5 ]; then echo "     … and $((AHEAD - 5)) more"; fi
        echo "   Publishing unmerged work is how the live site stops matching main."
        echo "   Fix:      open a PR, merge it, then deploy from main"
        echo "   Override: bash scripts/deploy-frontend.sh --allow-ahead"
        exit 1
      fi
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

# 1b. Is this dist/ actually a build of THIS commit?
#
# --skip-build publishes whatever dist/ happens to be lying around, and a
# dist/ has no expiry. Every check in this script still passes, because the
# verification in step 4 compares the stale bundle to itself and finds them
# identical — "Done" is printed over a bundle that may be weeks old.
#
# That is how gleeworld.org ended up serving 7283e0387 on 2026-08-20: a
# dist/ from before that morning's pull was still in the tree, --skip-build
# found it, and the deploy reported success while taking three merged
# features off the live site.
#
# bumpSwVersion writes the short HEAD SHA into dist/sw.js at build time, so
# the bundle knows which commit produced it. Compare it to HEAD and refuse a
# mismatch. The comparison is skipped for a dirty tree only in the sense that
# uncommitted edits still build under HEAD's SHA — the note above covers that
# case, and this one cannot see it.
if git rev-parse --git-dir >/dev/null 2>&1; then
  HEAD_SHA=$(git rev-parse --short HEAD)
  DIST_SHA=$(printf '%s' "$LOCAL_CACHE" | sed -E "s/.*'([^']+)'.*/\1/")
  if [ -n "$DIST_SHA" ] && [ "$DIST_SHA" != "$HEAD_SHA" ]; then
    echo "!! dist/ was built from $DIST_SHA but HEAD is $HEAD_SHA."
    echo "   This dist/ is stale — publishing it would ship code from another commit."
    echo "   Fix: drop --skip-build (or run npm run build) and deploy again."
    exit 1
  fi
fi

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
