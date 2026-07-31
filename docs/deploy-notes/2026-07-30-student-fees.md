# Student Fees — Deploy Runbook (2026-07-30)

> **Operator:** Kevin Johnson  
> **Branch:** `student-fees` (HEAD `e16a73805`)  
> **Self-hosted Supabase:** `supabase.gleeworld.org`  
> **App droplet:** same as GleeWorld production (standard rsync target)  
> **Claude harness blocks prod DB writes** — run every `!`-marked step yourself in your own Terminal.

---

## Pre-flight check

Before you touch anything, confirm the current HEAD on the droplet matches main:

```bash
# On the app droplet
git -C ~/Documents/GitHub/gleeworld rev-parse HEAD
```

And verify the self-hosted Supabase is healthy:

```bash
curl -s https://supabase.gleeworld.org/rest/v1/ | head -c 120
```

---

## Step 0 — Data-risk check (REQUIRED before migrations)

The rename migration converts `gw_dues_records.status = 'payment_plan'` to the new
schema where the equivalent status value is `'partial'`. If any live rows use the
old value, backfill them first or they will violate the new CHECK constraint.

```sql
-- Run on prod via psql / Supabase Studio SQL editor:
SELECT COUNT(*) FROM gw_dues_records WHERE status = 'payment_plan';
```

**If the count > 0**, run this backfill BEFORE applying any migration:

```sql
UPDATE gw_dues_records
SET    status = 'partial'
WHERE  status = 'payment_plan';
```

If the count = 0, skip the backfill and proceed directly to Step 1.

---

## Step 1 — Apply migrations (in order)

Apply each file via `psql` as the Postgres superuser on `supabase.gleeworld.org`,
or paste into Supabase Studio → SQL Editor (run each one individually in order).

**Migration files (relative to repo root):**

```
supabase/migrations/20260730120000_student_fees.sql
supabase/migrations/20260730130000_assign_fee_template_rpc.sql
supabase/migrations/20260730140000_parent_trigger_order.sql
supabase/migrations/20260730150000_propagate_template_edits.sql
supabase/migrations/20260730160000_fee_payment_rpcs.sql
```

**Via psql (recommended):**

```bash
# On the droplet or from a machine with psql access to supabase.gleeworld.org:
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  -h supabase.gleeworld.org -p 5432 -U postgres -d postgres \
  -f supabase/migrations/20260730120000_student_fees.sql

PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  -h supabase.gleeworld.org -p 5432 -U postgres -d postgres \
  -f supabase/migrations/20260730130000_assign_fee_template_rpc.sql

PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  -h supabase.gleeworld.org -p 5432 -U postgres -d postgres \
  -f supabase/migrations/20260730140000_parent_trigger_order.sql

PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  -h supabase.gleeworld.org -p 5432 -U postgres -d postgres \
  -f supabase/migrations/20260730150000_propagate_template_edits.sql

PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  -h supabase.gleeworld.org -p 5432 -U postgres -d postgres \
  -f supabase/migrations/20260730160000_fee_payment_rpcs.sql
```

**Verify the rename landed:**

```sql
SELECT table_name
FROM   information_schema.tables
WHERE  table_schema = 'public'
  AND  table_name IN (
         'gw_student_fees','gw_fee_templates','gw_fee_template_installments',
         'gw_fee_payment_plans','gw_fee_plan_installments',
         'gw_fee_reminders','gw_tenant_fee_settings'
       )
ORDER BY table_name;
-- expect 7 rows
```

**Verify old names are gone:**

```sql
SELECT table_name
FROM   information_schema.tables
WHERE  table_schema = 'public'
  AND  table_name IN ('gw_dues_records','gw_dues_payment_plans','gw_dues_installments','gw_dues_reminders');
-- expect 0 rows
```

---

## Step 2 — Deploy edge functions

Real functions directory on the droplet: `/opt/supabase/volumes/functions/`
(per `reference_edge_fn_deploy.md` — never `/opt/supabase/supabase/functions/`).

### 2a — Remove old dues functions (if present)

```bash
ssh root@supabase.gleeworld.org \
  "rm -rf /opt/supabase/volumes/functions/create-dues-payment \
           /opt/supabase/volumes/functions/verify-dues-payment"
```

### 2b — scp new functions

From your local repo root (`~/Documents/GitHub/gleeworld-student-fees` or
after merging into the main gleeworld repo):

