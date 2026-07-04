# Tenant Store Add-on Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a tenant run their own store (guest checkout, their Stripe Connect account) via a public-site block, gated by the `store` add-on — reusing the live Commerce Core.

**Architecture:** Most backend exists. New work: extend `store-checkout` for guest tenant checkout (tenant resolved from slug), a tenant catalog RPC, rewire `merch.tsx` into the Store block, register the `store` module + gate the reused tenant-scoped admin.

**Tech Stack:** Deno edge functions (raw-fetch/PostgREST), Postgres/PL-pgSQL, React public-site blocks, Stripe Connect.

## Global Constraints

- Guest tenant checkout: tenant resolved SERVER-SIDE from a client `tenant_slug`; the client only names which enabled tenant store it buys from. Authoritative values (add-on gate, Connect account, prices) are all server-resolved.
- The add-on module id is **`store`** (matches `store-checkout`'s existing gate `module_id=eq.store` at line 87). Do NOT reuse the legacy `merch` module id.
- Add-on gate: tenant must have an active/trial `store` row in `gw_tenant_subscriptions`, else 403 (checkout) / empty (catalog).
- Prices server-side from `gw_products` scoped to the resolved tenant; client sends `{product_id, variant_id?, quantity}` + `tenant_slug` + `buyer_email`.
- `tenant_slug` validated (slug charset `^[a-z0-9-]+$`) and `encodeURIComponent`'d in PostgREST filters.
- Money tables service-role-only; catalog exposed only via SECURITY DEFINER RPCs.
- Local tests: scratch DB `commerce_scratch` via `/opt/homebrew/opt/postgresql@16/bin/psql`; Deno fetch-stubbed. NEVER test against prod.
- Reference impls: `store-checkout/index.ts` (guest gleeworld path, lines 55–189), `gw_store_list_products()` (platform RPC), `box-office-connect-onboarding`, `src/lib/navigation/moduleFlags.ts` (`hasModule`), `src/components/public-site/blocks/merch.tsx` (BlockModule pattern).

---

## File Structure

- `supabase/migrations/20260707000000_tenant_store.sql` — new: `gw_store_list_tenant_products(text)` RPC.
- `supabase/functions/store-checkout/index.ts` — modify: guest tenant path (resolve tenant from slug).
- `src/components/public-site/blocks/merch.tsx` — rewire into the live Store block.
- `src/lib/navigation/moduleFlags.ts` — add `hasStore`.
- Store admin gating: the route/nav that mounts `ProductManager`/`OrdersManager` — gate on `hasStore`; add a "Connect Stripe" prompt when `stripe_account_id` is null.

---

## Task 1: Tenant catalog RPC

**Files:** Create `supabase/migrations/20260707000000_tenant_store.sql`; Test `supabase/migrations/tests/tenant_store_test.sql`

**Interfaces:** Produces `gw_store_list_tenant_products(p_tenant_slug text) RETURNS TABLE(id uuid, name text, price numeric, sale_price numeric, requires_shipping boolean, images text[], description text)` — active products for that tenant, ONLY if the tenant has an active/trial `store` subscription.

- [ ] **Step 1: Failing test** — `tenant_store_test.sql` (BEGIN/ROLLBACK): seed tenant A (slug 'ta') with an active `store` sub + an active product 'ProdA' + an inactive 'DeadA'; tenant B (slug 'tb') with NO store sub + active 'ProdB'. Assert: `gw_store_list_tenant_products('ta')` returns ProdA, NOT DeadA; `gw_store_list_tenant_products('tb')` returns ZERO rows (no add-on); `gw_store_list_tenant_products('ta')` never returns ProdB (tenant isolation). Run: `/opt/homebrew/opt/postgresql@16/bin/psql -d commerce_scratch -v ON_ERROR_STOP=1 -f supabase/migrations/tests/tenant_store_test.sql`. (Scratch already has `gw_tenants`, `gw_products`, `gw_tenant_subscriptions`.)
- [ ] **Step 2: RED** — function absent → division/exception.
- [ ] **Step 3: Migration:**
```sql
CREATE OR REPLACE FUNCTION public.gw_store_list_tenant_products(p_tenant_slug text)
RETURNS TABLE(id uuid, name text, price numeric, sale_price numeric, requires_shipping boolean, images text[], description text)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT p.id, p.name, p.price, p.sale_price, p.requires_shipping, p.images, p.description
  FROM public.gw_products p
  JOIN public.gw_tenants t ON t.id = p.tenant_id AND t.slug = p_tenant_slug
  WHERE p.is_active = true
    AND EXISTS (
      SELECT 1 FROM public.gw_tenant_subscriptions s
      WHERE s.tenant_id = t.id AND s.module_id = 'store' AND s.status IN ('active','trial')
    )
  ORDER BY p.is_featured DESC NULLS LAST, p.name;
$$;
REVOKE ALL ON FUNCTION public.gw_store_list_tenant_products(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gw_store_list_tenant_products(text) TO anon, authenticated, service_role;
```
- [ ] **Step 4: GREEN** — re-apply + re-run test; all assertions pass.
- [ ] **Step 5: Commit** — `git add supabase/migrations/20260707000000_tenant_store.sql supabase/migrations/tests/tenant_store_test.sql && git commit -m "feat(tenant-store): tenant catalog RPC (add-on-gated, tenant-scoped)"`

---

## Task 2: `store-checkout` guest tenant checkout

**Files:** Modify `supabase/functions/store-checkout/index.ts`; Test `supabase/functions/store-checkout/tenant_guest_test.ts`

**Interfaces:** Consumes Task 1 tenant subs. Produces: `store-checkout` accepts a guest (no JWT) with `store_type='tenant'` + `tenant_slug` → resolves tenant, gates add-on, resolves Connect account, server-priced order.

- [ ] **Step 1: Failing test** — `tenant_guest_test.ts` (stub fetch): (a) guest + `store_type='tenant'` + valid `tenant_slug` (tenant has active `store` sub + `stripe_account_id`) → 200, order on that tenant, Stripe session created with the tenant's `Stripe-Account`; (b) `tenant_slug` for a tenant WITHOUT the `store` sub → 403; (c) tenant with the sub but NULL `stripe_account_id` → 400 'store not ready'; (d) guest `store_type='tenant'` with NO `tenant_slug` → 401 (can't resolve); (e) a logged-in JWT tenant path still works unchanged. Run: `cd supabase/functions && STRIPE_SECRET_KEY=sk_test_dummy deno run --allow-env --allow-net store-checkout/tenant_guest_test.ts`.
- [ ] **Step 2: RED** — current line 59 `if (store_type === 'tenant' && !claims) return 401` rejects all guest tenant orders.
- [ ] **Step 3: Modify the auth/tenant-resolution region** (`store-checkout/index.ts` ~lines 55–90). Read `tenant_slug` from the body. Replace the tenant-resolution + gate logic:
```ts
    const claims = authHeader ? await verifyJwtClaims(authHeader) : null;
    const { store_type, items, buyer_email, tenant_slug, shipping_address } = await req.json();
    // ... existing store_type / items / buyer_email / rate-limit checks ...

    const SLUG_RE = /^[a-z0-9-]+$/;
    let tenantId: string | null;
    if (store_type === 'gleeworld') {
      tenantId = PLATFORM_TENANT_ID;
    } else {
      // tenant store: prefer a verified JWT tenant; else resolve a guest by slug.
      if (claims) {
        tenantId = claims.tenant_id;
      } else {
        if (!tenant_slug || !SLUG_RE.test(String(tenant_slug))) return j({ error: 'Unauthorized' }, 401);
        const trows = await pg(`gw_tenants?slug=eq.${encodeURIComponent(tenant_slug)}&select=id`);
        tenantId = (Array.isArray(trows) && trows[0]?.id) || null;
        if (!tenantId) return j({ error: 'store not found' }, 404);
      }
    }
    if (!tenantId) return j({ error: 'no tenant' }, 400);

    if (store_type === 'tenant') {
      // Add-on gate (unchanged — applies to guest and JWT alike).
      const subs = await pg(`gw_tenant_subscriptions?tenant_id=eq.${encodeURIComponent(tenantId)}&module_id=eq.store&select=status`);
      const ok = Array.isArray(subs) && subs.some((s: any) => ['active','trial'].includes(s.status));
      if (!ok) return j({ error: 'Store add-on not enabled' }, 403);
    }
```
The existing Connect-account resolution (lines ~170–172: `store_type==='tenant'` → `gw_tenants.stripe_account_id`, 400 if null — CHANGE the current silent null to `return j({error:'store not ready'},400)`) and the server-side product lookup (scoped to `tenantId`) stay. `buyer_user_id: claims?.sub ?? null` stays.
- [ ] **Step 4: GREEN** — re-run `tenant_guest_test.ts` + the existing `guest_test.ts`/`logic_test.ts` (must stay green).
- [ ] **Step 5: Commit** — `git commit -m "feat(tenant-store): guest tenant checkout (resolve tenant from slug, add-on gate, Connect)"`

