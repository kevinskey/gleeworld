#!/bin/bash
# Deploy the onboarding fixes end-to-end. Run from Kevin's Mac:
#   bash /private/tmp/claude-501/-Users-kevinjohnson/6cf713b7-8dae-4deb-ba46-2f4239fc9a74/scratchpad/onboarding/deploy-onboarding-fixes.sh
#
# Steps:
#   1. JWT hook migration (prod DB, as supabase_admin)
#   2. Deploy patched superadmin + provision-webhook services (with backups)
#   3. Stripe: fix stale tier metadata; create Conservatory price + payment link
#   4. Deploy rebuilt SPA (rsync, NO --delete)
#   5. End-to-end test: provision "flowtest" tenant → verification gate → delete
set -euo pipefail

DROPLET=root@198.211.113.144
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/gleeworld-src"

echo "══ 1/5 · JWT hook migration ══════════════════════════════════════"
scp "$SRC/supabase/migrations/20260703120000_jwt_hook_prefer_profile_tenant.sql" "$DROPLET":/tmp/hookfix.sql
ssh "$DROPLET" bash -s <<'REMOTE1'
set -e
docker cp /tmp/hookfix.sql supabase-db:/tmp/hookfix.sql
docker exec supabase-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -f /tmp/hookfix.sql
echo "  ✓ custom_access_token_hook updated"
REMOTE1

echo "══ 2/5 · Deploy superadmin + webhook services ════════════════════"
ssh "$DROPLET" 'cp /opt/gleeworld-superadmin/server.js /opt/gleeworld-superadmin/server.js.bak-20260703 && cp /opt/gleeworld-provision-webhook/server.js /opt/gleeworld-provision-webhook/server.js.bak-20260703 && echo "  ✓ backups written (.bak-20260703)"'
scp "$HERE/superadmin-server.js" "$DROPLET":/opt/gleeworld-superadmin/server.js
scp "$HERE/webhook-server.js"    "$DROPLET":/opt/gleeworld-provision-webhook/server.js
ssh "$DROPLET" bash -s <<'REMOTE2'
set -e
systemctl restart gleeworld-superadmin gleeworld-provision
sleep 2
echo -n "  superadmin healthz: "; curl -s 127.0.0.1:3035/healthz; echo
echo -n "  webhook healthz:    "; curl -s 127.0.0.1:3030/healthz; echo
systemctl is-active gleeworld-superadmin gleeworld-provision | sed 's/^/  /'
REMOTE2

echo "══ 3/5 · Stripe: tier metadata + Conservatory link ═══════════════"
ssh "$DROPLET" bash -s <<'REMOTE3'
set -e
set -a; . /etc/gleeworld-provision.env; set +a

fix_tier() {
  curl -s -u "$STRIPE_SECRET_KEY:" -d "metadata[gleeworld_tier]=$2" \
    "https://api.stripe.com/v1/payment_links/$1" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print("  ✓ tier →", d.get("metadata",{}).get("gleeworld_tier") or d.get("error",{}).get("message"))'
}
fix_tier plink_1Te0grAem0G4wc8GyT7jTAjr ensemble
fix_tier plink_1Te0grAem0G4wc8GOe5BtSl4 studio
fix_tier plink_1Te0gsAem0G4wc8GV4q9uWfT university