```bash
scp -r supabase/functions/create-fee-payment \
        root@supabase.gleeworld.org:/opt/supabase/volumes/functions/

scp -r supabase/functions/verify-fee-payment \
        root@supabase.gleeworld.org:/opt/supabase/volumes/functions/

scp -r supabase/functions/refund-fee-stripe \
        root@supabase.gleeworld.org:/opt/supabase/volumes/functions/

scp -r supabase/functions/schedule-fee-reminders \
        root@supabase.gleeworld.org:/opt/supabase/volumes/functions/
```

### 2c — md5-verify (per `reference_edge_fn_deploy.md` pattern)

```bash
# Local md5
md5 supabase/functions/create-fee-payment/index.ts
md5 supabase/functions/verify-fee-payment/index.ts
md5 supabase/functions/refund-fee-stripe/index.ts
md5 supabase/functions/schedule-fee-reminders/index.ts

# Remote md5 — must match
ssh root@supabase.gleeworld.org \
  "md5sum /opt/supabase/volumes/functions/create-fee-payment/index.ts \
          /opt/supabase/volumes/functions/verify-fee-payment/index.ts \
          /opt/supabase/volumes/functions/refund-fee-stripe/index.ts \
          /opt/supabase/volumes/functions/schedule-fee-reminders/index.ts"
```

### 2d — Restart the edge-function runner

```bash
ssh root@supabase.gleeworld.org \
  "cd /opt/supabase && docker compose restart functions"
```

### 2e — Smoke-test each function is reachable (expect 200 or 401, not 404)

```bash
curl -s -o /dev/null -w "%{http_code}" \
  https://supabase.gleeworld.org/functions/v1/create-fee-payment

curl -s -o /dev/null -w "%{http_code}" \
  https://supabase.gleeworld.org/functions/v1/verify-fee-payment

curl -s -o /dev/null -w "%{http_code}" \
  https://supabase.gleeworld.org/functions/v1/refund-fee-stripe

curl -s -o /dev/null -w "%{http_code}" \
  https://supabase.gleeworld.org/functions/v1/schedule-fee-reminders
```

---

## Step 3 — Add `STRIPE_WEBHOOK_SECRET` to Supabase env

```bash
ssh root@supabase.gleeworld.org
# edit /opt/supabase/.env
nano /opt/supabase/.env
```

Add the line (get the value from Step 4 below — register the webhook first,
then paste the signing secret here):

```
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXX
```

After saving, restart Kong/functions so the new env var is picked up:

```bash
cd /opt/supabase && docker compose restart kong functions
```

---

## Step 4 — Register Stripe Connect webhook

1. Go to **Stripe Dashboard → Developers → Webhooks** (platform account, not a
   connected account).
2. Click **Add endpoint**.
3. Endpoint URL: `https://supabase.gleeworld.org/functions/v1/verify-fee-payment`
4. Events to subscribe:
   - `checkout.session.completed`
5. Click **Add endpoint**.
6. On the endpoint detail page, reveal the **Signing secret** (`whsec_…`).
7. Copy it into `/opt/supabase/.env` as `STRIPE_WEBHOOK_SECRET` (see Step 3).

> Note: the existing `stripe-webhook` function handles Box Office events.
> This is a **separate** endpoint for fee payments only. Do NOT reuse the
> Box Office signing secret — they are independent endpoints with separate secrets.

---

## Step 5 — Schedule `schedule-fee-reminders` via pg_cron

Connect to the prod DB and run:

```sql
-- Enable pg_cron if not already enabled (superuser required)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily at 08:00 UTC
SELECT cron.schedule(
  'fee-reminders-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url    := 'https://supabase.gleeworld.org/functions/v1/schedule-fee-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type',  'application/json'
    ),
    body   := '{}'::jsonb
  );
  $$
);

-- Verify it was created
SELECT jobid, jobname, schedule, command FROM cron.job WHERE jobname = 'fee-reminders-daily';
```

> If `net.http_post` is not available, use the `pg_net` extension pattern already
> used by `flatten-storage.sh` on this droplet — check `/opt/supabase/.env` for the
> service role key env var name.

---

## Step 6 — Build web + rsync dist/

```bash
# In ~/Documents/GitHub/gleeworld (main repo after merge)
# Confirm branch is main / merged
git branch --show-current
git log --oneline -3

# Install deps (if needed)
npm ci

# Build
npm run build

# rsync to app droplet — NEVER use --delete (tenants/ bootstrap files aren't in dist/)
rsync -avz --progress dist/ user@APP_DROPLET:/srv/gleeworld/dist/
```

Replace `user@APP_DROPLET` with the unprivileged user + actual droplet IP per
`reference_droplet.md`.

---

## Step 7 — Smoke test

