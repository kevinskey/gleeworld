# Retirement Concert RSVP — 2026-08-04

Sunday, October 18 2026, 6:00 PM · Lyke House (Catholic Center at the AUC),
809 Beckwith Street SW, Atlanta, GA 30314.

$50 ticket · $30 souvenir t-shirt · $60 hoodie · one Stripe payment.

## Run it

```bash
bash deploy/concert-rsvp-20260804/deploy.sh
```

Idempotent — safe to re-run.

## What was built

| Piece | Where |
|---|---|
| Souvenir catalog + merch-on-order columns + public read RPC | `supabase/migrations/20260804190000_concert_rsvp_merch.sql` |
| `uses_platform_stripe` opt-in | `supabase/migrations/20260804191000_tenant_uses_platform_stripe.sql` |
| Checkout function | `supabase/functions/concert-rsvp-checkout/index.ts` |
| Application-fee + metadata support in the payment seam | `supabase/functions/_shared/payments/{types,stripe}.ts` |
| The form (inline card + modal layer) | `src/components/public-site/blocks/concert-rsvp.tsx` |
| Event / tier / souvenir rows | `seed-retirement-concert.sql` |
| Block placement + hero CTA + republish | `wire-site.sql` |
| Platform-webhook fulfillment branch | `patch-webhook.py` |

The first migration is **already applied** to the live database. The rest is
what `deploy.sh` does.

## Souvenir sizes and colors come from TSB

`sync-tsb-variants.sh` (run on the droplet) bridges the two databases — TSB is
host Postgres, GleeWorld is Postgres inside the `supabase-db` container — and
backfills garment variants:

- `gw_merch_products.variants` for every mirrored TSB product (all 5,655 rows
  previously read `{"sizes": [], "colors": []}`)
- the two concert souvenirs, from the specific blank each is printed on

| Souvenir | TSB blank | Sizes | Colors |
|---|---|---|---|
| Souvenir T-Shirt | BELLA + CANVAS 3001RCY (id 1088) | XS–2XL | 9 |
| Souvenir Hoodie | BELLA + CANVAS 3329 (id 1112) | S–XL | 5 |

Re-run it any time TSB's own S&S sync fills in more of the catalog; it is a
straight overwrite from TSB.

**TSB's variant data is thin.** Only 217 of 5,963 TSB products have sizes and
163 have colors, and only 41 of those overlap the products GleeWorld mirrors —
`gw_merch_products.tb_product_id` and `products.id` largely don't match, which
looks like a pre-existing sync bug worth a separate look. The two blanks above
were picked because they are among the few real unisex garments with both.

Colors arrive as `[{name, hex, swatch}]`, so the form renders actual S&S swatch
images rather than a text list. Both size and color are re-validated against
the catalog in `concert-rsvp-checkout` — a forged value is refused, not
silently accepted onto the pick list.

## Two decisions worth knowing about

**Where the money goes.** The `kevin` tenant has no Stripe Connect account,
so the normal `box-office-checkout` path would reject it outright. The
GleeWorld *platform* Stripe account (`acct_1RUiPb…`) is Kevin Johnson's own
account, so these charges go straight to him with no Connect onboarding and
no 1% application fee (there is nobody to take a cut from).

Commerce Rule 4 says a tenant must never sell through the platform's account,
and that rule still holds: `concert-rsvp-checkout` refuses the platform
account unless `gw_tenants.uses_platform_stripe` is explicitly true, which is
set for `kevin` alone and is not settable from any tenant-facing UI. Any other
tenant still has to connect their own account.

**Why the webhook needed a branch.** Ticket fulfillment (`gw_box_office_fulfill_order`)
was only wired to `/stripe-connect-webhook`. A platform-account charge arrives
at `/stripe-webhook` instead, which knew about provisioning, subscriptions and
store sales but not tickets. `patch-webhook.py` adds one branch keyed on
`metadata.store_type === 'box-office'`, placed *before* the generic store
branch (both carry `store_type`), and reuses the existing handler unchanged.
It also adds the UUID guard that file already defines, since `order_id` now
reaches that handler from two dispatchers and is interpolated into SQL.

## Verify after deploying

```bash
# the event is on sale
ssh root@198.211.113.144 "docker exec -i supabase-db psql -U postgres -d postgres \
  -c \"select title, start_date, box_office_status from gw_events \
       where box_office_slug='retirement-concert';\""

# watch a real purchase fulfil
ssh root@198.211.113.144 'journalctl -u gleeworld-provision -f'
```

A successful run logs `✓ order <uuid> fulfilled — N tickets minted`, flips
`gw_ticket_orders.status` to `paid`, mints `gw_tickets` rows, and emails the
buyer their tickets link. Merch rides on the order in
`gw_ticket_orders.merch_items` for the pickup table — it does not mint tickets.

## Unrelated things noticed

- Kevin's draft site has a block of type `audition`, which is not in
  `BLOCK_REGISTRY` — it renders nothing, live or in preview. Either build the
  block or delete it from the draft.
- `npm run typecheck:guard` currently reports 31 pre-existing errors not in
  the baseline (vexflow's typings, studio `CycleResult`, `useVideoLibrary`).
  None are from this work; the baseline has drifted from installed deps.
