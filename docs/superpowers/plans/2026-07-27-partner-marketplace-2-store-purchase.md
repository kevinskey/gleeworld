# Partner Marketplace — Sub-plan 2: Store + Purchase

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give buyers a public composer store where they can browse published partner scores, add to cart, check out via Stripe (50/50 split via Stripe Connect Express `application_fee_amount`), and receive a watermarked PDF in their My Music library — the first real money-moving surface of the marketplace.

**Architecture:** Three new tables (`gw_partner_orders`, `gw_partner_order_items`, `gw_partner_downloads`) capture the money leg. Four edge functions (`partner-checkout-create`, `partner-webhook`, `partner-watermark`, `partner-download-url`) do all Stripe + PDF work — client never talks to Stripe directly. Buyer flow: browse `/store` → score detail → cart → Stripe Checkout → return to `/store/thanks?order=<id>` which polls order status until `paid` + item watermarked. Fulfillment fires from the Stripe webhook: verify signature → mark order paid → for each item, download master PDF → stamp per-buyer watermark via pdf-lib → upload to `personal-scores/<buyer_id>/store/<order_item_id>.pdf` → create `gw_store_entitlements` row → create `gw_personal_scores` row so the score appears in My Music immediately. Single-partner cart is enforced (Stripe Checkout's `transfer_data.destination` only supports one Connect account; multi-partner cart is a follow-up).

**Tech Stack:** Postgres 15 + Supabase RLS, Deno edge functions, `npm:stripe@14.25.0`, `npm:pdf-lib@1.17.1`, React 18 + TypeScript, Tailwind + shadcn/ui, TanStack Query, Vitest.

## Global Constraints

- Prices in USD only, $1.00–$50.00 per score (matches `gw_partner_scores.price_cents` CHECK from Sub-plan 1).
- Stripe: `apiVersion: "2024-06-20"`; `npm:stripe@14.25.0`; Connect Express with `application_fee_amount = floor(subtotal_cents / 2)`; `transfer_data.destination = partner.stripe_connect_id`.
- Signed download URLs: **5 minutes** exactly.
- Watermark text (verbatim): `"Purchased by {buyer_display_name} · GleeWorld Order #{order.id.substring(0,8)} · License to one performer"`.
- Buyer display name comes from `gw_profiles.full_name` (fallback: auth email local part).
- Cart is client-side only (localStorage / TanStack state); server never stores an unpurchased cart.
- Single-partner cart in v1 — if a buyer tries to add a second partner's score, block with a "Complete current partner purchase first" toast.
- `personal-scores` bucket is user-scoped (owner reads own path). Master PDFs are NEVER served — only watermarked copies via 5-min signed URL.
- Webhook signature verified with `STRIPE_WEBHOOK_SECRET_PARTNER` env var (NEW — Kevin registers the endpoint in Stripe dashboard and adds this secret before Task 5 deploy).
- All migrations idempotent (`IF NOT EXISTS`, `DROP POLICY IF EXISTS ... CREATE POLICY`).
- Multi-tenant SaaS but these tables are PLATFORM-GLOBAL by design (matching Sub-plan 1's pattern) — NO `tenant_id`.
- Never hardcode "Spelman" or a tenant name; never say "singers"/"members" — say "students". "graduates" not "alumnae".
- Studio sizing: text-xs / text-sm min; icons w-4 h-4.
- Node ≥ 20; deploy = local build + `bash scripts/deploy-frontend.sh` from `~/Documents/GitHub/gleeworld-repertoire/`.
- Prod DB via `ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres" < migration.sql`.
- Edge fn deploy: `scp -r supabase/functions/<name>/ root@supabase.gleeworld.org:/opt/supabase/volumes/functions/`, then `ssh root@supabase.gleeworld.org "docker restart supabase-edge-functions"`.
- Sub-plan 1 gotcha PRESERVED: `useMyPartner` / `useMyPartnerScores` MUST call `my_partner_id()` RPC first then filter — do NOT regress in any code you touch.

---

## File Structure

**New — migrations:**
- `supabase/migrations/20260728120000_gw_partner_orders.sql` — orders + order_items + RLS.
- `supabase/migrations/20260728120100_gw_partner_downloads.sql` — download audit log.

**New — edge functions:**
- `supabase/functions/partner-checkout-create/index.ts` — creates Stripe Checkout session with `application_fee_amount` + `transfer_data.destination`.
- `supabase/functions/partner-webhook/index.ts` — Stripe webhook: verify sig, mark order paid, invoke watermark for each item.
- `supabase/functions/partner-watermark/index.ts` — pdf-lib footer stamp + upload to personal-scores bucket.
- `supabase/functions/partner-download-url/index.ts` — 5-min signed URL to the watermarked path.

**New — client:**
- `src/lib/store/api.ts` — TanStack hooks + fee math + cart state.
- `src/lib/store/__tests__/api.test.ts` — Vitest.
- `src/pages/store/StorePage.tsx` — landing + featured-partner picks + browse grid.
- `src/pages/store/StoreScoreDetail.tsx` — single-score page with Buy Now.
- `src/pages/store/StorePartnerPage.tsx` — a composer's storefront (bio + all their published scores).
- `src/pages/store/StoreThanksPage.tsx` — post-checkout polling + download button when ready.
- `src/components/store/CartDrawer.tsx` — cart sheet + Checkout button.
- `src/components/store/CartContext.tsx` — cart state provider (React Context + localStorage persistence).

**Modify:**
- `src/App.tsx` — routes: `/store`, `/store/scores/:id`, `/store/partners/:id`, `/store/thanks`.
- `src/lib/navigation/navCatalog.ts` — new nav entry "Store" in `music` section.
- `src/lib/navigation/__tests__/appDestinations.test.ts` — add new routes to `KNOWN_ROUTES`.
- `src/pages/partner/PartnerScoresList.tsx` — add a "Publish" / "Unpublish" toggle so partners can flip `status` between `draft` and `published`.

**Deploy manual step (Kevin):**
- Register Stripe webhook endpoint `https://supabase.gleeworld.org/functions/v1/partner-webhook` in Stripe dashboard for event `checkout.session.completed` (v1 only). Copy the resulting signing secret into `/opt/supabase/.env` as `STRIPE_WEBHOOK_SECRET_PARTNER`.

---

## Task 1: Orders + order_items migration

**Files:**
- Create: `supabase/migrations/20260728120000_gw_partner_orders.sql`

**Interfaces:**
- Consumes: `auth.users`, `gw_partners`, `gw_partner_scores`, `gw_store_entitlements` (existing).
- Produces:
  - `gw_partner_orders(id uuid PK, buyer_user_id uuid FK auth.users NOT NULL DEFAULT auth.uid(), stripe_payment_intent_id text UNIQUE, stripe_checkout_session_id text UNIQUE, subtotal_cents int NOT NULL, platform_fee_cents int NOT NULL, currency text NOT NULL DEFAULT 'USD', status text CHECK ∈ ('pending','paid','failed','refunded','partial_refund') NOT NULL DEFAULT 'pending', paid_at timestamptz, refunded_at timestamptz, created_at timestamptz DEFAULT now())`.
  - `gw_partner_order_items(id uuid PK, order_id uuid FK gw_partner_orders ON DELETE CASCADE NOT NULL, partner_score_id uuid FK gw_partner_scores NOT NULL, partner_id uuid FK gw_partners NOT NULL, price_cents int NOT NULL, platform_fee_cents int NOT NULL, partner_payout_cents int NOT NULL, watermarked_storage_path text, entitlement_id uuid FK gw_store_entitlements ON DELETE SET NULL, created_at timestamptz DEFAULT now())`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260728120000_gw_partner_orders.sql`:

```sql
-- Partner marketplace Sub-plan 2: orders + line items.
--
-- Platform-global by design (matches Sub-plan 1 pattern). Buyer's tenant
-- context doesn't matter — a purchase is between the buyer, GleeWorld,
-- and one partner via Stripe Connect.

CREATE TABLE IF NOT EXISTS gw_partner_orders (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_user_id                 uuid NOT NULL DEFAULT auth.uid()
                                REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id      text UNIQUE,
  stripe_checkout_session_id    text UNIQUE,
  subtotal_cents                integer NOT NULL,
  platform_fee_cents            integer NOT NULL,
  currency                      text NOT NULL DEFAULT 'USD',
  status                        text NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','paid','failed','refunded','partial_refund')),
  paid_at                       timestamptz,
  refunded_at                   timestamptz,
  created_at                    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_partner_orders_buyer_idx
  ON gw_partner_orders (buyer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gw_partner_orders_status_idx
  ON gw_partner_orders (status) WHERE status IN ('pending','paid');

ALTER TABLE gw_partner_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gw_po_buyer_all ON gw_partner_orders;
CREATE POLICY gw_po_buyer_all
  ON gw_partner_orders FOR ALL TO authenticated
  USING (buyer_user_id = auth.uid())
  WITH CHECK (buyer_user_id = auth.uid());

DROP POLICY IF EXISTS gw_po_admin_all ON gw_partner_orders;
CREATE POLICY gw_po_admin_all
  ON gw_partner_orders FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM gw_profiles p
            WHERE p.user_id = auth.uid()
              AND (p.is_super_admin = true OR p.is_admin = true))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM gw_profiles p
            WHERE p.user_id = auth.uid()
              AND (p.is_super_admin = true OR p.is_admin = true))
  );

-- gw_partner_order_items: one row per purchased score.
CREATE TABLE IF NOT EXISTS gw_partner_order_items (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                      uuid NOT NULL REFERENCES gw_partner_orders(id) ON DELETE CASCADE,
  partner_score_id              uuid NOT NULL REFERENCES gw_partner_scores(id),
  partner_id                    uuid NOT NULL REFERENCES gw_partners(id),
  price_cents                   integer NOT NULL,
  platform_fee_cents            integer NOT NULL,
  partner_payout_cents          integer NOT NULL,
  watermarked_storage_path      text,
  entitlement_id                uuid REFERENCES gw_store_entitlements(id) ON DELETE SET NULL,
  created_at                    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_partner_order_items_order_idx
  ON gw_partner_order_items (order_id);
CREATE INDEX IF NOT EXISTS gw_partner_order_items_partner_idx
  ON gw_partner_order_items (partner_id, created_at DESC);

ALTER TABLE gw_partner_order_items ENABLE ROW LEVEL SECURITY;

-- Buyers read items whose parent order is theirs.
DROP POLICY IF EXISTS gw_poi_buyer_read ON gw_partner_order_items;
CREATE POLICY gw_poi_buyer_read
  ON gw_partner_order_items FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM gw_partner_orders o
            WHERE o.id = gw_partner_order_items.order_id
              AND o.buyer_user_id = auth.uid())
  );

