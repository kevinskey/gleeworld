#!/bin/bash
# Create Stripe Product + recurring monthly Price for each gw_billing_modules add-on.
# Idempotent via metadata.module_slug — re-runs skip already-created products.
# Updates gw_billing_modules.stripe_price_id after each create.
set -euo pipefail

source /etc/gleeworld-provision.env
[ -z "${STRIPE_SECRET_KEY:-}" ] && { echo "missing STRIPE_SECRET_KEY"; exit 1; }

ADDONS=$(docker exec supabase-db psql -U supabase_admin -d postgres -At -c "
  SELECT id || '|' || name || '|' || monthly_price_cents
  FROM gw_billing_modules
  WHERE tier='addon' AND is_active=true
    AND (stripe_price_id IS NULL OR stripe_price_id = '')
  ORDER BY sort_order;")

if [ -z "$ADDONS" ]; then
  echo "No add-ons need Stripe products. Done."
  exit 0
fi

while IFS='|' read -r slug name cents; do
  [ -z "$slug" ] && continue
  echo "--- $slug ($name) at \$$((cents/100))/mo ---"

  # Check if a Stripe product with this metadata already exists
  EXISTING=$(curl -sS "https://api.stripe.com/v1/products/search?query=metadata['module_slug']:'$slug'" \
    -u "$STRIPE_SECRET_KEY:" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data'][0]['id'] if d.get('data') else '')")

  if [ -n "$EXISTING" ]; then
    echo "  reusing existing product: $EXISTING"
    PRODUCT_ID="$EXISTING"
  else
    PRODUCT_ID=$(curl -sS -X POST 'https://api.stripe.com/v1/products' \
      -u "$STRIPE_SECRET_KEY:" \
      -d "name=GleeWorld — $name" \
      -d "metadata[module_slug]=$slug" \
      -d "metadata[gleeworld_addon]=true" \
      | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
    echo "  created product: $PRODUCT_ID"
  fi

  # Create the recurring monthly price
  PRICE_ID=$(curl -sS -X POST 'https://api.stripe.com/v1/prices' \
    -u "$STRIPE_SECRET_KEY:" \
    -d "product=$PRODUCT_ID" \
    -d "unit_amount=$cents" \
    -d "currency=usd" \
    -d "recurring[interval]=month" \
    -d "metadata[module_slug]=$slug" \
    -d "lookup_key=gw_${slug}_monthly" \
    -d "transfer_lookup_key=true" \
    | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))")

  if [ -z "$PRICE_ID" ]; then
    echo "  FAILED to create price for $slug"
    continue
  fi
  echo "  created price: $PRICE_ID"

  # Persist into DB
  docker exec supabase-db psql -U supabase_admin -d postgres -c \
    "UPDATE gw_billing_modules SET stripe_price_id='$PRICE_ID', updated_at=now() WHERE id='$slug';" >/dev/null

done <<< "$ADDONS"

echo ""
echo "=== Final state ==="
docker exec supabase-db psql -U supabase_admin -d postgres -c \
  "SELECT id, monthly_price_cents/100 AS dollars, stripe_price_id FROM gw_billing_modules WHERE tier='addon' ORDER BY sort_order;"