Use a tenant that has Stripe Connect enabled (e.g., `main.gleeworld.org`).

### 7a — Admin: seed a $1 fee

1. Sign in as admin.
2. Go to `/dashboard/fees` → **Dues** tab → **New Fee**.
3. Create a fee: category = `dues`, amount = `1.00`, assign to your test student.
4. Confirm the row appears in `gw_student_fees` with `status = 'pending'`.

### 7b — Student: self-pay via Stripe test mode

1. Sign in as that student.
2. Go to `/dashboard/my-fees` — confirm the $1 fee appears.
3. Click **Pay Now** — Stripe Checkout should open (test mode).
4. Use card `4242 4242 4242 4242`, any future expiry, any CVC.
5. Complete the payment.

### 7c — Verify webhook fired

```sql
-- Should show status = 'paid', paid_amount = 100 (cents)
SELECT id, status, amount, paid_amount, stripe_payment_intent_id
FROM   gw_student_fees
WHERE  status = 'paid'
ORDER  BY updated_at DESC
LIMIT  5;
```

Check edge function logs if the row didn't flip:

```bash
ssh root@supabase.gleeworld.org \
  "docker logs supabase_edge_runtime_1 --tail 50 2>&1 | grep fee"
```

### 7d — Manual mark-paid path (no Connect)

On any tenant without Connect enabled, confirm the **Mark Paid** dialog still
works (cash / check / other). The `record_fee_payment` RPC path does not call Stripe.

### 7e — Refund test

As admin on the test fee, use **Refund** action. Verify:
- Stripe Dashboard shows refund initiated.
- `gw_student_fees.status` flips to `'refunded'`.

---

## Rollback plan

No feature flag guards this. If something goes wrong post-deploy:

### Web rollback

Re-rsync the previous `dist/` snapshot from your backup. If you kept the last
build artifact:

```bash
rsync -avz --progress dist-backup/ user@APP_DROPLET:/srv/gleeworld/dist/
```

If no backup exists, check out the commit before the merge and rebuild:

```bash
git checkout <pre-merge-sha>
npm ci && npm run build
rsync -avz --progress dist/ user@APP_DROPLET:/srv/gleeworld/dist/
```

### DB rollback

The migration renames tables (no data is dropped). To reverse:

```sql
-- Reverse Step 1 — run in prod
BEGIN;

-- Rename FK columns back
ALTER TABLE gw_fee_payment_plans RENAME COLUMN student_fee_id TO dues_record_id;
ALTER TABLE gw_fee_reminders     RENAME COLUMN student_fee_id TO dues_record_id;

-- Rename tables back
ALTER TABLE gw_student_fees        RENAME TO gw_dues_records;
ALTER TABLE gw_fee_payment_plans   RENAME TO gw_dues_payment_plans;
ALTER TABLE gw_fee_plan_installments RENAME TO gw_dues_installments;
ALTER TABLE gw_fee_reminders       RENAME TO gw_dues_reminders;

-- Drop newly added tables (no data loss — they're new)
DROP TABLE IF EXISTS gw_fee_template_installments CASCADE;
DROP TABLE IF EXISTS gw_fee_templates CASCADE;
DROP TABLE IF EXISTS gw_tenant_fee_settings CASCADE;

COMMIT;
```

> Drop the new RPCs as well if needed:
> `assign_fee_template`, `update_fee_template`, `record_fee_payment`,
> `refund_fee`, `waive_fee`.

### Edge function rollback

If the new functions cause errors, remove them and re-deploy the old
`create-dues-payment` / `verify-dues-payment` from the previous tagged release:

```bash
ssh root@supabase.gleeworld.org \
  "rm -rf /opt/supabase/volumes/functions/create-fee-payment \
           /opt/supabase/volumes/functions/verify-fee-payment \
           /opt/supabase/volumes/functions/refund-fee-stripe \
           /opt/supabase/volumes/functions/schedule-fee-reminders"
# then scp old functions back, restart docker compose restart functions
```

### Stripe webhook rollback

Delete or disable the `verify-fee-payment` endpoint in Stripe Dashboard.
The old Box Office webhook is on its own endpoint and is unaffected.

### pg_cron rollback

```sql
SELECT cron.unschedule('fee-reminders-daily');
```

---

## Known deferred items (do not block deploy)

- `gw_fee_reminders` does not yet have a `tenant_id` column — reminder inserts
  rely on the RLS trigger. Track in follow-up.
- `waive_fee` RPC does not guard against re-refunding after a waiver — follow-up.
- Two dialog form-state reset bugs identified in review — follow-up tickets open.
