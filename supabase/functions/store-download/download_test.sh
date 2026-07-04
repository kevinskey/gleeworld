#!/usr/bin/env bash
# DEFERRED: requires deployed function + real DO Spaces creds.
# Not run in this environment (code-only task, no deploy, no real DO Spaces
# access). Kept verbatim from the Task 6 brief so it's ready to run once the
# function is deployed with real SPACES_KEY/SPACES_SECRET/SPACES_BUCKET/
# SPACES_REGION and a live entitlement (valid + expired token) exists.
# See store-download/logic_test.ts for the local, network-free coverage of
# the same branches (400/403/403/302) that stands in for this in CI today.
set -euo pipefail
BASE="${BASE:-https://supabase.gleeworld.org/functions/v1}"; ANON="$1"; TOKEN="$2"; EXPIRED="$3"
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/store-download?token=$TOKEN" -H "apikey: $ANON")
[ "$code" = "302" ] || { echo "valid token expected 302, got $code"; exit 1; }
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/store-download?token=$EXPIRED" -H "apikey: $ANON")
[ "$code" = "403" ] || { echo "expired token expected 403, got $code"; exit 1; }
echo "download test passed"