---

## Task 3: Store public-site block (rewire merch.tsx)

**Files:** Modify `src/components/public-site/blocks/merch.tsx`; reuse `src/features/store/cart.ts`

**Interfaces:** Consumes `gw_store_list_tenant_products` (Task 1), `store-checkout` (Task 2). The block renders on a tenant's public site; the tenant slug comes from the public-site render context.

- [ ] **Step 1** — Determine how the block gets its tenant slug: inspect `BlockRenderProps`/`SiteRenderContext` in `src/components/public-site/types.ts` and how sibling blocks (e.g. `events.tsx`, `contact.tsx`) read tenant/org context (the public site already resolves the tenant per subdomain). Use that slug.
- [ ] **Step 2** — Rewire `merch.tsx` `Render`: fetch catalog via `supabase.rpc('gw_store_list_tenant_products', { p_tenant_slug: slug })`; render a grid (theme-tenant-aware, `gleeworld-design` tokens, responsive 375px) with add-to-cart using `cart.addItem`; a cart summary + "Checkout" that collects `buyer_email` (+ shipping when any item `requires_shipping`) and calls `supabase.functions.invoke('store-checkout', { body: { store_type:'tenant', tenant_slug: slug, items: cart.getItems(), buyer_email, shipping_address? } })`, then `window.location.href = data.url`.
- [ ] **Step 3** — Success: `store-checkout` `success_url` for a tenant order returns to the tenant site with `?order=&t=`. Add a minimal success surface: on the public site, when `?order=&t=` is present, show a "Payment confirmed" panel (read `store-order-status`) — reuse the `StoreSuccess` logic from sub-project 2, adapted to render within/above the public site. Keep it display-only. (Check `PublicSiteView.tsx` for where to hook a query-param success state.)
- [ ] **Step 4: Verify** — `bun x vite build` passes. State honestly that live verification is the Task 5 demo-tenant smoke test.
- [ ] **Step 5: Commit** — `git commit -m "feat(tenant-store): live Store public-site block (catalog + cart + tenant checkout)"`

