#!/usr/bin/env bash
# Deploy the Retirement Concert RSVP form to kevin.gleeworld.org.
#
# Everything here is idempotent — safe to re-run if a step fails partway.
# Run from the repo root:  bash deploy/concert-rsvp-20260804/deploy.sh
#
# What it touches, in order:
#   1. DB   — uses_platform_stripe column + flag on the `kevin` tenant
#   2. DB   — the event, its $50 ticket tier, and the two souvenirs
#   3. Edge — concert-rsvp-checkout (+ the _shared/payments seam it uses)
#   4. Node — one branch in the platform Stripe webhook, then a restart
#   5. DB   — add the block to the site, wire the hero button, republish
#   6. Web  — build + rsync the SPA
set -euo pipefail

DROPLET="root@198.211.113.144"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HERE="$REPO_ROOT/deploy/concert-rsvp-20260804"
TENANT_ID="364cc4db-68d6-4b7e-bed1-94166a1f2deb"

psql_file() {  # apply a .sql file atomically — any error rolls the whole file back
  local f="$1"
  ssh "$DROPLET" "docker exec -i supabase-db psql -U postgres -d postgres \
      -v ON_ERROR_STOP=1 --single-transaction" < "$f"
}

echo "══ 1/6  schema: uses_platform_stripe ═══════════════════════════════════"
psql_file "$REPO_ROOT/supabase/migrations/20260804191000_tenant_uses_platform_stripe.sql"

echo "══ 2/6  seed: event, ticket tier, souvenirs ════════════════════════════"
psql_file "$HERE/seed-retirement-concert.sql"

echo "══ 3/6  edge function: concert-rsvp-checkout ═══════════════════════════"
# Co-deploys _shared/ (which carries the applicationFeeCents/metadata seam
# change this function depends on) and restarts the Deno container.
bash "$REPO_ROOT/scripts/deploy-functions.sh" concert-rsvp-checkout

echo "══ 4/6  platform Stripe webhook: box-office branch ═════════════════════"
ssh "$DROPLET" "cp -a /opt/gleeworld-provision-webhook/server.js \
                     /opt/gleeworld-provision-webhook/server.js.bak-\$(date +%s)"
scp -q "$HERE/patch-webhook.py" "$DROPLET:/tmp/patch-webhook.py"
ssh "$DROPLET" "python3 /tmp/patch-webhook.py"
# Refuse to restart into a file that does not parse.
ssh "$DROPLET" "node --check /opt/gleeworld-provision-webhook/server.js" \
  && echo "   syntax OK"
ssh "$DROPLET" "systemctl restart gleeworld-provision && sleep 2 && \
                systemctl is-active gleeworld-provision"

echo "══ 5/6  site: block + hero link + republish ════════════════════════════"
psql_file "$HERE/wire-site.sql"

echo "══ 6/6  frontend build + deploy ════════════════════════════════════════"
bash "$REPO_ROOT/scripts/deploy-frontend.sh"

echo
echo "Done. Check https://kevin.gleeworld.org  — the hero button and the RSVP"
echo "card should both open the form."
echo
echo "Smoke test with a real card (Stripe is LIVE), then refund from the"
echo "dashboard, or watch the webhook land with:"
echo "  ssh $DROPLET 'journalctl -u gleeworld-provision -f'"