-- Partners read items for their own scores (revenue reporting).
DROP POLICY IF EXISTS gw_poi_partner_read ON gw_partner_order_items;
CREATE POLICY gw_poi_partner_read
  ON gw_partner_order_items FOR SELECT TO authenticated
  USING (partner_id = my_partner_id());

-- Admin all.
DROP POLICY IF EXISTS gw_poi_admin_all ON gw_partner_order_items;
CREATE POLICY gw_poi_admin_all
  ON gw_partner_order_items FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM gw_profiles p
            WHERE p.user_id = auth.uid()
              AND (p.is_super_admin = true OR p.is_admin = true))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM gw_profiles p
            WHERE p.user_id = auth.uid()
              AND (p.is_super_admin = true OR p.is_admin = true))
  );
```

- [ ] **Step 2: Apply + verify**

```bash
ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres" \
  < ~/Documents/GitHub/gleeworld-repertoire/supabase/migrations/20260728120000_gw_partner_orders.sql

ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres -c '\\d gw_partner_orders' -c '\\d gw_partner_order_items'"
```

Expected: both tables with correct columns, RLS enabled, unique indexes on Stripe IDs.

- [ ] **Step 3: Commit**

```bash
cd ~/Documents/GitHub/gleeworld-repertoire
git add supabase/migrations/20260728120000_gw_partner_orders.sql
git commit -m "feat(partner): gw_partner_orders + gw_partner_order_items + RLS"
```

---

## Task 2: Downloads audit log migration

**Files:**
- Create: `supabase/migrations/20260728120100_gw_partner_downloads.sql`

**Interfaces:**
- Produces: `gw_partner_downloads(id uuid PK, order_item_id uuid FK gw_partner_order_items NOT NULL, downloaded_at timestamptz DEFAULT now(), client_ip inet, user_agent text)`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260728120100_gw_partner_downloads.sql`:

```sql
CREATE TABLE IF NOT EXISTS gw_partner_downloads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id   uuid NOT NULL REFERENCES gw_partner_order_items(id) ON DELETE CASCADE,
  downloaded_at   timestamptz NOT NULL DEFAULT now(),
  client_ip       inet,
  user_agent      text
);

CREATE INDEX IF NOT EXISTS gw_partner_downloads_item_idx
  ON gw_partner_downloads (order_item_id, downloaded_at DESC);

ALTER TABLE gw_partner_downloads ENABLE ROW LEVEL SECURITY;

-- Only the edge fn (service role) writes; buyers can read their own item's log.
DROP POLICY IF EXISTS gw_pd_buyer_read ON gw_partner_downloads;
CREATE POLICY gw_pd_buyer_read
  ON gw_partner_downloads FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1
            FROM gw_partner_order_items i
            JOIN gw_partner_orders o ON o.id = i.order_id
            WHERE i.id = gw_partner_downloads.order_item_id
              AND o.buyer_user_id = auth.uid())
  );

DROP POLICY IF EXISTS gw_pd_admin_all ON gw_partner_downloads;
CREATE POLICY gw_pd_admin_all
  ON gw_partner_downloads FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM gw_profiles p
            WHERE p.user_id = auth.uid()
              AND (p.is_super_admin = true OR p.is_admin = true))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM gw_profiles p
            WHERE p.user_id = auth.uid()
              AND (p.is_super_admin = true OR p.is_admin = true))
  );
```

- [ ] **Step 2: Apply + verify**

```bash
ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres" \
  < ~/Documents/GitHub/gleeworld-repertoire/supabase/migrations/20260728120100_gw_partner_downloads.sql
ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres -c '\\d gw_partner_downloads'"
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260728120100_gw_partner_downloads.sql
git commit -m "feat(partner): gw_partner_downloads audit table"
```

---

## Task 3: `partner-checkout-create` edge fn

**Files:**
- Create: `supabase/functions/partner-checkout-create/index.ts`

**Interfaces:**
- Consumes: `STRIPE_SECRET_KEY` env, `gw_partner_scores`, `gw_partners`.
- Produces:
  - POST endpoint. Body: `{ items: Array<{ partner_score_id: string; quantity?: 1 }> }` (v1: quantity always 1).
  - Auth: requires authenticated Bearer JWT (buyer identity).
  - Behavior: validates all items belong to ONE partner and that partner is `status='active'` with `stripe_charges_enabled=true`; creates `gw_partner_orders` row with `status='pending'`; calls `stripe.checkout.sessions.create` with `mode='payment'`, `line_items` (per score price), `payment_intent_data.application_fee_amount = floor(subtotal_cents * 0.5)`, `payment_intent_data.transfer_data.destination = partner.stripe_connect_id`, `metadata = { order_id: <uuid> }`; saves `stripe_checkout_session_id` on the order; returns `{ url: string, order_id: string }`.
  - Error cases: no items (400), items span multiple partners (400 with clear message), partner not active (400), Stripe error (500).