# Conservatory: product → $179/mo price → payment link mirroring the others.
PROD=$(curl -s -u "$STRIPE_SECRET_KEY:" -d name="GleeWorld Conservatory" \
  -d description="GleeWorld Conservatory plan — up to 250 students" \
  https://api.stripe.com/v1/products \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
PRICE=$(curl -s -u "$STRIPE_SECRET_KEY:" -d product="$PROD" -d unit_amount=17900 \
  -d currency=usd -d "recurring[interval]=month" \
  https://api.stripe.com/v1/prices \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
curl -s -u "$STRIPE_SECRET_KEY:" \
  -d "line_items[0][price]=$PRICE" -d "line_items[0][quantity]=1" \
  -d "metadata[gleeworld_tier]=conservatory" \
  -d "after_completion[type]=redirect" \
  -d "after_completion[redirect][url]=https://gleeworld.org/thank-you" \
  -d "custom_fields[0][key]=org_name" \
  -d "custom_fields[0][label][type]=custom" \
  --data-urlencode "custom_fields[0][label][custom]=Organization name (e.g. Eastside Choir)" \
  -d "custom_fields[0][type]=text" \
  -d "custom_fields[0][text][minimum_length]=2" \
  -d "custom_fields[0][text][maximum_length]=100" \
  -d "custom_fields[1][key]=subdomain" \
  -d "custom_fields[1][label][type]=custom" \
  --data-urlencode "custom_fields[1][label][custom]=Site address (yourname.gleeworld.org)" \
  -d "custom_fields[1][type]=text" \
  -d "custom_fields[1][optional]=true" \
  -d "custom_fields[1][text][minimum_length]=3" \
  -d "custom_fields[1][text][maximum_length]=30" \
  https://api.stripe.com/v1/payment_links \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print("  ✓ CONSERVATORY LINK:", d.get("url", d.get("error",{}).get("message","FAILED")))'
REMOTE3
echo "  ↑ paste that URL into STRIPE_LINKS.conservatory in GleeWorldLanding.tsx"

echo "══ 4/5 · Deploy SPA build ════════════════════════════════════════"
# NO --delete: /var/www/gleeworld/html/tenants/ (per-tenant bootstrap files)
# is not in dist/ and must survive.
rsync -az "$SRC/dist/" "$DROPLET":/var/www/gleeworld/html/
echo "  ✓ dist synced"

echo "══ 5/5 · End-to-end test: provision → verify → delete ═══════════"
ssh "$DROPLET" bash -s <<'REMOTE5'
set -e
set -a; . /opt/gleeworld-superadmin/.env; set +a
RESP=$(curl -s -X POST 127.0.0.1:3035/tenants \
  -H "Content-Type: application/json" -H "X-Internal-Token: $INTERNAL_TOKEN" \
  -d '{"slug":"flowtest","name":"Flow Test Choir","subdomain":"flowtest","admin_email":"kpj64110+flowtest@gmail.com","admin_name":"Flow Test","plan":"ensemble","deployment_path":"self"}')
echo "$RESP" | python3 -c '
import json,sys
d=json.load(sys.stdin)
v=d.get("verification",{})
print("  tenant:", d.get("tenant",{}).get("id"), "→", d.get("url"))
for c in v.get("checks",[]):
    print("   ", "✓" if c["ok"] else "✗", c["name"], ("— "+c["detail"]) if c.get("detail") else "")
print("  verification:", "PASSED" if v.get("passed") else "FAILED")
print("  welcome email sent:", d.get("welcome_sent"))
'
TENANT_ID=$(echo "$RESP" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tenant",{}).get("id",""))')
PASSED=$(echo "$RESP"    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("verification",{}).get("passed",False))')
if [ -n "$TENANT_ID" ] && [ "$PASSED" = "True" ]; then
  echo "  cleaning up test tenant..."
  curl -s -X DELETE "127.0.0.1:3035/tenants/$TENANT_ID" -H "X-Internal-Token: $INTERNAL_TOKEN" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); print("  ✓ deleted:", d.get("deleted",{}).get("slug", d.get("error")))'
else
  echo "  ⚠ verification FAILED or no tenant id — flowtest tenant KEPT for inspection ($TENANT_ID)"
fi
REMOTE5

echo "══ Done ══════════════════════════════════════════════════════════"
echo "Remaining by hand:"
echo "  • merge branch onboarding-fixes into main (gh pr create or git merge)"
echo "  • paste the Conservatory payment-link URL into STRIPE_LINKS in"
echo "    src/pages/GleeWorldLanding.tsx, rebuild, redeploy (or tell Claude)"