---

## Task 4: `store` module registration + admin gating + Connect prompt

**Files:** Modify `src/lib/navigation/moduleFlags.ts`; the store-admin route/nav; a Connect-prompt component.

- [ ] **Step 1** — `moduleFlags.ts`: add `hasStore: hasModule('store')` to `toModuleFlags` (mirror `hasBoxOffice`). Update the `ModuleFlags` type. (Leave the legacy `hasMerch` untouched.)
- [ ] **Step 2** — Register the `store` module in the module catalog so it's provisionable + appears in module lists: find where modules are defined (e.g. `src/config/*modules*.ts` or a DB `gw_billing_modules` row) and add a `store` entry (id `store`, name "Store", a monthly price if the catalog carries one) mirroring `box_office`. Provisioning itself rides the existing `create-module-checkout` (`module_id='store'`) + webhook — no new function.
- [ ] **Step 3** — Gate the store-builder admin: the route/nav mounting `ProductManager`/`OrdersManager` for tenant admins renders only when `hasStore` is true. When `hasStore` but `gw_tenants.stripe_account_id` is null, show a "Connect your Stripe to accept payments" prompt linking `box-office-connect-onboarding` (reuse the Box Office connect UI/flow — find it and link it).
- [ ] **Step 4: Verify** — `bun x vite build` passes; grep confirms `hasStore` wired.
- [ ] **Step 5: Commit** — `git commit -m "feat(tenant-store): store module flag + add-on-gated admin + Connect prompt"`

---

## Task 5: Deploy + demo-tenant guest smoke test (gated)

**Gated on Tasks 1–4 green + Kevin's go. Live money on the demo tenant's Connect account.**

- [ ] **Step 1** — Apply `20260707000000_tenant_store.sql` to prod; deploy the updated `store-checkout` to the functions volume; `docker compose up -d functions`.
- [ ] **Step 2** — Enable the `store` add-on for the `demo` tenant: insert an active `gw_tenant_subscriptions` row (`tenant_id`=demo, `module_id='store'`, `status='active'`) OR run the module checkout.
- [ ] **Step 3** — Ensure the demo tenant has a connected Stripe account (`gw_tenants.stripe_account_id`); if null, run/complete `box-office-connect-onboarding` for it (Kevin's step — Connect onboarding).
- [ ] **Step 4** — Add a $1 physical product for the demo tenant (via admin or SQL). As a GUEST on the demo subdomain's store block, buy it (email only) → confirm webhook fulfill → `paid` on the DEMO tenant, on the DEMO tenant's Connect account. Refund via admin `store-refund`.
- [ ] **Step 5** — Rate-limit hammer → 429. Clean up the demo test product/orders/sub if desired.
- [ ] **Step 6: Commit** the smoke-test results doc.

---

## Self-Review

- **Spec coverage:** guest tenant checkout (T2) · tenant catalog RPC (T1) · Store block/rewire merch (T3) · `store` add-on provisioning + Connect + admin gating (T4) · demo smoke test (T5). All spec sections mapped.
- **Placeholder scan:** none — real SQL/TS for T1–T2; T3–T4 cite exact files + the existing patterns to follow (block context, moduleFlags, Connect onboarding), which require reading sibling code, not inventing values.
- **Type consistency:** module id `store` used consistently (T1 RPC gate, T2 checkout gate, T4 flag); `gw_store_list_tenant_products(text)` signature matches T1↔T3; `store-checkout` body `{store_type,tenant_slug,items,buyer_email,shipping_address}` matches T2↔T3.
