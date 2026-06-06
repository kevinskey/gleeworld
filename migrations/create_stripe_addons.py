#!/usr/bin/env python3
"""Create Stripe Product + recurring monthly Price for each gw_billing_modules add-on.
Idempotent via lookup_key — re-runs skip prices that already exist."""
import os, json, subprocess, sys
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError

def stripe_get(path):
    req = Request(f"https://api.stripe.com/v1/{path}",
                  headers={"Authorization": f"Bearer {KEY}"})
    return json.loads(urlopen(req).read())

def stripe_post(path, data):
    req = Request(f"https://api.stripe.com/v1/{path}",
                  data=urlencode(data, doseq=True).encode(),
                  headers={"Authorization": f"Bearer {KEY}",
                           "Content-Type": "application/x-www-form-urlencoded"})
    try:
        return json.loads(urlopen(req).read())
    except HTTPError as e:
        body = e.read().decode()
        print(f"  HTTP {e.code} from Stripe: {body[:300]}")
        raise

# Load secret from env file
with open("/etc/gleeworld-provision.env") as f:
    for line in f:
        if line.startswith("STRIPE_SECRET_KEY="):
            KEY = line.split("=", 1)[1].strip()
            break
    else:
        print("STRIPE_SECRET_KEY not found"); sys.exit(1)

# Get rows needing creation
sql = "SELECT id, name, monthly_price_cents FROM gw_billing_modules WHERE tier='addon' AND is_active=true AND (stripe_price_id IS NULL OR stripe_price_id='') ORDER BY sort_order;"
rows = subprocess.check_output(["docker", "exec", "supabase-db", "psql", "-U", "supabase_admin", "-d", "postgres", "-At", "-F", "|", "-c", sql]).decode().strip().splitlines()

if not rows:
    print("No add-ons need Stripe products. Done.")
    sys.exit(0)

for line in rows:
    slug, name, cents = line.split("|")
    cents = int(cents)
    print(f"--- {slug} ({name}) ${cents//100}/mo ---")

    # Look for existing product by lookup_key on price
    lookup = f"gw_{slug}_monthly"
    existing = stripe_get(f"prices?lookup_keys[]={lookup}&active=true&limit=1")
    if existing.get("data"):
        price_id = existing["data"][0]["id"]
        print(f"  existing price: {price_id}")
    else:
        product = stripe_post("products", {
            "name": f"GleeWorld — {name}",
            "metadata[module_slug]": slug,
            "metadata[gleeworld_addon]": "true",
        })
        product_id = product["id"]
        print(f"  created product: {product_id}")

        price = stripe_post("prices", {
            "product": product_id,
            "unit_amount": cents,
            "currency": "usd",
            "recurring[interval]": "month",
            "lookup_key": lookup,
            "metadata[module_slug]": slug,
        })
        price_id = price["id"]
        print(f"  created price: {price_id}")

    subprocess.check_call([
        "docker", "exec", "supabase-db", "psql", "-U", "supabase_admin", "-d", "postgres", "-c",
        f"UPDATE gw_billing_modules SET stripe_price_id='{price_id}', updated_at=now() WHERE id='{slug}';"
    ], stdout=subprocess.DEVNULL)

print("\n=== Final state ===")
subprocess.run(["docker", "exec", "supabase-db", "psql", "-U", "supabase_admin", "-d", "postgres", "-c",
    "SELECT id, monthly_price_cents/100 AS dollars, stripe_price_id FROM gw_billing_modules WHERE tier='addon' ORDER BY sort_order;"])
