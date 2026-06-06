# Stripe self-serve setup

Step-by-step to turn the pricing page into a real checkout funnel. ~25 min.

## 1. In Stripe Dashboard (https://dashboard.stripe.com/)

### a) Create three recurring Products

| Name | Price | Billing |
|---|---|---|
| GleeWorld — Solo Director | $49.00 USD | Monthly |
| GleeWorld — School / Program | $99.00 USD | Monthly |
| GleeWorld — Institution | $299.00 USD | Monthly |

For each: **Products → Add product**. Set the recurring price.

### b) Create three Payment Links (one per Product)

**Products → click the product → Pricing → "..." next to the price → Create payment link**.

For each Payment Link, configure:

- **After payment** → **"Don't show confirmation page; redirect customers"** → custom URL: `https://gleeworld.org/thank-you`
- **Customer information** → require email (default).
- **Custom fields** → add two:
  - `org_name` — Text, required, label: "Organization name"
  - `subdomain` — Text, optional, label: "Preferred site address (e.g. 'eastside')"

Copy the URL from each (looks like `https://buy.stripe.com/abc123def456`).

### c) Create the webhook endpoint

**Developers → Webhooks → Add endpoint**.

- **Endpoint URL:** `https://api.gleeworld.org/stripe-webhook`
- **Events to send:** `checkout.session.completed`

After creating, click the endpoint → **Reveal signing secret** → copy the `whsec_...` value.

### d) Copy your secret API key

**Developers → API keys → Secret key (sk_live_… or sk_test_… for test mode)** → reveal & copy.

## 2. On the droplet

### a) Set the secrets in the webhook env

```bash
sudo nano /etc/gleeworld-provision.env
```

Fill in:
```
STRIPE_SECRET_KEY=sk_live_…   (or sk_test_…)
STRIPE_WEBHOOK_SECRET=whsec_…
```

Save, then:
```bash
sudo systemctl restart gleeworld-provision.service
sudo systemctl status gleeworld-provision.service
journalctl -u gleeworld-provision.service -f
```

You should see: `GleeWorld provision webhook listening on 127.0.0.1:3030`.

### b) DNS for `api.gleeworld.org`

At your DNS provider, add:
```
A record   api.gleeworld.org   →   198.211.113.144
```

### c) nginx public route + SSL

```bash
sudo cp /opt/gleeworld-provision-webhook/nginx-snippet.conf \
        /etc/nginx/sites-available/api.gleeworld.org
sudo ln -s /etc/nginx/sites-available/api.gleeworld.org \
           /etc/nginx/sites-enabled/api.gleeworld.org
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.gleeworld.org --non-interactive --agree-tos -m you@example.com --redirect
```

### d) Smoke test

In Stripe Dashboard → Webhooks → your endpoint → **Send test webhook** → choose `checkout.session.completed`. Within ~5 seconds you should see `200 OK` next to it. The webhook will *try* to provision a tenant from the dummy data — fine for verifying connectivity, but feel free to delete the resulting test tenant.

## 3. In the frontend

Open `src/pages/GleeWorldLanding.tsx`, find `STRIPE_LINKS`, paste the three Payment Link URLs:

```ts
const STRIPE_LINKS: Record<string, string | null> = {
  solo:        "https://buy.stripe.com/abc123…",
  school:      "https://buy.stripe.com/def456…",
  institution: "https://buy.stripe.com/ghi789…",
};
```

Rebuild + redeploy. Done. The pricing tier buttons now go straight to Stripe Checkout.

## How a real purchase flows after this is wired

1. Buyer clicks "Most popular — start here" on the $99 tier.
2. Stripe-hosted Checkout opens (filled with their org name + subdomain).
3. They enter card info, submit.
4. Stripe sends `checkout.session.completed` to `api.gleeworld.org/stripe-webhook`.
5. Webhook validates signature, extracts metadata, runs `provision-tenant.sh`.
6. ~90 seconds later: tenant DB created, admin user created, nginx configured, SSL issued.
7. Welcome email sent via Resend HTTPS API (no SMTP needed) with the password-set link.
8. Buyer opens email, sets password, lands on the Site Setup wizard.

End-to-end time from card swipe to working site: ~2 minutes.
