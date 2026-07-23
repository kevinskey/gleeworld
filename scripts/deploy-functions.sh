#!/usr/bin/env bash
# Deploy one or more Supabase Edge Functions to the self-hosted runtime on
# the gleeworld droplet.
#
# Self-hosted layout: functions live under
#   /opt/supabase/volumes/functions/<name>/
# and are served by the `supabase-edge-functions` container. Deno reads
# the mounted volume at request time, but ES-module import caching means
# a live container will keep serving the OLD code until it's restarted —
# so we always restart after any function changes.
#
# `_shared/` is co-deployed whenever any function is deployed, because
# most functions import from `../_shared/*.ts` (cors, auth helpers, etc.)
# and shipping a function without its shared deps is a very fun way to
# 500 in production for 30 seconds until you notice.
#
# Usage:
#   bash scripts/deploy-functions.sh elevenlabs-tts
#   bash scripts/deploy-functions.sh assistant-chat fetch-news-feeds
#   bash scripts/deploy-functions.sh --all
#   bash scripts/deploy-functions.sh --no-restart <name>       # for batching
set -euo pipefail

DROPLET="root@198.211.113.144"
REMOTE_ROOT="/opt/supabase/volumes/functions"
CONTAINER="supabase-edge-functions"

usage() {
  cat <<EOF
Usage: bash scripts/deploy-functions.sh [--all|<name>...] [--no-restart]

Examples:
  bash scripts/deploy-functions.sh elevenlabs-tts
  bash scripts/deploy-functions.sh assistant-chat fetch-news-feeds
  bash scripts/deploy-functions.sh --all
EOF
  exit 1
}

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL_ROOT="$REPO_ROOT/supabase/functions"
[ -d "$LOCAL_ROOT" ] || { echo "!! No $LOCAL_ROOT — run from a gleeworld checkout." >&2; exit 1; }

DEPLOY_ALL=0
DO_RESTART=1
NAMES=()
for arg in "$@"; do
  case "$arg" in
    --all)        DEPLOY_ALL=1 ;;
    --no-restart) DO_RESTART=0 ;;
    -h|--help)    usage ;;
    -*)           echo "!! Unknown flag: $arg" >&2; usage ;;
    *)            NAMES+=("$arg") ;;
  esac
done

if [ "$DEPLOY_ALL" -eq 1 ]; then
  # Every function folder except _shared (which is co-deployed below).
  while IFS= read -r d; do
    NAMES+=("$(basename "$d")")
  done < <(find "$LOCAL_ROOT" -mindepth 1 -maxdepth 1 -type d ! -name '_shared' | sort)
fi

[ "${#NAMES[@]}" -gt 0 ] || usage

# Validate each name exists locally BEFORE any network calls — a typo
# shouldn't rsync half your functions and then bail.
for name in "${NAMES[@]}"; do
  [ -d "$LOCAL_ROOT/$name" ] || { echo "!! No such function: supabase/functions/$name" >&2; exit 1; }
done

echo "==> Deploying ${#NAMES[@]} function(s) to $DROPLET:$REMOTE_ROOT"
for name in "${NAMES[@]}"; do
  echo "  · $name"
done

# Always ship _shared/ if it exists — functions import from it and out-of-
# sync shared code is a nightmare to diagnose from a 500.
if [ -d "$LOCAL_ROOT/_shared" ]; then
  echo "==> Rsync _shared/"
  rsync -az --delete "$LOCAL_ROOT/_shared/" "$DROPLET:$REMOTE_ROOT/_shared/"
fi

for name in "${NAMES[@]}"; do
  echo "==> Rsync $name/"
  # --delete inside the function folder is safe: the folder is one function's
  # code and any file removed locally SHOULD be removed remotely.
  rsync -az --delete "$LOCAL_ROOT/$name/" "$DROPLET:$REMOTE_ROOT/$name/"
done

if [ "$DO_RESTART" -eq 1 ]; then
  echo "==> Restarting $CONTAINER"
  ssh "$DROPLET" "docker restart $CONTAINER" >/dev/null
  echo "==> Restarted."
else
  echo "==> Skipped restart (--no-restart). Remember to restart $CONTAINER before verifying."
fi

echo "==> Done."