- [ ] **Step 1: Write the fn**

Create `supabase/functions/partner-checkout-create/index.ts`:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.25.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
const APP_HOST = Deno.env.get("APP_HOST") ?? "https://gleeworld.org";

interface Item { partner_score_id: string; }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: userData } = await supa.auth.getUser(jwt);
  if (!userData.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  const body = await req.json().catch(() => ({}));
  const items: Item[] = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return new Response(JSON.stringify({ error: "cart empty" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });

  // Load scores + partner in one query.
  const { data: scores, error: scoresErr } = await supa
    .from("gw_partner_scores")
    .select("id, title, price_cents, partner_id, status")
    .in("id", items.map(i => i.partner_score_id));
  if (scoresErr || !scores || scores.length !== items.length) {
    return new Response(JSON.stringify({ error: "one or more scores not found" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
  const published = scores.filter(s => s.status === "published");
  if (published.length !== scores.length) {
    return new Response(JSON.stringify({ error: "one or more scores are not for sale" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
  const partnerIds = new Set(published.map(s => s.partner_id));
  if (partnerIds.size > 1) {
    return new Response(JSON.stringify({ error: "cart contains multiple partners; complete one purchase at a time" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
  const partnerId = [...partnerIds][0];

  const { data: partner } = await supa
    .from("gw_partners").select("id, stripe_connect_id, stripe_charges_enabled, status").eq("id", partnerId).single();
  if (!partner || partner.status !== "active" || !partner.stripe_charges_enabled || !partner.stripe_connect_id) {
    return new Response(JSON.stringify({ error: "partner not currently accepting purchases" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  const subtotal_cents = published.reduce((s, x) => s + x.price_cents, 0);
  const platform_fee_cents = Math.floor(subtotal_cents / 2);

  // Insert order (pending).
  const { data: order, error: orderErr } = await supa
    .from("gw_partner_orders")
    .insert({
      buyer_user_id: userData.user.id,
      subtotal_cents,
      platform_fee_cents,
      currency: "USD",
      status: "pending",
    })
    .select("id")
    .single();
  if (orderErr || !order) {
    return new Response(JSON.stringify({ error: "could not create order" }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  // Create Stripe Checkout session.
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: published.map((s) => ({
      price_data: {
        currency: "usd",
        product_data: { name: s.title },
        unit_amount: s.price_cents,
      },
      quantity: 1,
    })),
    payment_intent_data: {
      application_fee_amount: platform_fee_cents,
      transfer_data: { destination: partner.stripe_connect_id },
      metadata: { order_id: order.id },
    },
    metadata: { order_id: order.id, partner_id: partnerId, buyer_user_id: userData.user.id },
    success_url: `${APP_HOST}/store/thanks?order=${order.id}`,
    cancel_url: `${APP_HOST}/store`,
    customer_email: userData.user.email ?? undefined,
  });

  await supa.from("gw_partner_orders").update({ stripe_checkout_session_id: session.id }).eq("id", order.id);

  return new Response(JSON.stringify({ url: session.url, order_id: order.id }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
```

- [ ] **Step 2: Deploy**

```bash
scp -r ~/Documents/GitHub/gleeworld-repertoire/supabase/functions/partner-checkout-create \
  root@supabase.gleeworld.org:/opt/supabase/volumes/functions/
ssh root@supabase.gleeworld.org "docker restart supabase-edge-functions"
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/partner-checkout-create/
git commit -m "feat(partner): partner-checkout-create edge fn (Stripe Checkout w/ 50% platform fee)"
```

---

## Task 4: `partner-watermark` edge fn

**Files:**
- Create: `supabase/functions/partner-watermark/index.ts`

**Interfaces:**
- Consumes: `pdf-lib`, `partner-scores-master` (read), `personal-scores` (write) buckets. Service-role client.
- Produces:
  - POST body: `{ order_item_id: string }`.
  - Auth: service-role only (no JWT verification; the webhook calls this fn directly and no client exposure).
  - Behavior: loads the `gw_partner_order_items` row and joins to the parent order (buyer_id), the `gw_partner_scores` (master_storage_path, title), and `gw_profiles` (buyer display name). Downloads master PDF. Stamps footer on every page: `"Purchased by {buyer_display_name} · GleeWorld Order #{order.id.substring(0,8)} · License to one performer"`. Uploads watermarked PDF to `personal-scores/<buyer_user_id>/store/<order_item_id>.pdf`. Updates `gw_partner_order_items.watermarked_storage_path`.
  - Response: `{ watermarked_storage_path: string }`.

- [ ] **Step 1: Write the fn**

Create `supabase/functions/partner-watermark/index.ts`:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { order_item_id } = await req.json().catch(() => ({}));
  if (!order_item_id) return new Response(JSON.stringify({ error: "order_item_id required" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { data: item, error: itemErr } = await supa
    .from("gw_partner_order_items")
    .select("id, order_id, partner_score_id")
    .eq("id", order_item_id)
    .single();
  if (itemErr || !item) return new Response(JSON.stringify({ error: "item not found" }), { status: 404, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { data: order } = await supa
    .from("gw_partner_orders").select("id, buyer_user_id").eq("id", item.order_id).single();
  const { data: score } = await supa
    .from("gw_partner_scores").select("master_storage_path, title").eq("id", item.partner_score_id).single();
  if (!order || !score) return new Response(JSON.stringify({ error: "order or score missing" }), { status: 404, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { data: profile } = await supa
    .from("gw_profiles").select("full_name, email").eq("user_id", order.buyer_user_id).maybeSingle();
  const displayName = profile?.full_name?.trim()
    || (profile?.email ? profile.email.split("@")[0] : "GleeWorld buyer");

  // Download master PDF
  const { data: pdfBlob, error: dlErr } = await supa.storage
    .from("partner-scores-master").download(score.master_storage_path);
  if (dlErr || !pdfBlob) return new Response(JSON.stringify({ error: "master download failed" }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });

  const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
  const pdfDoc = await PDFDocument.load(bytes);
  const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const orderShort = order.id.substring(0, 8);
  const footer = `Purchased by ${displayName} · GleeWorld Order #${orderShort} · License to one performer`;

  for (const page of pdfDoc.getPages()) {
    const { width } = page.getSize();
    page.drawRectangle({
      x: 0, y: 0, width, height: 22, color: rgb(0.96, 0.96, 0.96), opacity: 0.9,
    });
    page.drawText(footer, {
      x: 12, y: 8, size: 8, font: helv, color: rgb(0.35, 0.35, 0.35),
    });
  }

  const stamped = await pdfDoc.save();
  const path = `${order.buyer_user_id}/store/${item.id}.pdf`;
  const { error: upErr } = await supa.storage
    .from("personal-scores").upload(path, stamped, {
      contentType: "application/pdf", upsert: true,
    });
  if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });

  await supa.from("gw_partner_order_items").update({ watermarked_storage_path: path }).eq("id", item.id);

  return new Response(JSON.stringify({ watermarked_storage_path: path }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
```

- [ ] **Step 2: Deploy**

```bash
scp -r ~/Documents/GitHub/gleeworld-repertoire/supabase/functions/partner-watermark \
  root@supabase.gleeworld.org:/opt/supabase/volumes/functions/
ssh root@supabase.gleeworld.org "docker restart supabase-edge-functions"
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/partner-watermark/
git commit -m "feat(partner): partner-watermark edge fn (per-buyer PDF footer stamp)"
```

---

## Task 5: `partner-webhook` edge fn — Stripe signature verify + fulfillment

**Kevin's manual step BEFORE this task's deploy:** Register the webhook endpoint URL `https://supabase.gleeworld.org/functions/v1/partner-webhook` in Stripe dashboard for event `checkout.session.completed`. Copy the signing secret into `/opt/supabase/.env` on the droplet as `STRIPE_WEBHOOK_SECRET_PARTNER=whsec_…`. If Kevin hasn't done this yet, the fn will deploy fine but webhooks will fail signature verification. Test locally with Stripe CLI first.

**Files:**
- Create: `supabase/functions/partner-webhook/index.ts`

**Interfaces:**
- Consumes: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET_PARTNER` env vars; the watermark edge fn as an internal call.
- Produces:
  - POST endpoint. Body is Stripe's raw event JSON.
  - Verifies `stripe-signature` header via `stripe.webhooks.constructEventAsync`.
  - On `checkout.session.completed`:
    1. Parse `metadata.order_id`.
    2. Read the pending order + its would-be items from the checkout session's line_items via `stripe.checkout.sessions.listLineItems` (map back to `partner_score_id` via score title lookup — OR store item ids in metadata; we use metadata).
    3. Actually cleaner: re-load the scores from DB via `gw_partner_orders.stripe_checkout_session_id` → the `payment_intent_data.metadata.order_id` matches. Then look up the price_ids we sent; because we used `price_data` inline, easier: re-derive from the ORIGINAL cart items stored in `session.metadata`. To keep this simple, we store `session.metadata.cart_score_ids` as a comma-joined list from Task 3.
    4. Update `gw_partner_orders.status='paid'`, set `paid_at`, `stripe_payment_intent_id`.
    5. For each `partner_score_id`: insert `gw_partner_order_items` (compute platform_fee = floor(price/2), payout = price - fee), then insert a `gw_store_entitlements` row (buyer_user_id, download_token = random hex, expires_at NULL), then invoke `partner-watermark` fn with the new order_item_id.
    6. For each item, insert a `gw_personal_scores` row so it appears in the buyer's My Music: `source='purchase'`, `entitlement_id=<new>`, `storage_path` = watermarked path (may still be NULL if watermark hasn't finished — fine; UI polls).
    7. Response 200 to Stripe.

- [ ] **Step 1: Update Task 3 to include `cart_score_ids` in session metadata**

Confirm Task 3's `partner-checkout-create` sets `metadata.cart_score_ids = published.map(s => s.id).join(',')`. If not, adjust and redeploy Task 3 before proceeding.

Modify `supabase/functions/partner-checkout-create/index.ts` — in the `stripe.checkout.sessions.create` call's `metadata` block:
```typescript
metadata: {
  order_id: order.id,
  partner_id: partnerId,
  buyer_user_id: userData.user.id,
  cart_score_ids: published.map(s => s.id).join(','),
},
```
Redeploy the checkout fn.

- [ ] **Step 2: Write the webhook fn**

Create `supabase/functions/partner-webhook/index.ts`:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.25.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET_PARTNER") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const sig = req.headers.get("stripe-signature") ?? "";
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, WEBHOOK_SECRET);
  } catch (e) {
    return new Response(`sig verify failed: ${e instanceof Error ? e.message : String(e)}`, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    // v1 handles only the paid event. Ignore refunds etc. (Phase 3).
    return new Response("ignored", { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.order_id;
  const buyerUserId = session.metadata?.buyer_user_id;
  const partnerId = session.metadata?.partner_id;
  const cartScoreIds = (session.metadata?.cart_score_ids ?? "").split(",").filter(Boolean);
  if (!orderId || !buyerUserId || !partnerId || cartScoreIds.length === 0) {
    return new Response("missing metadata", { status: 400 });
  }

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Load scores for pricing.
  const { data: scores, error: scoresErr } = await supa
    .from("gw_partner_scores")
    .select("id, price_cents, title, master_storage_path")
    .in("id", cartScoreIds);
  if (scoresErr || !scores || scores.length !== cartScoreIds.length) {
    return new Response("scores missing", { status: 500 });
  }

  // Mark order paid.
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent : session.payment_intent?.id;
  await supa.from("gw_partner_orders").update({
    status: "paid",
    paid_at: new Date().toISOString(),
    stripe_payment_intent_id: paymentIntentId ?? null,
  }).eq("id", orderId);

  // Fulfill each item.
  for (const score of scores) {
    const price = score.price_cents;
    const platformFee = Math.floor(price / 2);
    const payout = price - platformFee;

    // Idempotency: skip if item already exists for (order_id, partner_score_id).
    const { data: existing } = await supa
      .from("gw_partner_order_items")
      .select("id")
      .eq("order_id", orderId)
      .eq("partner_score_id", score.id)
      .maybeSingle();
    if (existing) continue;

    // Entitlement row.
    const downloadToken = crypto.randomUUID().replace(/-/g, "");
    const { data: ent } = await supa
      .from("gw_store_entitlements")
      .insert({ buyer_user_id: buyerUserId, download_token: downloadToken })
      .select("id")
      .single();

    // Order item.
    const { data: item } = await supa
      .from("gw_partner_order_items")
      .insert({
        order_id: orderId,
        partner_score_id: score.id,
        partner_id: partnerId,
        price_cents: price,
        platform_fee_cents: platformFee,
        partner_payout_cents: payout,
        entitlement_id: ent?.id ?? null,
      })
      .select("id")
      .single();
    if (!item) continue;

    // Trigger watermarking asynchronously — Stripe expects us to return
    // 200 within 20s. If watermarking is slow, the buyer's Thanks page
    // polls; when watermarked_storage_path fills, the download unlocks.
    fetch(`${SUPABASE_URL}/functions/v1/partner-watermark`, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({ order_item_id: item.id }),
    }).catch(() => {});

    // Personal music row so it appears in My Music. storage_path is filled
    // later by the watermark fn's update path? No — the watermark fn writes
    // to gw_partner_order_items, not gw_personal_scores. We write personal
    // score with external_url=null and storage_path pointing at the
    // eventual watermarked path (predictable).
    const watermarkedPath = `${buyerUserId}/store/${item.id}.pdf`;
    await supa.from("gw_personal_scores").insert({
      user_id: buyerUserId,
      title: score.title,
      source: "purchase",
      entitlement_id: ent?.id ?? null,
      storage_path: watermarkedPath, // populated once watermark finishes
    });
  }

  return new Response("ok", { status: 200 });
});
```

- [ ] **Step 3: Deploy**

```bash
scp -r ~/Documents/GitHub/gleeworld-repertoire/supabase/functions/partner-webhook \
  root@supabase.gleeworld.org:/opt/supabase/volumes/functions/
ssh root@supabase.gleeworld.org "docker restart supabase-edge-functions"
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/partner-webhook/ supabase/functions/partner-checkout-create/
git commit -m "feat(partner): partner-webhook fulfillment + cart_score_ids metadata"
```

---

## Task 6: `partner-download-url` edge fn — 5-min signed URL

**Files:**
- Create: `supabase/functions/partner-download-url/index.ts`

**Interfaces:**
- Consumes: service-role client.
- Produces:
  - POST body `{ order_item_id: string }`.
  - Auth: buyer JWT required; verify caller owns the parent order.
  - Behavior: check `watermarked_storage_path` is set; create signed URL via `supa.storage.from('personal-scores').createSignedUrl(path, 300)`; insert `gw_partner_downloads` row for audit; return `{ url: string, expires_in: 300 }`.
  - Errors: 403 if not the buyer, 404 if item not found, 425 (Too Early) if `watermarked_storage_path` is still NULL.

- [ ] **Step 1: Write the fn**

Create `supabase/functions/partner-download-url/index.ts`:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: userData } = await supa.auth.getUser(jwt);
  if (!userData.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { order_item_id } = await req.json().catch(() => ({}));
  if (!order_item_id) return new Response(JSON.stringify({ error: "order_item_id required" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { data: item, error: itemErr } = await supa
    .from("gw_partner_order_items")
    .select("id, order_id, watermarked_storage_path")
    .eq("id", order_item_id)
    .single();
  if (itemErr || !item) return new Response(JSON.stringify({ error: "item not found" }), { status: 404, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { data: order } = await supa
    .from("gw_partner_orders").select("buyer_user_id, status").eq("id", item.order_id).single();
  if (!order || order.buyer_user_id !== userData.user.id) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
  if (order.status !== "paid") {
    return new Response(JSON.stringify({ error: "order not paid" }), { status: 402, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
  if (!item.watermarked_storage_path) {
    return new Response(JSON.stringify({ error: "watermark still processing, try again shortly" }), { status: 425, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  const { data: signed, error: signErr } = await supa.storage
    .from("personal-scores")
    .createSignedUrl(item.watermarked_storage_path, 300);
  if (signErr || !signed) {
    return new Response(JSON.stringify({ error: "sign failed" }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  // Audit — best-effort; failure doesn't block the download.
  await supa.from("gw_partner_downloads").insert({
    order_item_id: item.id,
    user_agent: req.headers.get("user-agent"),
  });

  return new Response(JSON.stringify({ url: signed.signedUrl, expires_in: 300 }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
```

- [ ] **Step 2: Deploy**

```bash
scp -r ~/Documents/GitHub/gleeworld-repertoire/supabase/functions/partner-download-url \
  root@supabase.gleeworld.org:/opt/supabase/volumes/functions/
ssh root@supabase.gleeworld.org "docker restart supabase-edge-functions"
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/partner-download-url/
git commit -m "feat(partner): partner-download-url edge fn (5-min signed URL + audit log)"
```

---

## Task 7: Client API + cart context

**Files:**
- Create: `src/lib/store/api.ts`
- Create: `src/components/store/CartContext.tsx`
- Create: `src/lib/store/__tests__/api.test.ts`

**Interfaces:**
- Consumes: `supabase` client, existing `gw_partner_scores` and `gw_partners` types (redefine minimally locally).
- Produces:
  - `type StoreScoreRow` — subset of `gw_partner_scores` + `partner_display_name` joined.
  - `useStoreScores({partnerId?})` — reads `gw_partner_scores` where `status='published'`, joins `gw_partners` for display_name via a foreign key `.select('*, partner:gw_partners(display_name, logo_storage_path)')`.
  - `useStoreScore(id)` — single score.
  - `useStorePartner(id)` — partner public view via `gw_partners_public` view.
  - `useCreateCheckout()` — mutation calling `partner-checkout-create`.
  - `useOrderStatus(orderId)` — polls `gw_partner_orders + gw_partner_order_items` every 3s.
  - `useDownloadUrl()` — mutation calling `partner-download-url`.
  - `platformFeeCents(priceCents: number): number` — `Math.floor(priceCents/2)` (redeclared for tests).
  - `<CartProvider>` + `useCart()` — cart state via React Context + localStorage persistence. Enforces single-partner rule: `addToCart(item)` returns `{ ok: boolean; reason?: 'multiple_partners' }`.

- [ ] **Step 1: Write failing test**

Create `src/lib/store/__tests__/api.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { platformFeeCents } from '../api';

describe('store fee math', () => {
  it('takes exactly 50% platform fee', () => {
    expect(platformFeeCents(1000)).toBe(500);
  });
  it('rounds odd cents down', () => {
    expect(platformFeeCents(999)).toBe(499);
  });
  it('sums with payout to price', () => {
    for (const p of [100, 250, 799, 1234, 4999]) {
      expect(platformFeeCents(p) + (p - platformFeeCents(p))).toBe(p);
    }
  });
});
```

- [ ] **Step 2: Confirm PASS after implementing `api.ts`**

Create `src/lib/store/api.ts`:

```typescript
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StoreScoreRow {
  id: string;
  partner_id: string;
  title: string;
  composer: string | null;
  arranger: string | null;
  voicing: string | null;
  ensemble_type: string | null;
  difficulty_grade: string | null;
  description: string | null;
  tags: string[] | null;
  price_cents: number;
  currency: string;
  thumbnail_storage_path: string | null;
  sample_audio_storage_path: string | null;
  page_count: number | null;
  status: string;
  partner: { display_name: string; logo_storage_path: string | null } | null;
}

export interface StorePartner {
  id: string;
  display_name: string;
  bio: string | null;
  website_url: string | null;
  logo_storage_path: string | null;
  status: string;
}

export interface OrderStatusRow {
  id: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partial_refund';
  items: Array<{
    id: string;
    partner_score_id: string;
    watermarked_storage_path: string | null;
    title?: string | null;
  }>;
}

export function platformFeeCents(priceCents: number): number {
  return Math.floor(priceCents / 2);
}

export function useStoreScores(params?: { partnerId?: string }): UseQueryResult<StoreScoreRow[]> {
  return useQuery({
    queryKey: ['store-scores', params?.partnerId ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('gw_partner_scores')
        .select('*, partner:gw_partners(display_name, logo_storage_path)')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (params?.partnerId) q = q.eq('partner_id', params.partnerId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as StoreScoreRow[];
    },
  });
}

export function useStoreScore(id: string | undefined): UseQueryResult<StoreScoreRow | null> {
  return useQuery({
    queryKey: ['store-score', id ?? ''],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('gw_partner_scores')
        .select('*, partner:gw_partners(display_name, logo_storage_path)')
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle();
      if (error) throw error;
      return (data as StoreScoreRow | null) ?? null;
    },
  });
}

export function useStorePartner(id: string | undefined): UseQueryResult<StorePartner | null> {
  return useQuery({
    queryKey: ['store-partner', id ?? ''],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('gw_partners_public')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data as StorePartner | null) ?? null;
    },
  });
}

export function useCreateCheckout(): UseMutationResult<{ url: string; order_id: string }, Error, { partner_score_ids: string[] }> {
  return useMutation({
    mutationFn: async ({ partner_score_ids }) => {
      const { data, error } = await supabase.functions.invoke<{ url: string; order_id: string }>(
        'partner-checkout-create',
        { body: { items: partner_score_ids.map((id) => ({ partner_score_id: id })) } },
      );
      if (error) throw error;
      if (!data) throw new Error('empty response');
      return data;
    },
  });
}

export function useOrderStatus(orderId: string | undefined): UseQueryResult<OrderStatusRow | null> {
  return useQuery({
    queryKey: ['order-status', orderId ?? ''],
    enabled: !!orderId,
    refetchInterval: (data) => {
      const d = data as unknown as OrderStatusRow | null;
      if (!d) return 3000;
      const allReady = d.status === 'paid' && d.items.every((i) => !!i.watermarked_storage_path);
      return allReady ? false : 3000;
    },
    queryFn: async () => {
      if (!orderId) return null;
      const { data: order, error } = await supabase
        .from('gw_partner_orders')
        .select('id, status')
        .eq('id', orderId)
        .maybeSingle();
      if (error) throw error;
      if (!order) return null;
      const { data: items } = await supabase
        .from('gw_partner_order_items')
        .select('id, partner_score_id, watermarked_storage_path')
        .eq('order_id', orderId);
      const enriched = (items ?? []).map((i) => ({ ...i }));
      return {
        id: order.id,
        status: order.status as OrderStatusRow['status'],
        items: enriched as OrderStatusRow['items'],
      };
    },
  });
}

export function useDownloadUrl(): UseMutationResult<{ url: string }, Error, { order_item_id: string }> {
  return useMutation({
    mutationFn: async ({ order_item_id }) => {
      const { data, error } = await supabase.functions.invoke<{ url: string }>(
        'partner-download-url',
        { body: { order_item_id } },
      );
      if (error) throw error;
      if (!data) throw new Error('empty response');
      return data;
    },
  });
}
```

- [ ] **Step 3: Write `CartContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { StoreScoreRow } from '@/lib/store/api';

interface CartItem { id: string; partner_id: string; title: string; price_cents: number; }

interface CartAPI {
  items: CartItem[];
  addItem: (row: StoreScoreRow) => { ok: boolean; reason?: 'multiple_partners' };
  removeItem: (id: string) => void;
  clear: () => void;
  subtotalCents: number;
  partnerId: string | null;
}

const CartContext = createContext<CartAPI | null>(null);
const STORAGE_KEY = 'gw_partner_cart_v1';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) as CartItem[] : [];
    } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* private mode */ }
  }, [items]);

  const value = useMemo<CartAPI>(() => ({
    items,
    partnerId: items[0]?.partner_id ?? null,
    subtotalCents: items.reduce((s, i) => s + i.price_cents, 0),
    addItem: (row) => {
      if (items.some((i) => i.id === row.id)) return { ok: true };
      if (items.length > 0 && items[0].partner_id !== row.partner_id) {
        return { ok: false, reason: 'multiple_partners' };
      }
      setItems((prev) => [...prev, {
        id: row.id, partner_id: row.partner_id, title: row.title, price_cents: row.price_cents,
      }]);
      return { ok: true };
    },
    removeItem: (id) => setItems((prev) => prev.filter((x) => x.id !== id)),
    clear: () => setItems([]),
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartAPI {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
```

- [ ] **Step 4: Run tests**

```bash
cd ~/Documents/GitHub/gleeworld-repertoire
npx vitest run src/lib/store/__tests__/api.test.ts
```

Expected: 3/3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/store/ src/components/store/CartContext.tsx
git commit -m "feat(store): api hooks + cart context with single-partner enforcement"
```

---

## Task 8: `StorePage.tsx` — landing + browse

**Files:**
- Create: `src/pages/store/StorePage.tsx`

**Interfaces:**
- Consumes: `useStoreScores`, `useCart`, `CartProvider` (wrap at route level in Task 14).
- Produces: browse UI — grid of score cards with thumbnail, title, composer, price, "View" button.

- [ ] **Step 1: Write the page**

```tsx
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { useStoreScores } from '@/lib/store/api';

const ASSETS_BUCKET = 'partner-assets';

export default function StorePage() {
  const { data: scores, isLoading } = useStoreScores();
  const thumbUrl = (path: string | null) =>
    path ? supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path).data.publicUrl : null;

  return (
    <DashboardPageShell
      title="Composer Store"
      subtitle="Buy sheet music directly from independent composers and publishers."
      maxWidth="6xl"
    >
      {isLoading && <p className="text-sm text-slate-600">Loading…</p>}
      {scores && scores.length === 0 && (
        <p className="text-sm text-slate-600">No scores in the store yet. Composers publish scores from their portal.</p>
      )}
      {scores && scores.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {scores.map((s) => (
            <Link key={s.id} to={`/store/scores/${s.id}`} className="block">
              <Card className="hover:border-slate-400 transition-colors">
                <CardContent className="p-3">
                  <div className="aspect-[3/4] rounded bg-slate-50 border overflow-hidden mb-3 flex items-center justify-center">
                    {thumbUrl(s.thumbnail_storage_path) ? (
                      <img src={thumbUrl(s.thumbnail_storage_path)!} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-xs text-slate-400">No thumbnail</span>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-xs text-slate-600 truncate">{s.composer ?? '—'} · {s.partner?.display_name ?? 'Composer'}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-semibold text-slate-900">${(s.price_cents / 100).toFixed(2)}</span>
                    {s.voicing && <Badge variant="outline" className="text-xs">{s.voicing}</Badge>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </DashboardPageShell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/store/StorePage.tsx
git commit -m "feat(store): StorePage — browse published composer scores"
```

---

## Task 9: `StoreScoreDetail.tsx` — score page with Buy Now

**Files:**
- Create: `src/pages/store/StoreScoreDetail.tsx`

**Interfaces:**
- Consumes: `useStoreScore(id)`, `useCart`, `useCreateCheckout`.
- Produces: single-score detail with Add to Cart + Buy Now (direct checkout, adds+checks-out).

- [ ] **Step 1: Write the page**

```tsx
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ShoppingCart, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { useStoreScore, useCreateCheckout } from '@/lib/store/api';
import { useCart } from '@/components/store/CartContext';

const ASSETS_BUCKET = 'partner-assets';

export default function StoreScoreDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: score, isLoading } = useStoreScore(id);
  const cart = useCart();
  const checkout = useCreateCheckout();

  if (isLoading) return <DashboardPageShell title="Store"><p className="text-sm text-slate-600">Loading…</p></DashboardPageShell>;
  if (!score) return <DashboardPageShell title="Store"><p className="text-sm text-slate-600">Score not found.</p></DashboardPageShell>;

  const thumbUrl = score.thumbnail_storage_path
    ? supabase.storage.from(ASSETS_BUCKET).getPublicUrl(score.thumbnail_storage_path).data.publicUrl
    : null;

  const add = () => {
    const res = cart.addItem(score);
    if (!res.ok && res.reason === 'multiple_partners') {
      toast.error('Complete your current partner purchase first, then start a new cart.');
      return;
    }
    toast.success('Added to cart');
  };

  const buyNow = async () => {
    const res = cart.addItem(score);
    if (!res.ok) { toast.error('Cart conflict — check current cart first.'); return; }
    try {
      const r = await checkout.mutateAsync({ partner_score_ids: cart.items.map(i => i.id).concat([score.id]).filter((v, i, arr) => arr.indexOf(v) === i) });
      window.location.href = r.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Checkout failed');
    }
  };

  return (
    <DashboardPageShell title={score.title} subtitle={`by ${score.composer ?? score.partner?.display_name ?? 'composer'}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="aspect-[3/4] rounded bg-slate-50 border overflow-hidden flex items-center justify-center">
              {thumbUrl ? <img src={thumbUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-xs text-slate-400">No thumbnail</span>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap gap-1">
              {score.voicing && <Badge variant="outline" className="text-xs">{score.voicing}</Badge>}
              {score.ensemble_type && <Badge variant="outline" className="text-xs">{score.ensemble_type}</Badge>}
              {score.difficulty_grade && <Badge variant="outline" className="text-xs">{score.difficulty_grade}</Badge>}
              {typeof score.page_count === 'number' && <Badge variant="outline" className="text-xs">{score.page_count} pages</Badge>}
            </div>
            {score.description && <p className="text-sm text-slate-700 whitespace-pre-wrap">{score.description}</p>}
            <div>
              <p className="text-2xl font-bold">${(score.price_cents / 100).toFixed(2)}</p>
              <p className="text-xs text-slate-500">50% goes to the composer.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={buyNow} disabled={checkout.isPending}>Buy now</Button>
              <Button variant="outline" onClick={add}>
                <ShoppingCart className="w-4 h-4 mr-1" /> Add to cart
              </Button>
            </div>
            {score.partner_id && (
              <button
                type="button"
                onClick={() => navigate(`/store/partners/${score.partner_id}`)}
                className="text-xs text-slate-600 hover:underline inline-flex items-center gap-1"
              >
                More by {score.partner?.display_name} <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardPageShell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/store/StoreScoreDetail.tsx
git commit -m "feat(store): StoreScoreDetail with Buy Now + Add to Cart"
```

---

## Task 10: `StorePartnerPage.tsx` — composer storefront

**Files:**
- Create: `src/pages/store/StorePartnerPage.tsx`

**Interfaces:**
- Consumes: `useParams`, `useStorePartner`, `useStoreScores({partnerId})`.

- [ ] **Step 1: Write the page**

```tsx
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { useStorePartner, useStoreScores } from '@/lib/store/api';

const ASSETS_BUCKET = 'partner-assets';

export default function StorePartnerPage() {
  const { id } = useParams<{ id: string }>();
  const { data: partner } = useStorePartner(id);
  const { data: scores } = useStoreScores({ partnerId: id });

  const logo = partner?.logo_storage_path
    ? supabase.storage.from(ASSETS_BUCKET).getPublicUrl(partner.logo_storage_path).data.publicUrl
    : null;

  return (
    <DashboardPageShell title={partner?.display_name ?? 'Composer'}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm flex items-start gap-4">
          {logo ? (
            <img src={logo} alt="" className="w-20 h-20 rounded border object-cover" />
          ) : (
            <div className="w-20 h-20 rounded border bg-muted" />
          )}
          <div className="min-w-0">
            <p className="text-lg font-semibold">{partner?.display_name ?? '—'}</p>
            {partner?.bio && <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{partner.bio}</p>}
            {partner?.website_url && (
              <a href={partner.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
                {partner.website_url}
              </a>
            )}
          </div>
        </div>

        <p className="text-xs uppercase tracking-widest text-slate-500">Scores</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(scores ?? []).map((s) => (
            <Link key={s.id} to={`/store/scores/${s.id}`}>
              <Card className="hover:border-slate-400">
                <CardContent className="p-3">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-xs text-slate-600 truncate">{s.voicing ?? '—'}</p>
                  <p className="text-sm font-semibold mt-1">${(s.price_cents / 100).toFixed(2)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
          {scores && scores.length === 0 && (
            <p className="text-sm text-slate-600 col-span-full">No published scores yet.</p>
          )}
        </div>
      </div>
    </DashboardPageShell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/store/StorePartnerPage.tsx
git commit -m "feat(store): StorePartnerPage — composer storefront"
```

---

## Task 11: `CartDrawer.tsx`

**Files:**
- Create: `src/components/store/CartDrawer.tsx`

**Interfaces:**
- Consumes: `useCart`, `useCreateCheckout`.

- [ ] **Step 1: Write the drawer**

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ShoppingCart, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/components/store/CartContext';
import { useCreateCheckout, platformFeeCents } from '@/lib/store/api';

export function CartDrawer() {
  const cart = useCart();
  const checkout = useCreateCheckout();
  const subtotal = cart.subtotalCents;
  const fee = platformFeeCents(subtotal);

  const goCheckout = async () => {
    if (cart.items.length === 0) return;
    try {
      const r = await checkout.mutateAsync({ partner_score_ids: cart.items.map(i => i.id) });
      window.location.href = r.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Checkout failed');
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full">
          <ShoppingCart className="w-4 h-4 mr-1" /> Cart ({cart.items.length})
        </Button>
      </SheetTrigger>
      <SheetContent className="w-96">
        <SheetHeader><SheetTitle>Cart</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          {cart.items.length === 0 && (
            <p className="text-sm text-slate-600">Your cart is empty.</p>
          )}
          {cart.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <p className="truncate">{it.title}</p>
                <p className="text-xs text-slate-500">${(it.price_cents / 100).toFixed(2)}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => cart.removeItem(it.id)} aria-label="Remove">
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {cart.items.length > 0 && (
            <>
              <div className="border-t pt-3 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>${(subtotal / 100).toFixed(2)}</span></div>
                <div className="flex justify-between text-xs text-slate-500"><span>Composer receives</span><span>${((subtotal - fee) / 100).toFixed(2)}</span></div>
              </div>
              <Button className="w-full rounded-full" onClick={goCheckout} disabled={checkout.isPending}>
                {checkout.isPending ? 'Opening Stripe…' : 'Checkout'}
              </Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={cart.clear}>Clear cart</Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/store/CartDrawer.tsx
git commit -m "feat(store): CartDrawer with checkout button + fee breakdown"
```

---

## Task 12: `StoreThanksPage.tsx` — polling + download

**Files:**
- Create: `src/pages/store/StoreThanksPage.tsx`

**Interfaces:**
- Consumes: `useOrderStatus(orderId)`, `useDownloadUrl()`, `useCart` (to clear on landing).

- [ ] **Step 1: Write the page**

```tsx
import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Check, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { useOrderStatus, useDownloadUrl } from '@/lib/store/api';
import { useCart } from '@/components/store/CartContext';

export default function StoreThanksPage() {
  const [params] = useSearchParams();
  const orderId = params.get('order') ?? undefined;
  const { data: order } = useOrderStatus(orderId);
  const cart = useCart();
  const dl = useDownloadUrl();

  // Clear the cart once we've confirmed the order is paid.
  useEffect(() => {
    if (order && order.status === 'paid') cart.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status]);

  const download = async (item_id: string) => {
    try {
      const r = await dl.mutateAsync({ order_item_id: item_id });
      window.location.href = r.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed');
    }
  };

  if (!orderId) {
    return <DashboardPageShell title="Thanks"><p className="text-sm text-slate-600">Missing order id.</p></DashboardPageShell>;
  }

  const isPaid = order?.status === 'paid';

  return (
    <DashboardPageShell title="Thanks for your purchase" subtitle="We're preparing your scores.">
      <Card>
        <CardContent className="p-4 space-y-3">
          {!isPaid && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin" /> Confirming payment…
            </div>
          )}
          {isPaid && (
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <Check className="w-4 h-4" /> Payment confirmed.
            </div>
          )}
          {isPaid && order && order.items.length === 0 && (
            <p className="text-sm text-slate-600">Preparing your files…</p>
          )}
          {isPaid && order && order.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-2 border-t pt-3">
              <p className="text-sm">Item {it.id.slice(0, 8)}</p>
              {it.watermarked_storage_path ? (
                <Button size="sm" onClick={() => download(it.id)}>
                  <Download className="w-4 h-4 mr-1" /> Download PDF
                </Button>
              ) : (
                <span className="text-xs text-slate-500 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Watermarking…</span>
              )}
            </div>
          ))}
          <div className="pt-3 border-t flex gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/dashboard/music-library">Open My Music</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/store">Back to store</Link></Button>
          </div>
        </CardContent>
      </Card>
    </DashboardPageShell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/store/StoreThanksPage.tsx
git commit -m "feat(store): StoreThanksPage with polling + download"
```

---

## Task 13: Partner publish toggle

**Files:**
- Modify: `src/pages/partner/PartnerScoresList.tsx`

**Interfaces:**
- Adds a Publish / Unpublish button per score row, flipping `gw_partner_scores.status` between `draft` and `published`.

- [ ] **Step 1: Update the file**

Read `src/pages/partner/PartnerScoresList.tsx`. Add:
1. A `useUpdatePartnerScoreStatus()` mutation in `src/lib/partner/api.ts` (append):

```typescript
export function useUpdatePartnerScoreStatus(): UseMutationResult<{ id: string; status: string }, Error, { id: string; status: 'draft' | 'published' | 'unlisted' | 'removed' }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { data, error } = await supabase
        .from('gw_partner_scores')
        .update({ status })
        .eq('id', id)
        .select('id, status')
        .single();
      if (error) throw error;
      return data as { id: string; status: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-partner-scores'] }),
  });
}
```

2. In `PartnerScoresList.tsx`, next to the badge, render a button:
```tsx
<Button
  size="sm"
  variant={s.status === 'published' ? 'outline' : 'default'}
  onClick={() => updateStatus.mutate({ id: s.id, status: s.status === 'published' ? 'draft' : 'published' })}
>
  {s.status === 'published' ? 'Unpublish' : 'Publish'}
</Button>
```

Where `const updateStatus = useUpdatePartnerScoreStatus();` at the top of the component.

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/partner/PartnerScoresList.tsx src/lib/partner/api.ts
git commit -m "feat(partner): publish / unpublish toggle in scores list"
```

---

## Task 14: Routes + nav entry

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/lib/navigation/navCatalog.ts`
- Modify: `src/lib/navigation/__tests__/appDestinations.test.ts`

**Interfaces:**
- Consumes: `StorePage`, `StoreScoreDetail`, `StorePartnerPage`, `StoreThanksPage`, `CartProvider`.
- Produces: routes `/store`, `/store/scores/:id`, `/store/partners/:id`, `/store/thanks`.

- [ ] **Step 1: Add lazy imports + wrap the whole store subtree in `<CartProvider>`**

In `src/App.tsx`:

```tsx
const StorePage = lazy(() => import("./pages/store/StorePage"));
const StoreScoreDetail = lazy(() => import("./pages/store/StoreScoreDetail"));
const StorePartnerPage = lazy(() => import("./pages/store/StorePartnerPage"));
const StoreThanksPage = lazy(() => import("./pages/store/StoreThanksPage"));
```

And:

```tsx
import { CartProvider } from "./components/store/CartContext";
```

Add 4 routes wrapped in CartProvider (one shared CartProvider covers all `/store/*`):

```tsx
<Route
  path="/store"
  element={
    <ProtectedRoute>
      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
        <DashboardShell>
          <CartProvider><StorePage /></CartProvider>
        </DashboardShell>
      </UniversalLayout>
    </ProtectedRoute>
  }
/>
<Route
  path="/store/scores/:id"
  element={
    <ProtectedRoute>
      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
        <DashboardShell>
          <CartProvider><StoreScoreDetail /></CartProvider>
        </DashboardShell>
      </UniversalLayout>
    </ProtectedRoute>
  }
/>
<Route
  path="/store/partners/:id"
  element={
    <ProtectedRoute>
      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
        <DashboardShell>
          <CartProvider><StorePartnerPage /></CartProvider>
        </DashboardShell>
      </UniversalLayout>
    </ProtectedRoute>
  }
/>
<Route
  path="/store/thanks"
  element={
    <ProtectedRoute>
      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
        <DashboardShell>
          <CartProvider><StoreThanksPage /></CartProvider>
        </DashboardShell>
      </UniversalLayout>
    </ProtectedRoute>
  }
/>
```

Note: existing `/store` route exists elsewhere in App.tsx (grep for `path="/store"`) — verify it does NOT collide. If it does, rename the existing to `/store/legacy` or note the conflict; do not silently override.

- [ ] **Step 2: Add nav entry**

In `src/lib/navigation/navCatalog.ts`, add in the `music` section near `music-library`:

```typescript
{ key: 'composer-store', to: '/store', label: 'Composer Store', icon: Store, section: 'music', tone: 'bg-emerald-50 text-emerald-700', tourId: 'nav-composer-store' },
```

- [ ] **Step 3: Add to KNOWN_ROUTES**

In `src/lib/navigation/__tests__/appDestinations.test.ts`, add `/store`.

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/lib/navigation/navCatalog.ts src/lib/navigation/__tests__/appDestinations.test.ts
git commit -m "feat(store): /store routes + Composer Store nav entry"
```

---

## Task 15: Deploy + smoke

**Kevin's manual steps required BEFORE full end-to-end works:**
- Register webhook `https://supabase.gleeworld.org/functions/v1/partner-webhook` in Stripe dashboard for `checkout.session.completed`. Save signing secret to `/opt/supabase/.env` as `STRIPE_WEBHOOK_SECRET_PARTNER`.
- Ensure at least one partner has completed Stripe Connect Express onboarding (Sub-plan 1 flow) AND has at least one published score (Task 13 toggle).

- [ ] **Step 1: Push + deploy**

```bash
cd ~/Documents/GitHub/gleeworld-repertoire
git push
bash scripts/deploy-frontend.sh
```

- [ ] **Step 2: Verify DB + edge fns**

```bash
ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres \
  -c '\\d gw_partner_orders' \
  -c '\\d gw_partner_order_items' \
  -c '\\d gw_partner_downloads'"

ssh root@supabase.gleeworld.org "ls /opt/supabase/volumes/functions/ | grep -E 'partner-(checkout|webhook|watermark|download)'"
```

- [ ] **Step 3: End-to-end smoke — Stripe test mode**

1. Publish a $2.00 test score as a test partner.
2. Sign in as a different user (buyer). Navigate to `/store`. See the score.
3. Click score → detail. Click "Buy Now". Redirects to Stripe Checkout.
4. Enter test card `4242 4242 4242 4242`, any future date, any CVC. Complete.
5. Redirects back to `/store/thanks?order=<id>`. See polling → "Payment confirmed" → item watermarking → Download PDF button.
6. Click Download → 5-min signed URL fires; PDF opens with footer text `Purchased by <buyer name> · GleeWorld Order #<id short> · License to one performer`.
7. Navigate to `/dashboard/music-library`, My Music tab — verify a new row appears with the purchased title, source badge "purchase".
8. Verify Stripe dashboard shows: `application_fee_amount = 100` (50% of $2.00), partner's connected account credited with $1.00.

- [ ] **Step 4: Human QA — Kevin**

Verify the full flow with a real test card in Stripe test mode.

- [ ] **Step 5: Update memory**

Append to `project_partner_marketplace.md`:

```
Sub-plan 2 (Store + Purchase) SHIPPED YYYY-MM-DD.
- /store, /store/scores/:id, /store/partners/:id, /store/thanks.
- CartProvider client-side, single-partner enforcement.
- partner-checkout-create + partner-webhook + partner-watermark + partner-download-url edge fns.
- gw_partner_orders + gw_partner_order_items + gw_partner_downloads tables.
- Stripe application_fee_amount = 50%. transfer_data.destination = partner Connect id.
- Watermark: 'Purchased by <buyer> · GleeWorld Order #<8chars> · License to one performer' on every page.
- 5-min signed URLs. Master PDFs never served.
```

- [ ] **Step 6: Empty ceremony commit + push**

```bash
git commit --allow-empty -m "chore(store): Sub-plan 2 shipped"
git push
```

---

## Follow-ups (out of scope for Sub-plan 2)

- **Multi-partner cart** — currently blocked. Requires Stripe Connect Destination Charges or separate sessions per partner.
- **Refunds UI + partial refunds** — Phase 3 admin surface + webhook events (`charge.refunded`).
- **Coupon / promo codes**.
- **Sample audio playback on score detail** — v1 shows description only.
- **Watermark retry queue** — currently the webhook fires the watermark fn once fire-and-forget. Failures produce a stuck "Watermarking…" state. Follow-up: `gw_job_queue` retry.
- **Buyer-visible order history at `/dashboard/orders`** — buyers currently see purchases only in My Music. A dedicated order history page is Phase 3.
- **Discovery integration** — Sub-plan 3 will surface store scores inside `/dashboard/repertoire` via `repertoire_search()`.
- **iOS in-app purchase** — Stripe Checkout inside the WebView works but Apple requires IAP for digital goods in native apps. Follow-up post-launch.
- **Server-side price recompute** — current webhook re-reads `price_cents` from DB; if a partner changes price between session creation and webhook fulfillment, the price_cents recorded on the order_item is the CURRENT DB value, not the one the buyer saw at checkout. Follow-up: snapshot price into checkout session metadata.
