#!/usr/bin/env bash
# DEFERRED: requires sk_test_ Stripe key + deployed function (Task 8 phase).
set -euo pipefail
BASE="${BASE:-https://supabase.gleeworld.org/functions/v1}"; ANON="$1"; JWT="$2"; PROD="$3"
# Tampered price is impossible by construction (client sends no price); assert a valid call returns a URL
# and that an unauthenticated call is rejected.
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/store-checkout" -H "apikey: $ANON" \
  -H 'Content-Type: application/json' -d "{\"store_type\":\"tenant\",\"items\":[{\"product_id\":\"$PROD\",\"quantity\":1}],\"buyer_email\":\"b@x.com\"}")
[ "$code" = "401" ] || { echo "expected 401 unauth, got $code"; exit 1; }
resp=$(curl -s -X POST "$BASE/store-checkout" -H "apikey: $ANON" -H "Authorization: Bearer $JWT" \
  -H 'Content-Type: application/json' -d "{\"store_type\":\"tenant\",\"items\":[{\"product_id\":\"$PROD\",\"quantity\":1}],\"buyer_email\":\"b@x.com\"}")
echo "$resp" | grep -q 'checkout.stripe.com\|/c/pay/' || { echo "no checkout url: $resp"; exit 1; }
echo "checkout test passed"
