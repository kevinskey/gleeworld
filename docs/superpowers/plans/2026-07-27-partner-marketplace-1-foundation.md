# Partner Marketplace — Sub-plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the schema, admin-invite flow, Stripe Connect Express onboarding, and partner portal to the point where Kevin can invite composers, they onboard on Stripe, and upload PDF scores to draft status. Nothing sells yet — that's Sub-plan 2.

**Architecture:** Six new tables (foundation subset: `gw_partners`, `gw_partner_scores`, `gw_partner_invites`, plus `gw_profiles.is_partner` column and helper RPCs), two DO Spaces buckets (`partner-assets` public, `partner-scores-master` private), five Deno edge functions for invite / Stripe onboarding / PDF postprocess, and React pages for admin invite, invite redemption, and partner portal (profile + upload + scores list). All net-new tables are platform-global — no `tenant_id`.

**Tech Stack:** Postgres 15 + Supabase RLS, Deno edge functions, React 18 + TypeScript, Tailwind + shadcn/ui, TanStack Query, Stripe Node SDK v14 (in Deno via npm: specifier), pdf-lib in Deno, Resend for email, Vitest.

## Global Constraints

- Multi-tenant SaaS: writes to tenant-scoped tables MUST set `tenant_id`. The NEW tables in this plan are platform-global by design (no `tenant_id`).
- Light theme only: white cards, dark text, cream page. Studio sizing min: text-xs/text-sm + w-4 h-4 icons.
- "Students" not "singers/members"; "graduates" not "alumnae/alumni"; never hardcode "Spelman".
- Migrations idempotent (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`).
- Node ≥ 20; deploy = local build + `bash scripts/deploy-frontend.sh` from `~/Documents/GitHub/gleeworld-repertoire/`.
- Edge fn deploy: scp to `/opt/supabase/volumes/functions/<name>/index.ts`, then `docker restart supabase-edge-functions`.
- Migrations applied via `ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres" < migration.sql`. Credentials never enter the transcript.
- Stripe keys read from `/opt/supabase/.env`: `STRIPE_SECRET_KEY` (existing; sk_live_ per `reference_stripe_account` memory), `STRIPE_WEBHOOK_SECRET_PARTNER` (new, added at deploy). Stripe Connect must be enabled on the Stripe account (Kevin toggles in Stripe dashboard before Task 5). Use test keys (`sk_test_...`) for local + first end-to-end.
- Email via `RESEND_API_KEY` (existing).
- Watermark uses `pdf-lib` from `npm:pdf-lib@1.17.1` in the edge fn.

---

## File Structure

**New — migrations:**
- `supabase/migrations/20260728100000_gw_partners.sql` — table, RLS, helper RPCs (`my_partner_id`, `partner_update_self`), `gw_profiles.is_partner` column, `set_is_partner` trigger.
- `supabase/migrations/20260728100100_gw_partner_scores.sql` — table, RLS, FTS, `partner-scores-master` bucket policy.
- `supabase/migrations/20260728100200_gw_partner_invites.sql` — table, RLS.
- `supabase/migrations/20260728100300_partner_buckets.sql` — Storage buckets + policies.

**New — edge functions:**
- `supabase/functions/partner-invite-send/index.ts` — Kevin's admin sends invite email.
- `supabase/functions/partner-invite-redeem/index.ts` — token→partner row, mints is_partner.
- `supabase/functions/partner-connect-onboarding/index.ts` — creates Stripe Express account, returns onboarding link.
- `supabase/functions/partner-connect-refresh/index.ts` — polls Stripe for charges/payouts enabled state, updates row, returns dashboard link.
- `supabase/functions/partner-score-postprocess/index.ts` — page count + watermarked page-1 thumbnail.

**New — client:**
- `src/lib/partner/api.ts` — Query hooks + mutations.
- `src/lib/partner/__tests__/api.test.ts` — Vitest for the price/fee util.
- `src/pages/admin/PartnersAdmin.tsx` — Admin invite form + partner list.
- `src/pages/partner/PartnerInviteRedeem.tsx` — `/partner/invite/:token` redemption page.
- `src/pages/partner/PartnerPortal.tsx` — `/partner` shell (dashboard summary + tabs).
- `src/pages/partner/PartnerProfile.tsx` — profile edit.
- `src/pages/partner/PartnerScoresList.tsx` — score list (drafts + published).
- `src/pages/partner/PartnerScoreUpload.tsx` — upload + wizard.

**Modify:**
- `src/App.tsx` — 4 new routes.
- `src/lib/navigation/navCatalog.ts` — new `partner-portal` nav entry gated on `is_partner`.
- `src/lib/navigation/__tests__/appDestinations.test.ts` — add new routes to `KNOWN_ROUTES`.

---

## Task 1: Schema — gw_partners + is_partner column + helper RPCs

**Files:**
- Create: `supabase/migrations/20260728100000_gw_partners.sql`

**Interfaces:**
- Consumes: `auth.users`, `gw_profiles`.
- Produces:
  - Table `gw_partners(id uuid PK, user_id uuid UNIQUE FK auth.users, display_name text NOT NULL, bio text, website_url text, contact_email text, logo_storage_path text, stripe_connect_id text, stripe_charges_enabled bool DEFAULT false, stripe_payouts_enabled bool DEFAULT false, status text CHECK ∈ ('invited','onboarding','active','suspended'), invite_token text UNIQUE, invited_at timestamptz, activated_at timestamptz, created_at timestamptz DEFAULT now())`.
  - Column `gw_profiles.is_partner boolean NOT NULL DEFAULT false`.
  - Trigger `trg_sync_is_partner` on `gw_partners` maintains `gw_profiles.is_partner`.
  - Function `my_partner_id() RETURNS uuid` — returns caller's partner row id or NULL.
  - Function `partner_update_self(p_display_name text, p_bio text, p_website_url text, p_contact_email text, p_logo_storage_path text) RETURNS gw_partners` — SECURITY DEFINER, whitelisted update.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260728100000_gw_partners.sql`:

```sql
-- Partner Marketplace foundation — gw_partners + is_partner flag + helpers.
--
-- Platform-global (NO tenant_id): a composer's storefront is one entity
-- regardless of which tenant subdomain a buyer is browsing on.

CREATE TABLE IF NOT EXISTS gw_partners (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name             text NOT NULL,
  bio                      text,
  website_url              text,
  contact_email            text,
  logo_storage_path        text,
  stripe_connect_id        text,
  stripe_charges_enabled   boolean NOT NULL DEFAULT false,
  stripe_payouts_enabled   boolean NOT NULL DEFAULT false,
  status                   text NOT NULL DEFAULT 'invited'
                           CHECK (status IN ('invited','onboarding','active','suspended')),
  invite_token             text UNIQUE,
  invited_at               timestamptz,
  activated_at             timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_partners_status_idx ON gw_partners (status);
CREATE INDEX IF NOT EXISTS gw_partners_display_name_trgm
  ON gw_partners USING GIN (display_name gin_trgm_ops);

ALTER TABLE gw_profiles
  ADD COLUMN IF NOT EXISTS is_partner boolean NOT NULL DEFAULT false;

-- Keep gw_profiles.is_partner in sync with gw_partners.status='active'.
CREATE OR REPLACE FUNCTION sync_is_partner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    UPDATE gw_profiles SET is_partner = false WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;
  UPDATE gw_profiles
     SET is_partner = (NEW.status = 'active')
   WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_is_partner ON gw_partners;
CREATE TRIGGER trg_sync_is_partner
AFTER INSERT OR UPDATE OF status OR DELETE ON gw_partners
FOR EACH ROW EXECUTE FUNCTION sync_is_partner();

-- Helper: caller's partner id (or NULL if not a partner).
CREATE OR REPLACE FUNCTION my_partner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM gw_partners WHERE user_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION my_partner_id() TO authenticated;

-- Whitelisted self-update. Partner cannot change status or stripe ids.
CREATE OR REPLACE FUNCTION partner_update_self(
  p_display_name       text,
  p_bio                text,
  p_website_url        text,
  p_contact_email      text,
  p_logo_storage_path  text
)
RETURNS gw_partners
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  updated gw_partners;
BEGIN
  UPDATE gw_partners
     SET display_name       = COALESCE(p_display_name, display_name),
         bio                = p_bio,
         website_url        = p_website_url,
         contact_email      = p_contact_email,
         logo_storage_path  = p_logo_storage_path
   WHERE user_id = auth.uid()
   RETURNING * INTO updated;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not a partner' USING ERRCODE = '42501';
  END IF;
  RETURN updated;
END;
$$;
GRANT EXECUTE ON FUNCTION partner_update_self(text, text, text, text, text) TO authenticated;

-- RLS
ALTER TABLE gw_partners ENABLE ROW LEVEL SECURITY;

-- Public storefront read of active partners — limited columns via a view/RPC
-- later; policy is any authenticated user for active rows.
DROP POLICY IF EXISTS gw_partners_public_active_read ON gw_partners;
CREATE POLICY gw_partners_public_active_read
  ON gw_partners FOR SELECT TO authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS gw_partners_self_read ON gw_partners;
CREATE POLICY gw_partners_self_read
  ON gw_partners FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS gw_partners_admin_all ON gw_partners;
CREATE POLICY gw_partners_admin_all
  ON gw_partners FOR ALL TO authenticated
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

-- No direct INSERT/UPDATE/DELETE from partners — they go through
-- partner_update_self() (SECURITY DEFINER). Onboarding writes go
-- through partner-invite-redeem edge fn (service-role).
```

- [ ] **Step 2: Apply migration + verify**

```bash
ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres" \
  < ~/Documents/GitHub/gleeworld-repertoire/supabase/migrations/20260728100000_gw_partners.sql

ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres \
  -c '\\d gw_partners' \
  -c \"SELECT column_name FROM information_schema.columns WHERE table_name='gw_profiles' AND column_name='is_partner';\" \
  -c 'SELECT my_partner_id();'"
```

Expected: table structure printed with all columns; `is_partner` column present on `gw_profiles`; `my_partner_id()` returns NULL (no partner row exists yet).

- [ ] **Step 3: Commit**

```bash
cd ~/Documents/GitHub/gleeworld-repertoire
git add supabase/migrations/20260728100000_gw_partners.sql
git commit -m "feat(partner): gw_partners table + is_partner flag + helper RPCs"
```

---

## Task 2: Schema — gw_partner_scores

**Files:**
- Create: `supabase/migrations/20260728100100_gw_partner_scores.sql`

**Interfaces:**
- Consumes: `gw_partners.id`, `my_partner_id()`, `gw_unaccent`.
- Produces:
  - Table `gw_partner_scores(id, partner_id FK, title NOT NULL, composer, arranger, voicing, ensemble_type, difficulty_grade, language, description, tags text[], price_cents integer NOT NULL CHECK 100–5000, currency default 'USD', master_storage_path text NOT NULL, thumbnail_storage_path, sample_audio_storage_path, page_count integer, status text CHECK ∈ ('draft','published','unlisted','removed'), search_vec, created_at, updated_at)`.
  - GIN indexes for FTS + ensemble/status filters.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260728100100_gw_partner_scores.sql`:

```sql
CREATE TABLE IF NOT EXISTS gw_partner_scores (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id                 uuid NOT NULL REFERENCES gw_partners(id) ON DELETE CASCADE,
  title                      text NOT NULL,
  composer                   text,
  arranger                   text,
  voicing                    text,
  ensemble_type              text,
  difficulty_grade           text,
  language                   text,
  description                text,
  tags                       text[],
  price_cents                integer NOT NULL CHECK (price_cents BETWEEN 100 AND 5000),
  currency                   text NOT NULL DEFAULT 'USD',
  master_storage_path        text NOT NULL,
  thumbnail_storage_path     text,
  sample_audio_storage_path  text,
  page_count                 integer,
  status                     text NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft','published','unlisted','removed')),
  search_vec                 tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', public.gw_unaccent(coalesce(title, ''))),        'A') ||
    setweight(to_tsvector('simple', public.gw_unaccent(coalesce(composer, ''))),     'B') ||
    setweight(to_tsvector('simple', public.gw_unaccent(coalesce(voicing, ''))),      'C') ||
    setweight(to_tsvector('simple', public.gw_unaccent(coalesce(description, ''))),  'D')
  ) STORED,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_partner_scores_partner_idx  ON gw_partner_scores (partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gw_partner_scores_status_idx   ON gw_partner_scores (status) WHERE status IN ('published','unlisted');
CREATE INDEX IF NOT EXISTS gw_partner_scores_ensemble_idx ON gw_partner_scores (ensemble_type) WHERE ensemble_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS gw_partner_scores_search_vec_idx ON gw_partner_scores USING GIN (search_vec);
CREATE INDEX IF NOT EXISTS gw_partner_scores_title_trgm ON gw_partner_scores USING GIN (title gin_trgm_ops);

ALTER TABLE gw_partner_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gw_partner_scores_public_read ON gw_partner_scores;
CREATE POLICY gw_partner_scores_public_read
  ON gw_partner_scores FOR SELECT TO authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS gw_partner_scores_owner_all ON gw_partner_scores;
CREATE POLICY gw_partner_scores_owner_all
  ON gw_partner_scores FOR ALL TO authenticated
  USING (partner_id = my_partner_id())
  WITH CHECK (partner_id = my_partner_id());

DROP POLICY IF EXISTS gw_partner_scores_admin_all ON gw_partner_scores;
CREATE POLICY gw_partner_scores_admin_all
  ON gw_partner_scores FOR ALL TO authenticated
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

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_gw_partner_scores_updated_at ON gw_partner_scores;
CREATE TRIGGER trg_gw_partner_scores_updated_at
BEFORE UPDATE ON gw_partner_scores
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
```

- [ ] **Step 2: Apply migration + verify**

```bash
ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres" \
  < ~/Documents/GitHub/gleeworld-repertoire/supabase/migrations/20260728100100_gw_partner_scores.sql

ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres -c '\\d gw_partner_scores'"
```

Expected: table with all columns, indexes, triggers, and three RLS policies.

- [ ] **Step 3: Commit**

```bash
cd ~/Documents/GitHub/gleeworld-repertoire
git add supabase/migrations/20260728100100_gw_partner_scores.sql
git commit -m "feat(partner): gw_partner_scores table"
```

---

## Task 3: Schema — gw_partner_invites

**Files:**
- Create: `supabase/migrations/20260728100200_gw_partner_invites.sql`

**Interfaces:**
- Produces: `gw_partner_invites` table + admin-only RLS.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260728100200_gw_partner_invites.sql`:

```sql
CREATE TABLE IF NOT EXISTS gw_partner_invites (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                  text NOT NULL,
  display_name           text,
  invited_by             uuid REFERENCES auth.users(id),
  token                  text NOT NULL UNIQUE,
  expires_at             timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  redeemed_at            timestamptz,
  redeemed_by_user_id    uuid REFERENCES auth.users(id),
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_partner_invites_email_idx ON gw_partner_invites (email);
CREATE INDEX IF NOT EXISTS gw_partner_invites_open_idx  ON gw_partner_invites (expires_at) WHERE redeemed_at IS NULL;

ALTER TABLE gw_partner_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gw_partner_invites_admin_all ON gw_partner_invites;
CREATE POLICY gw_partner_invites_admin_all
  ON gw_partner_invites FOR ALL TO authenticated
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
-- Non-admins never SELECT invites. Redemption reads happen via
-- edge fn using the service role.
```

- [ ] **Step 2: Apply + verify**

```bash
ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres" \
  < ~/Documents/GitHub/gleeworld-repertoire/supabase/migrations/20260728100200_gw_partner_invites.sql

ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres -c '\\d gw_partner_invites'"
```

- [ ] **Step 3: Commit**

```bash
cd ~/Documents/GitHub/gleeworld-repertoire
git add supabase/migrations/20260728100200_gw_partner_invites.sql
git commit -m "feat(partner): gw_partner_invites table"
```

---

## Task 4: Storage buckets — partner-assets + partner-scores-master

**Files:**
- Create: `supabase/migrations/20260728100300_partner_buckets.sql`

**Interfaces:**
- Produces: two `storage.buckets` rows and their RLS.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260728100300_partner_buckets.sql`:

```sql
-- Two buckets:
--   partner-assets         — PUBLIC — logos, thumbnails, sample audio
--   partner-scores-master  — PRIVATE — clean uploaded PDFs, never served

INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-assets', 'partner-assets', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-scores-master', 'partner-scores-master', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- partner-assets — any authenticated user can READ; only partner or admin can WRITE.
DROP POLICY IF EXISTS partner_assets_public_read ON storage.objects;
CREATE POLICY partner_assets_public_read
  ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'partner-assets');

DROP POLICY IF EXISTS partner_assets_partner_write ON storage.objects;
CREATE POLICY partner_assets_partner_write
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'partner-assets'
    AND (
      -- partner writing to their own prefix "<partner_id>/..."
      (split_part(name, '/', 1)::uuid = my_partner_id())
      OR EXISTS (SELECT 1 FROM gw_profiles p
                 WHERE p.user_id = auth.uid()
                   AND (p.is_super_admin = true OR p.is_admin = true))
    )
  );

DROP POLICY IF EXISTS partner_assets_partner_delete ON storage.objects;
CREATE POLICY partner_assets_partner_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'partner-assets'
    AND (
      (split_part(name, '/', 1)::uuid = my_partner_id())
      OR EXISTS (SELECT 1 FROM gw_profiles p
                 WHERE p.user_id = auth.uid()
                   AND (p.is_super_admin = true OR p.is_admin = true))
    )
  );

-- partner-scores-master — writes only by partner to own prefix; NO reads
-- from clients. Master PDFs are only fetched via service-role in fulfillment
-- edge fns.
DROP POLICY IF EXISTS partner_scores_master_write ON storage.objects;
CREATE POLICY partner_scores_master_write
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'partner-scores-master'
    AND split_part(name, '/', 1)::uuid = my_partner_id()
  );

DROP POLICY IF EXISTS partner_scores_master_owner_read ON storage.objects;
CREATE POLICY partner_scores_master_owner_read
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'partner-scores-master'
    AND split_part(name, '/', 1)::uuid = my_partner_id()
  );
```

- [ ] **Step 2: Apply + verify**

```bash
ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres" \
  < ~/Documents/GitHub/gleeworld-repertoire/supabase/migrations/20260728100300_partner_buckets.sql

ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres \
  -c \"SELECT id, public FROM storage.buckets WHERE id LIKE 'partner-%';\""
```

Expected: two rows, `partner-assets` public=true, `partner-scores-master` public=false.

- [ ] **Step 3: Commit**

```bash
cd ~/Documents/GitHub/gleeworld-repertoire
git add supabase/migrations/20260728100300_partner_buckets.sql
git commit -m "feat(partner): partner-assets + partner-scores-master buckets + RLS"
```

---

## Task 5: Client API layer

**Files:**
- Create: `src/lib/partner/api.ts`
- Create: `src/lib/partner/__tests__/api.test.ts`

**Interfaces:**
- Consumes: `supabase` client, migrations from Tasks 1–3.
- Produces:
  - `type Partner`, `type PartnerScore`, `type PartnerInvite`.
  - `platformFeeCents(price)` and `partnerPayoutCents(price)` pure helpers.
  - `useMyPartner()` — TanStack Query on `my_partner_id()` + full row.
  - `useMyPartnerScores(status?)` — TanStack Query on `gw_partner_scores WHERE partner_id = my_partner_id()`.
  - `useUpdateMyPartner()` — mutation calling `partner_update_self` RPC.
  - `useInvitePartner()` — mutation calling `partner-invite-send` edge fn (admin).
  - `useListPartnerInvites()` — admin-only query.
  - `useListPartners()` — admin-only query.

- [ ] **Step 1: Write failing test**

Create `src/lib/partner/__tests__/api.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { platformFeeCents, partnerPayoutCents } from '../api';

describe('partner fee math', () => {
  it('takes exactly 50% platform fee', () => {
    expect(platformFeeCents(1000)).toBe(500);
    expect(partnerPayoutCents(1000)).toBe(500);
  });
  it('rounds odd cents down for platform fee, up for payout', () => {
    expect(platformFeeCents(999)).toBe(499);
    expect(partnerPayoutCents(999)).toBe(500);
    expect(platformFeeCents(999) + partnerPayoutCents(999)).toBe(999);
  });
  it('fee + payout always sums to price', () => {
    for (const p of [100, 250, 799, 1234, 4999]) {
      expect(platformFeeCents(p) + partnerPayoutCents(p)).toBe(p);
    }
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd ~/Documents/GitHub/gleeworld-repertoire
npx vitest run src/lib/partner/__tests__/api.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/lib/partner/api.ts`**

```typescript
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Partner {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  website_url: string | null;
  contact_email: string | null;
  logo_storage_path: string | null;
  stripe_connect_id: string | null;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  status: 'invited' | 'onboarding' | 'active' | 'suspended';
  invited_at: string | null;
  activated_at: string | null;
  created_at: string;
}

export interface PartnerScore {
  id: string;
  partner_id: string;
  title: string;
  composer: string | null;
  arranger: string | null;
  voicing: string | null;
  ensemble_type: string | null;
  difficulty_grade: string | null;
  language: string | null;
  description: string | null;
  tags: string[] | null;
  price_cents: number;
  currency: string;
  master_storage_path: string;
  thumbnail_storage_path: string | null;
  sample_audio_storage_path: string | null;
  page_count: number | null;
  status: 'draft' | 'published' | 'unlisted' | 'removed';
  created_at: string;
  updated_at: string;
}

export interface PartnerInvite {
  id: string;
  email: string;
  display_name: string | null;
  invited_by: string | null;
  token: string;
  expires_at: string;
  redeemed_at: string | null;
  redeemed_by_user_id: string | null;
  created_at: string;
}

// Flat 50% platform fee. Payout absorbs any 1-cent remainder so
// platform_fee + partner_payout ALWAYS equals price.
export function platformFeeCents(priceCents: number): number {
  return Math.floor(priceCents / 2);
}
export function partnerPayoutCents(priceCents: number): number {
  return priceCents - platformFeeCents(priceCents);
}

export function useMyPartner(): UseQueryResult<Partner | null> {
  return useQuery({
    queryKey: ['my-partner'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_partners')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return (data as Partner | null) ?? null;
    },
  });
}

export function useMyPartnerScores(status?: PartnerScore['status']): UseQueryResult<PartnerScore[]> {
  return useQuery({
    queryKey: ['my-partner-scores', status ?? 'all'],
    queryFn: async () => {
      let q = supabase.from('gw_partner_scores').select('*').order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PartnerScore[];
    },
  });
}

interface UpdateSelfArgs {
  display_name: string;
  bio: string | null;
  website_url: string | null;
  contact_email: string | null;
  logo_storage_path: string | null;
}

export function useUpdateMyPartner(): UseMutationResult<Partner, Error, UpdateSelfArgs> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args) => {
      const { data, error } = await supabase.rpc('partner_update_self', {
        p_display_name: args.display_name,
        p_bio: args.bio,
        p_website_url: args.website_url,
        p_contact_email: args.contact_email,
        p_logo_storage_path: args.logo_storage_path,
      });
      if (error) throw error;
      return data as Partner;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-partner'] }),
  });
}

export function useInvitePartner(): UseMutationResult<{ id: string; token: string }, Error, { email: string; display_name?: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args) => {
      const { data, error } = await supabase.functions.invoke<{ id: string; token: string }>(
        'partner-invite-send', { body: args }
      );
      if (error) throw error;
      if (!data) throw new Error('empty response');
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partner-invites'] }),
  });
}

export function useListPartnerInvites(): UseQueryResult<PartnerInvite[]> {
  return useQuery({
    queryKey: ['partner-invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_partner_invites')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PartnerInvite[];
    },
  });
}

export function useListPartners(): UseQueryResult<Partner[]> {
  return useQuery({
    queryKey: ['partners-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_partners')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Partner[];
    },
  });
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/lib/partner/__tests__/api.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/partner/
git commit -m "feat(partner): client API hooks + 50/50 fee math"
```

---

## Task 6: Admin invite flow — page + edge fn

**Files:**
- Create: `src/pages/admin/PartnersAdmin.tsx`
- Create: `supabase/functions/partner-invite-send/index.ts`
- Modify: `src/App.tsx` — add route `/admin/partners`.

**Interfaces:**
- Consumes: `useInvitePartner()`, `useListPartnerInvites()`, `useListPartners()`.
- Produces:
  - Admin page at `/admin/partners` — invite form (email + suggested display name) + partner list + invite list.
  - Edge fn `partner-invite-send`:
    - Body: `{ email: string, display_name?: string }`.
    - Auth: requires admin (checks JWT → looks up `gw_profiles.is_admin | is_super_admin`).
    - Behavior: generates 32-byte URL-safe token, inserts `gw_partner_invites` row, sends Resend email with `https://<host>/partner/invite/<token>` link.
    - Response: `{ id: string, token: string }`.

- [ ] **Step 1: Write the edge fn**

Create `supabase/functions/partner-invite-send/index.ts`:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_HOST = Deno.env.get("APP_HOST") ?? "https://gleeworld.org";
const FROM_ADDRESS = Deno.env.get("PARTNER_INVITE_FROM") ?? "GleeWorld <noreply@gleeworld.org>";

function b64url(bytes: Uint8Array): string {
  let s = ""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userErr } = await supa.auth.getUser(jwt);
  if (userErr || !userData.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  // Verify admin
  const supaSvc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: prof } = await supaSvc.from("gw_profiles").select("is_admin,is_super_admin").eq("user_id", userData.user.id).single();
  if (!prof || (!prof.is_admin && !prof.is_super_admin)) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const display_name = body.display_name ? String(body.display_name).trim() : null;
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return new Response(JSON.stringify({ error: "invalid email" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  const tokenBytes = new Uint8Array(32); crypto.getRandomValues(tokenBytes);
  const token = b64url(tokenBytes);

  const { data: invite, error: insErr } = await supaSvc
    .from("gw_partner_invites")
    .insert({ email, display_name, invited_by: userData.user.id, token })
    .select("id, token")
    .single();
  if (insErr) return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });

  const link = `${APP_HOST}/partner/invite/${token}`;
  const emailBody = `
    <p>Hi${display_name ? " " + display_name : ""},</p>
    <p>Kevin at GleeWorld invited you to sell your scores in the composer store. Click below to set up your storefront and payouts:</p>
    <p><a href="${link}">${link}</a></p>
    <p>The link expires in 30 days.</p>
    <p>— GleeWorld</p>
  `;

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: FROM_ADDRESS, to: email,
      subject: "Your GleeWorld composer store invite",
      html: emailBody,
    }),
  });
  if (!emailRes.ok) {
    // Row is still there — Kevin can copy the link from admin UI.
    return new Response(JSON.stringify({ id: invite.id, token: invite.token, email_error: await emailRes.text() }), {
      status: 200, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ id: invite.id, token: invite.token }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
```

- [ ] **Step 2: Deploy edge fn**

```bash
scp -r ~/Documents/GitHub/gleeworld-repertoire/supabase/functions/partner-invite-send \
  root@supabase.gleeworld.org:/opt/supabase/volumes/functions/
ssh root@supabase.gleeworld.org "docker restart supabase-edge-functions"
```

Expected: no errors.

- [ ] **Step 3: Write the admin page**

Create `src/pages/admin/PartnersAdmin.tsx`:

```tsx
import { useState } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInvitePartner, useListPartnerInvites, useListPartners } from '@/lib/partner/api';

const APP_HOST = window.location.origin;

export default function PartnersAdmin() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const invite = useInvitePartner();
  const invites = useListPartnerInvites();
  const partners = useListPartners();

  const submit = () => {
    if (!email.trim()) return;
    invite.mutate(
      { email: email.trim(), display_name: displayName.trim() || undefined },
      {
        onSuccess: (res) => {
          toast.success(`Invite sent to ${email}`);
          navigator.clipboard.writeText(`${APP_HOST}/partner/invite/${res.token}`).catch(() => {});
          setEmail(''); setDisplayName('');
        },
        onError: (err) => toast.error(`Invite failed: ${err.message}`),
      },
    );
  };

  const copyLink = (token: string) => {
    const url = `${APP_HOST}/partner/invite/${token}`;
    navigator.clipboard.writeText(url).then(() => toast.info('Invite link copied'));
  };

  return (
    <DashboardPageShell title="Partners" subtitle="Invite composers to sell scores in the GleeWorld store">
      <Card>
        <CardHeader><CardTitle className="text-sm">Invite a new partner</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="pa-email" className="text-xs">Email *</Label>
              <Input id="pa-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pa-name" className="text-xs">Display name (optional)</Label>
              <Input id="pa-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
          </div>
          <Button disabled={invite.isPending || !email.trim()} onClick={submit}>
            Send invite
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-sm">Open invites</CardTitle></CardHeader>
        <CardContent>
          {invites.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {invites.data && invites.data.filter(i => !i.redeemed_at).length === 0 && (
            <p className="text-xs text-muted-foreground">No open invites.</p>
          )}
          <ul className="space-y-2">
            {(invites.data ?? []).filter(i => !i.redeemed_at).map((i) => (
              <li key={i.id} className="flex items-center justify-between text-sm">
                <span>{i.email}{i.display_name ? ` (${i.display_name})` : ''}</span>
                <Button size="sm" variant="ghost" onClick={() => copyLink(i.token)}>
                  <Copy className="w-3 h-3 mr-1" /> Copy link
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-sm">Partners</CardTitle></CardHeader>
        <CardContent>
          {partners.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {partners.data && partners.data.length === 0 && (
            <p className="text-xs text-muted-foreground">No partners yet.</p>
          )}
          <ul className="space-y-2">
            {(partners.data ?? []).map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span>{p.display_name}</span>
                <Badge variant={p.status === 'active' ? 'default' : 'outline'} className="text-xs">{p.status}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </DashboardPageShell>
  );
}
```

- [ ] **Step 4: Register route in `src/App.tsx`**

Add near existing admin routes (search for `AdminOnlyRoute` in App.tsx):

```tsx
const PartnersAdmin = lazy(() => import("./pages/admin/PartnersAdmin"));
```

Add route (inside the authenticated route tree):

```tsx
<Route
  path="/admin/partners"
  element={
    <ProtectedRoute>
      <AdminOnlyRoute>
        <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
          <DashboardShell><PartnersAdmin /></DashboardShell>
        </UniversalLayout>
      </AdminOnlyRoute>
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 5: Typecheck + manual verify**

```bash
cd ~/Documents/GitHub/gleeworld-repertoire
npx tsc --noEmit
```

Expected: clean. Then hard-refresh `/admin/partners` as super-admin and send an invite to a throwaway email; verify:
- Row appears in "Open invites"
- Toast says "Invite sent"
- Copy-link button copies a `/partner/invite/<token>` URL

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/partner-invite-send/ src/pages/admin/PartnersAdmin.tsx src/App.tsx
git commit -m "feat(partner): admin invite page + partner-invite-send edge fn"
```

---

## Task 7: Invite redemption — page + edge fn

**Files:**
- Create: `src/pages/partner/PartnerInviteRedeem.tsx`
- Create: `supabase/functions/partner-invite-redeem/index.ts`
- Modify: `src/App.tsx` — add route `/partner/invite/:token`.

**Interfaces:**
- Produces:
  - Page at `/partner/invite/:token` that:
    - If unauthed: prompts sign-in with email prefilled from invite.
    - If authed: calls redeem edge fn; on success, redirects to `/partner`.
  - Edge fn `partner-invite-redeem`:
    - Body: `{ token: string }`.
    - Auth: requires authed JWT.
    - Behavior: verifies token (unexpired, unredeemed, email matches auth user's email), inserts `gw_partners` row with `status='onboarding'`, marks invite redeemed.
    - Response: `{ partner_id: string }`.

- [ ] **Step 1: Write the edge fn**

Create `supabase/functions/partner-invite-redeem/index.ts`:

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
  const { data: userData, error: userErr } = await supa.auth.getUser(jwt);
  if (userErr || !userData.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { token } = await req.json().catch(() => ({ token: "" }));
  if (!token) return new Response(JSON.stringify({ error: "token required" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { data: invite, error: invErr } = await supa
    .from("gw_partner_invites").select("*").eq("token", token).maybeSingle();
  if (invErr || !invite) return new Response(JSON.stringify({ error: "invalid token" }), { status: 404, headers: { ...corsHeaders, "content-type": "application/json" } });
  if (invite.redeemed_at) return new Response(JSON.stringify({ error: "already redeemed" }), { status: 409, headers: { ...corsHeaders, "content-type": "application/json" } });
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return new Response(JSON.stringify({ error: "expired" }), { status: 410, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
  if (invite.email.toLowerCase() !== (userData.user.email ?? "").toLowerCase()) {
    return new Response(JSON.stringify({ error: "email mismatch" }), { status: 403, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  const displayName = invite.display_name ?? userData.user.email?.split("@")[0] ?? "Composer";
  const { data: partner, error: pErr } = await supa
    .from("gw_partners")
    .insert({
      user_id: userData.user.id,
      display_name: displayName,
      contact_email: userData.user.email,
      status: "onboarding",
      invite_token: null,
      invited_at: invite.created_at,
    })
    .select("id")
    .single();
  if (pErr) return new Response(JSON.stringify({ error: pErr.message }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });

  await supa
    .from("gw_partner_invites")
    .update({ redeemed_at: new Date().toISOString(), redeemed_by_user_id: userData.user.id })
    .eq("id", invite.id);

  return new Response(JSON.stringify({ partner_id: partner.id }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
```

- [ ] **Step 2: Deploy edge fn**

```bash
scp -r ~/Documents/GitHub/gleeworld-repertoire/supabase/functions/partner-invite-redeem \
  root@supabase.gleeworld.org:/opt/supabase/volumes/functions/
ssh root@supabase.gleeworld.org "docker restart supabase-edge-functions"
```

- [ ] **Step 3: Write the redemption page**

Create `src/pages/partner/PartnerInviteRedeem.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function PartnerInviteRedeem() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'checking'|'need-signin'|'redeeming'|'error'>('checking');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStatus('need-signin'); return; }
      setStatus('redeeming');
      try {
        const { data, error } = await supabase.functions.invoke<{ partner_id: string; error?: string }>(
          'partner-invite-redeem', { body: { token } }
        );
        if (error || !data || data.error) {
          const msg = data?.error ?? error?.message ?? 'redeem failed';
          setMessage(msg); setStatus('error'); return;
        }
        toast.success('Welcome to the GleeWorld composer store');
        navigate('/partner?welcome=1');
      } catch (e) {
        setMessage(e instanceof Error ? e.message : String(e)); setStatus('error');
      }
    })();
  }, [token, navigate]);

  return (
    <DashboardPageShell title="Composer store invite">
      {status === 'checking' && <p className="text-sm text-muted-foreground">Checking your invite…</p>}
      {status === 'redeeming' && <p className="text-sm text-muted-foreground">Setting up your partner account…</p>}
      {status === 'need-signin' && (
        <div className="space-y-3">
          <p className="text-sm">Sign in with the email address that received the invite to continue.</p>
          <Button onClick={() => navigate(`/login?next=${encodeURIComponent(`/partner/invite/${token}`)}`)}>Sign in</Button>
        </div>
      )}
      {status === 'error' && (
        <div className="space-y-3">
          <p className="text-sm text-destructive">Couldn't redeem: {message}</p>
          <p className="text-xs text-muted-foreground">Ask Kevin to send a fresh invite.</p>
        </div>
      )}
    </DashboardPageShell>
  );
}
```

- [ ] **Step 4: Register route in `src/App.tsx`**

```tsx
const PartnerInviteRedeem = lazy(() => import("./pages/partner/PartnerInviteRedeem"));
```

Add route (does NOT need `AdminOnlyRoute`):

```tsx
<Route
  path="/partner/invite/:token"
  element={
    <ProtectedRoute>
      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
        <DashboardShell><PartnerInviteRedeem /></DashboardShell>
      </UniversalLayout>
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 5: Typecheck + verify**

```bash
cd ~/Documents/GitHub/gleeworld-repertoire
npx tsc --noEmit
```

Manually: from `/admin/partners`, invite a real (throwaway) email you can receive at. Click the link → auth flow → verify a `gw_partners` row is created with `status='onboarding'`:

```bash
ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres \
  -c \"SELECT id, display_name, status FROM gw_partners ORDER BY created_at DESC LIMIT 3;\""
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/partner/PartnerInviteRedeem.tsx supabase/functions/partner-invite-redeem/ src/App.tsx
git commit -m "feat(partner): invite redemption page + partner-invite-redeem edge fn"
```

---

## Task 8: Stripe Connect Express onboarding

**Files:**
- Create: `supabase/functions/partner-connect-onboarding/index.ts`
- Create: `supabase/functions/partner-connect-refresh/index.ts`
- Modify: `src/lib/partner/api.ts` — add `useStartConnectOnboarding`, `useRefreshConnectStatus` mutations.

**Interfaces:**
- Consumes: `STRIPE_SECRET_KEY` env var; `gw_partners`.
- Produces:
  - `partner-connect-onboarding` — creates a Stripe Express account for the caller, saves `stripe_connect_id`, returns hosted onboarding URL.
    - Body: `{}` (uses JWT for caller identity).
    - Response: `{ onboarding_url: string }`.
  - `partner-connect-refresh` — reads current Stripe state, mirrors `charges_enabled` and `payouts_enabled` onto the row, promotes `status` to `active` when both true.
    - Body: `{}`.
    - Response: `{ status: string, charges_enabled: bool, payouts_enabled: bool, express_dashboard_url: string | null }`.

- [ ] **Step 1: Kevin: enable Stripe Connect on the account**

Log into Stripe dashboard → Connect → Get started → enable "Express" accounts. This is a one-click toggle. Also ensure `STRIPE_SECRET_KEY` is in `/opt/supabase/.env` (should already be, per `reference_stripe_account`).

Add to `.env` if missing:
```bash
ssh root@supabase.gleeworld.org "grep -q STRIPE_SECRET_KEY /opt/supabase/.env && echo present || echo MISSING"
```

If MISSING: Kevin adds it. Do not proceed until confirmed present.

- [ ] **Step 2: Write partner-connect-onboarding**

Create `supabase/functions/partner-connect-onboarding/index.ts`:

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: userData } = await supa.auth.getUser(jwt);
  if (!userData.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { data: partner, error: pErr } = await supa
    .from("gw_partners").select("*").eq("user_id", userData.user.id).maybeSingle();
  if (pErr || !partner) return new Response(JSON.stringify({ error: "not a partner" }), { status: 403, headers: { ...corsHeaders, "content-type": "application/json" } });

  let acct_id = partner.stripe_connect_id;
  if (!acct_id) {
    const acct = await stripe.accounts.create({
      type: "express",
      email: partner.contact_email ?? userData.user.email ?? undefined,
      metadata: { partner_id: partner.id, user_id: userData.user.id },
    });
    acct_id = acct.id;
    await supa.from("gw_partners").update({ stripe_connect_id: acct_id }).eq("id", partner.id);
  }

  const link = await stripe.accountLinks.create({
    account: acct_id,
    refresh_url: `${APP_HOST}/partner?stripe=refresh`,
    return_url: `${APP_HOST}/partner?stripe=done`,
    type: "account_onboarding",
  });

  return new Response(JSON.stringify({ onboarding_url: link.url }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
```

- [ ] **Step 3: Write partner-connect-refresh**

Create `supabase/functions/partner-connect-refresh/index.ts`:

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: userData } = await supa.auth.getUser(jwt);
  if (!userData.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { data: partner } = await supa
    .from("gw_partners").select("*").eq("user_id", userData.user.id).maybeSingle();
  if (!partner || !partner.stripe_connect_id) {
    return new Response(JSON.stringify({ error: "no connect account" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  const acct = await stripe.accounts.retrieve(partner.stripe_connect_id);
  const charges_enabled = !!acct.charges_enabled;
  const payouts_enabled = !!acct.payouts_enabled;
  const nextStatus = (charges_enabled && payouts_enabled)
    ? "active" : (partner.status === "invited" ? "onboarding" : partner.status);
  const activatedAt = (nextStatus === "active" && partner.status !== "active") ? new Date().toISOString() : null;

  await supa.from("gw_partners").update({
    stripe_charges_enabled: charges_enabled,
    stripe_payouts_enabled: payouts_enabled,
    status: nextStatus,
    ...(activatedAt ? { activated_at: activatedAt } : {}),
  }).eq("id", partner.id);

  let express_dashboard_url: string | null = null;
  if (charges_enabled) {
    const loginLink = await stripe.accounts.createLoginLink(partner.stripe_connect_id);
    express_dashboard_url = loginLink.url;
  }

  return new Response(JSON.stringify({
    status: nextStatus, charges_enabled, payouts_enabled, express_dashboard_url,
  }), { headers: { ...corsHeaders, "content-type": "application/json" } });
});
```

- [ ] **Step 4: Deploy both fns**

```bash
scp -r ~/Documents/GitHub/gleeworld-repertoire/supabase/functions/partner-connect-onboarding \
      ~/Documents/GitHub/gleeworld-repertoire/supabase/functions/partner-connect-refresh \
  root@supabase.gleeworld.org:/opt/supabase/volumes/functions/
ssh root@supabase.gleeworld.org "docker restart supabase-edge-functions"
```

- [ ] **Step 5: Add mutation hooks to `src/lib/partner/api.ts`**

Append to `src/lib/partner/api.ts`:

```typescript
export function useStartConnectOnboarding(): UseMutationResult<{ onboarding_url: string }, Error, void> {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<{ onboarding_url: string }>(
        'partner-connect-onboarding', { body: {} });
      if (error) throw error;
      if (!data) throw new Error('empty response');
      return data;
    },
  });
}

interface ConnectRefreshResult {
  status: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  express_dashboard_url: string | null;
}
export function useRefreshConnectStatus(): UseMutationResult<ConnectRefreshResult, Error, void> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<ConnectRefreshResult>(
        'partner-connect-refresh', { body: {} });
      if (error) throw error;
      if (!data) throw new Error('empty response');
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-partner'] }),
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/partner-connect-onboarding/ supabase/functions/partner-connect-refresh/ src/lib/partner/api.ts
git commit -m "feat(partner): Stripe Connect Express onboarding + status-refresh edge fns"
```

---

## Task 9: Partner portal shell + nav

**Files:**
- Create: `src/pages/partner/PartnerPortal.tsx`
- Modify: `src/App.tsx` — add route `/partner`.
- Modify: `src/lib/navigation/navCatalog.ts` — add nav entry.
- Modify: `src/lib/navigation/__tests__/appDestinations.test.ts` — add new routes.

**Interfaces:**
- Consumes: `useMyPartner`, `useStartConnectOnboarding`, `useRefreshConnectStatus`.
- Produces: page at `/partner` — shows onboarding CTA when needed, Stripe Express link when active, tabs for Profile / Scores (Task 10 fills them).

- [ ] **Step 1: Write PartnerPortal.tsx**

Create `src/pages/partner/PartnerPortal.tsx`:

```tsx
import { useEffect } from 'react';
import { useSearchParams, NavLink, Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { ExternalLink, RefreshCw } from 'lucide-react';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMyPartner, useStartConnectOnboarding, useRefreshConnectStatus } from '@/lib/partner/api';

export default function PartnerPortal() {
  const { data: partner, isLoading } = useMyPartner();
  const [params] = useSearchParams();
  const start = useStartConnectOnboarding();
  const refresh = useRefreshConnectStatus();
  const location = useLocation();

  // On return from Stripe onboarding, refresh status.
  useEffect(() => {
    if (params.get('stripe') === 'done') {
      refresh.mutate(undefined, {
        onSuccess: (r) => {
          if (r.status === 'active') toast.success('You\'re live — your storefront is ready.');
          else toast.info('Still finalizing with Stripe. Try again in a moment.');
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('stripe')]);

  if (isLoading) return <DashboardPageShell title="Partner portal"><p>Loading…</p></DashboardPageShell>;
  if (!partner) return (
    <DashboardPageShell title="Partner portal">
      <p className="text-sm text-muted-foreground">You're not a partner yet. Ask Kevin for an invite.</p>
    </DashboardPageShell>
  );

  const isActive = partner.status === 'active';
  const needsOnboarding = partner.status === 'onboarding' && (!partner.stripe_charges_enabled || !partner.stripe_payouts_enabled);

  const kickOff = () => start.mutate(undefined, {
    onSuccess: (r) => { window.location.href = r.onboarding_url; },
    onError: (e) => toast.error(`Stripe: ${e.message}`),
  });

  const openDashboard = () => refresh.mutate(undefined, {
    onSuccess: (r) => {
      if (r.express_dashboard_url) window.open(r.express_dashboard_url, '_blank');
      else toast.info('Dashboard is available once your account is live.');
    },
  });

  return (
    <DashboardPageShell title={partner.display_name} subtitle="Composer store partner portal">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Payout status</CardTitle>
          <Badge variant={isActive ? 'default' : 'outline'} className="text-xs">{partner.status}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {needsOnboarding && (
            <>
              <p className="text-sm">Finish Stripe onboarding to start selling. Stripe collects the info you need to receive payouts; we never see it.</p>
              <Button disabled={start.isPending} onClick={kickOff}>Continue on Stripe</Button>
            </>
          )}
          {isActive && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={openDashboard} disabled={refresh.isPending}>
                <ExternalLink className="w-3 h-3 mr-1" /> Open Stripe dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
                <RefreshCw className="w-3 h-3 mr-1" /> Refresh status
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4 border-b mb-4">
        <NavLink to="/partner/profile"
          className={({ isActive: a }) => `text-sm pb-2 ${a || location.pathname === '/partner' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}>
          Profile
        </NavLink>
        <NavLink to="/partner/scores"
          className={({ isActive: a }) => `text-sm pb-2 ${a ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}>
          Scores
        </NavLink>
      </div>

      <Outlet />
    </DashboardPageShell>
  );
}
```

- [ ] **Step 2: Register routes in `src/App.tsx`**

```tsx
const PartnerPortal = lazy(() => import("./pages/partner/PartnerPortal"));
const PartnerProfile = lazy(() => import("./pages/partner/PartnerProfile"));
const PartnerScoresList = lazy(() => import("./pages/partner/PartnerScoresList"));
const PartnerScoreUpload = lazy(() => import("./pages/partner/PartnerScoreUpload"));
```

Add nested routes:

```tsx
<Route
  path="/partner"
  element={
    <ProtectedRoute>
      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
        <DashboardShell><PartnerPortal /></DashboardShell>
      </UniversalLayout>
    </ProtectedRoute>
  }
>
  <Route index element={<PartnerProfile />} />
  <Route path="profile" element={<PartnerProfile />} />
  <Route path="scores" element={<PartnerScoresList />} />
  <Route path="scores/new" element={<PartnerScoreUpload />} />
</Route>
```

- [ ] **Step 3: Nav entry in `src/lib/navigation/navCatalog.ts`**

Import `Store` from lucide:

```typescript
  ..., Store, ...
```

Add entry to `NAV_CATALOG` (near partner-related section — use `music` section for now, gated by `is_partner`):

```typescript
  { key: 'partner-portal', to: '/partner', label: 'Partner Portal', icon: Store, section: 'music', tone: 'bg-emerald-50 text-emerald-700', tourId: 'nav-partner-portal', gate: { partnerOnly: true } as any },
```

You'll also need to extend the `NavGate` type in the same file to include `partnerOnly?: boolean`, and update the gate-checking logic in `appDestinations.ts` to honor it (look up `is_partner` from the auth/user context). If that plumbing is nontrivial, ship the nav entry without the gate and rely on the page itself showing "you're not a partner" — cleaner than a half-baked gate.

- [ ] **Step 4: Register route in appDestinations test**

Modify `src/lib/navigation/__tests__/appDestinations.test.ts` — add to `KNOWN_ROUTES`:

```typescript
  '/partner', '/admin/partners',
```

- [ ] **Step 5: Typecheck**

```bash
cd ~/Documents/GitHub/gleeworld-repertoire
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/partner/PartnerPortal.tsx src/App.tsx src/lib/navigation/
git commit -m "feat(partner): partner portal shell + nav entry + routes"
```

---

## Task 10: Partner profile edit

**Files:**
- Create: `src/pages/partner/PartnerProfile.tsx`
- Create: `src/components/partner/LogoUploadField.tsx`

**Interfaces:**
- Consumes: `useMyPartner`, `useUpdateMyPartner`, `supabase.storage`.
- Produces: form to edit display_name / bio / website_url / contact_email / logo.

- [ ] **Step 1: Write LogoUploadField**

Create `src/components/partner/LogoUploadField.tsx`:

```tsx
import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const ASSETS_BUCKET = 'partner-assets';

interface Props {
  partnerId: string;
  currentPath: string | null;
  onUploaded: (path: string) => void;
}

export function LogoUploadField({ partnerId, currentPath, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const publicUrl = currentPath
    ? supabase.storage.from(ASSETS_BUCKET).getPublicUrl(currentPath).data.publicUrl
    : null;

  const onFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Pick an image'); return; }
    const ext = file.name.split('.').pop() || 'png';
    const path = `${partnerId}/logo.${ext}`;
    const { error } = await supabase.storage.from(ASSETS_BUCKET).upload(path, file, { upsert: true });
    if (error) { toast.error(`Upload failed: ${error.message}`); return; }
    onUploaded(path);
  };

  return (
    <div className="flex items-center gap-3">
      {publicUrl ? (
        <img src={publicUrl} alt="Logo" className="w-16 h-16 rounded border object-cover" />
      ) : (
        <div className="w-16 h-16 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">No logo</div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && onFile(e.target.files[0])} />
      <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>Upload</Button>
    </div>
  );
}
```

- [ ] **Step 2: Write PartnerProfile.tsx**

```tsx
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useMyPartner, useUpdateMyPartner } from '@/lib/partner/api';
import { LogoUploadField } from '@/components/partner/LogoUploadField';

export default function PartnerProfile() {
  const { data: partner } = useMyPartner();
  const update = useUpdateMyPartner();
  const [form, setForm] = useState({
    display_name: '', bio: '', website_url: '', contact_email: '', logo_storage_path: null as string | null,
  });

  useEffect(() => {
    if (partner) setForm({
      display_name: partner.display_name,
      bio: partner.bio ?? '',
      website_url: partner.website_url ?? '',
      contact_email: partner.contact_email ?? '',
      logo_storage_path: partner.logo_storage_path,
    });
  }, [partner]);

  if (!partner) return null;

  const save = () => update.mutate({
    display_name: form.display_name,
    bio: form.bio || null,
    website_url: form.website_url || null,
    contact_email: form.contact_email || null,
    logo_storage_path: form.logo_storage_path,
  }, {
    onSuccess: () => toast.success('Profile saved'),
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-1">
          <Label className="text-xs">Logo</Label>
          <LogoUploadField
            partnerId={partner.id}
            currentPath={form.logo_storage_path}
            onUploaded={(path) => setForm({ ...form, logo_storage_path: path })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pp-name" className="text-xs">Display name *</Label>
          <Input id="pp-name" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pp-bio" className="text-xs">Bio</Label>
          <Textarea id="pp-bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="pp-web" className="text-xs">Website</Label>
            <Input id="pp-web" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pp-email" className="text-xs">Contact email</Label>
            <Input id="pp-email" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          </div>
        </div>
        <Button disabled={update.isPending || !form.display_name.trim()} onClick={save}>Save</Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/partner/PartnerProfile.tsx src/components/partner/LogoUploadField.tsx
git commit -m "feat(partner): profile edit page + logo upload"
```

---

## Task 11: Score upload + postprocess edge fn

**Files:**
- Create: `src/pages/partner/PartnerScoreUpload.tsx`
- Create: `supabase/functions/partner-score-postprocess/index.ts`
- Modify: `src/lib/partner/api.ts` — add `useCreatePartnerScore` mutation.

**Interfaces:**
- Consumes: `supabase.storage`, `gw_partner_scores`.
- Produces:
  - Upload wizard: PDF drop → upload to `partner-scores-master/<partner_id>/<uuid>.pdf` → INSERT `gw_partner_scores` row with `status='draft'` → invoke `partner-score-postprocess` fn asynchronously.
  - `partner-score-postprocess` edge fn:
    - Body: `{ score_id: string }`.
    - Reads master PDF, extracts page count via `pdf-lib`, rasterizes page 1 as a watermarked PNG stored at `partner-assets/<partner_id>/thumbs/<score_id>.png`. Updates `gw_partner_scores.page_count` and `thumbnail_storage_path`.

- [ ] **Step 1: Write partner-score-postprocess**

Create `supabase/functions/partner-score-postprocess/index.ts`:

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
  const { score_id } = await req.json().catch(() => ({}));
  if (!score_id) return new Response(JSON.stringify({ error: "score_id required" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { data: score, error } = await supa
    .from("gw_partner_scores").select("*").eq("id", score_id).single();
  if (error || !score) return new Response(JSON.stringify({ error: "score not found" }), { status: 404, headers: { ...corsHeaders, "content-type": "application/json" } });

  // Fetch master PDF
  const { data: pdfBlob, error: dlErr } = await supa.storage
    .from("partner-scores-master").download(score.master_storage_path);
  if (dlErr || !pdfBlob) return new Response(JSON.stringify({ error: "master download failed" }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });

  const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pageCount = pdfDoc.getPageCount();

  // Watermark page 1 and export as a single-page PDF thumbnail
  // (PNG rasterization isn't available in pure pdf-lib on Deno without
  //  a native raster dep; a watermarked single-page PDF is a good v1
  //  thumbnail — buyers see the composer's actual page 1 with a stamp.)
  const thumbDoc = await PDFDocument.create();
  const [copiedPage] = await thumbDoc.copyPages(pdfDoc, [0]);
  thumbDoc.addPage(copiedPage);

  const helv = await thumbDoc.embedFont(StandardFonts.Helvetica);
  const page = thumbDoc.getPage(0);
  const { width } = page.getSize();
  page.drawText("Sample — GleeWorld Composer Store", {
    x: 20, y: 12, size: 9, font: helv, color: rgb(0.5, 0.5, 0.5),
  });
  page.drawRectangle({
    x: 0, y: 0, width, height: 22, borderWidth: 0, opacity: 0.05,
    color: rgb(0.9, 0.9, 0.9),
  });

  const thumbBytes = await thumbDoc.save();
  const thumbPath = `${score.partner_id}/thumbs/${score.id}.pdf`;
  const { error: upErr } = await supa.storage
    .from("partner-assets")
    .upload(thumbPath, thumbBytes, { contentType: "application/pdf", upsert: true });
  if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });

  await supa.from("gw_partner_scores").update({
    page_count: pageCount,
    thumbnail_storage_path: thumbPath,
  }).eq("id", score.id);

  return new Response(JSON.stringify({ page_count: pageCount, thumbnail_storage_path: thumbPath }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
```

- [ ] **Step 2: Deploy edge fn**

```bash
scp -r ~/Documents/GitHub/gleeworld-repertoire/supabase/functions/partner-score-postprocess \
  root@supabase.gleeworld.org:/opt/supabase/volumes/functions/
ssh root@supabase.gleeworld.org "docker restart supabase-edge-functions"
```

- [ ] **Step 3: Add `useCreatePartnerScore` in api.ts**

Append to `src/lib/partner/api.ts`:

```typescript
export interface CreateScoreArgs {
  title: string;
  composer: string | null;
  arranger: string | null;
  voicing: string | null;
  ensemble_type: string | null;
  difficulty_grade: string | null;
  description: string | null;
  tags: string[] | null;
  price_cents: number;
  master_storage_path: string;
}

export function useCreatePartnerScore(): UseMutationResult<{ id: string }, Error, CreateScoreArgs> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args) => {
      // Partner id resolves via RLS (partner_id = my_partner_id()).
      // Explicit partner_id fetch avoids the client sending a wrong value.
      const { data: me } = await supabase.rpc('my_partner_id');
      const partnerId = me as string | null;
      if (!partnerId) throw new Error('not a partner');

      const { data, error } = await supabase.from('gw_partner_scores').insert({
        partner_id: partnerId,
        title: args.title,
        composer: args.composer,
        arranger: args.arranger,
        voicing: args.voicing,
        ensemble_type: args.ensemble_type,
        difficulty_grade: args.difficulty_grade,
        description: args.description,
        tags: args.tags,
        price_cents: args.price_cents,
        master_storage_path: args.master_storage_path,
        status: 'draft',
      }).select('id').single();
      if (error) throw error;

      // Fire-and-forget postprocess. Errors don't block the create.
      supabase.functions.invoke('partner-score-postprocess', { body: { score_id: data.id } }).catch(() => {});
      return { id: data.id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-partner-scores'] }),
  });
}
```

- [ ] **Step 4: Write PartnerScoreUpload.tsx**

```tsx
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, UploadCloud } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useMyPartner, useCreatePartnerScore } from '@/lib/partner/api';

const MASTER_BUCKET = 'partner-scores-master';

export default function PartnerScoreUpload() {
  const { data: partner } = useMyPartner();
  const navigate = useNavigate();
  const create = useCreatePartnerScore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '', composer: '', arranger: '', voicing: '',
    ensemble_type: '', difficulty_grade: '',
    description: '', tags: '', price: '5.00',
  });

  if (!partner) return null;

  const upload = async (file: File) => {
    if (file.type !== 'application/pdf') { toast.error('PDF only'); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error('Max 50 MB'); return; }
    setUploading(true);
    const id = crypto.randomUUID();
    const path = `${partner.id}/${id}.pdf`;
    const { error } = await supabase.storage.from(MASTER_BUCKET).upload(path, file, { contentType: 'application/pdf' });
    setUploading(false);
    if (error) { toast.error(`Upload failed: ${error.message}`); return; }
    setUploadedPath(path);
    if (!form.title) setForm(f => ({ ...f, title: file.name.replace(/\.pdf$/i, '') }));
  };

  const save = () => {
    if (!uploadedPath) { toast.error('Upload a PDF first'); return; }
    const priceCents = Math.round(parseFloat(form.price || '0') * 100);
    if (!(priceCents >= 100 && priceCents <= 5000)) { toast.error('Price must be $1–$50'); return; }
    create.mutate({
      title: form.title.trim(),
      composer: form.composer.trim() || null,
      arranger: form.arranger.trim() || null,
      voicing: form.voicing.trim() || null,
      ensemble_type: form.ensemble_type || null,
      difficulty_grade: form.difficulty_grade.trim() || null,
      description: form.description.trim() || null,
      tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
      price_cents: priceCents,
      master_storage_path: uploadedPath,
    }, {
      onSuccess: () => { toast.success('Draft saved'); navigate('/partner/scores'); },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <input ref={inputRef} type="file" accept="application/pdf" className="hidden"
                 onChange={(e) => e.target.files && upload(e.target.files[0])} />
          {!uploadedPath ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <UploadCloud className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm">Upload the clean PDF of your score.</p>
              <p className="text-xs text-muted-foreground mb-3">Max 50 MB · will not be publicly served</p>
              <Button disabled={uploading} onClick={() => inputRef.current?.click()}>
                {uploading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Choose PDF
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Uploaded: {uploadedPath.split('/').pop()}</div>
          )}
        </div>

        {uploadedPath && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label htmlFor="ps-title" className="text-xs">Title *</Label>
                <Input id="ps-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ps-composer" className="text-xs">Composer</Label>
                <Input id="ps-composer" value={form.composer} onChange={(e) => setForm({ ...form, composer: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ps-arranger" className="text-xs">Arranger</Label>
                <Input id="ps-arranger" value={form.arranger} onChange={(e) => setForm({ ...form, arranger: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ps-voicing" className="text-xs">Voicing</Label>
                <Input id="ps-voicing" value={form.voicing} onChange={(e) => setForm({ ...form, voicing: e.target.value })} placeholder="SATB" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ensemble</Label>
                <Select value={form.ensemble_type} onValueChange={(v) => setForm({ ...form, ensemble_type: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="choral">Choral</SelectItem>
                    <SelectItem value="band">Band</SelectItem>
                    <SelectItem value="orchestra">Orchestra</SelectItem>
                    <SelectItem value="chamber">Chamber</SelectItem>
                    <SelectItem value="solo">Solo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ps-grade" className="text-xs">Difficulty</Label>
                <Input id="ps-grade" value={form.difficulty_grade} onChange={(e) => setForm({ ...form, difficulty_grade: e.target.value })} placeholder="Grade 3" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ps-price" className="text-xs">Price (USD)</Label>
                <Input id="ps-price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label htmlFor="ps-desc" className="text-xs">Description</Label>
                <Textarea id="ps-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label htmlFor="ps-tags" className="text-xs">Tags (comma-separated)</Label>
                <Input id="ps-tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="christmas, easter, gospel" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">You'll take home 50% of every sale after platform fee.</p>
            <Button disabled={create.isPending || !form.title.trim()} onClick={save}>
              Save as draft
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/partner/PartnerScoreUpload.tsx supabase/functions/partner-score-postprocess/ src/lib/partner/api.ts
git commit -m "feat(partner): score upload wizard + postprocess (page count + PDF thumbnail)"
```

---

## Task 12: Partner scores list

**Files:**
- Create: `src/pages/partner/PartnerScoresList.tsx`

**Interfaces:**
- Consumes: `useMyPartnerScores`.

- [ ] **Step 1: Write PartnerScoresList.tsx**

```tsx
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMyPartnerScores } from '@/lib/partner/api';

export default function PartnerScoresList() {
  const { data: scores, isLoading } = useMyPartnerScores();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Your scores</h2>
        <Button asChild size="sm">
          <Link to="/partner/scores/new"><Plus className="w-4 h-4 mr-1" /> New score</Link>
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {scores && scores.length === 0 && (
        <p className="text-sm text-muted-foreground">You haven't uploaded any scores yet.</p>
      )}
      <div className="grid grid-cols-1 gap-3">
        {(scores ?? []).map((s) => (
          <Card key={s.id}>
            <CardContent className="p-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[s.composer, s.voicing, s.ensemble_type].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs">${(s.price_cents / 100).toFixed(2)}</span>
                <Badge variant={s.status === 'published' ? 'default' : 'outline'} className="text-xs">{s.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + verify all partner pages render**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/partner/PartnerScoresList.tsx
git commit -m "feat(partner): scores list page"
```

---

## Task 13: Deploy Sub-plan 1

**Files:** deploy artifacts only.

- [ ] **Step 1: Push branch to origin**

```bash
cd ~/Documents/GitHub/gleeworld-repertoire
git push
```

- [ ] **Step 2: Build + deploy frontend**

```bash
npm run build
bash scripts/deploy-frontend.sh --skip-build
```

Expected: local + live hashes match.

- [ ] **Step 3: End-to-end smoke test**

Sign in as super-admin on gleeworld.org:
1. Navigate to `/admin/partners`, invite Kevin's throwaway email.
2. Open the email (or copy link from admin UI).
3. Sign in as that email; land on `/partner/invite/:token`. Expect redirect to `/partner`.
4. Click "Continue on Stripe" → complete Stripe Connect Express test-mode onboarding (use Stripe test data).
5. On return, expect status to flip to `active`.
6. Go to Scores → New. Upload a real test PDF (any short PDF). Fill title/price. Save.
7. Confirm the draft row appears in `/partner/scores`.
8. Verify DB row:
```bash
ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres \
  -c \"SELECT title, page_count, thumbnail_storage_path IS NOT NULL AS has_thumb, status FROM gw_partner_scores ORDER BY created_at DESC LIMIT 3;\""
```

Expected: 1 row, page_count > 0, `has_thumb=t`, `status=draft`.

- [ ] **Step 4: Human QA — Kevin**

Ask Kevin to walk through the same flow with his own account (invite himself, do Stripe onboarding in test mode). Confirm friendly errors on: unauthenticated redemption, expired token (manually set expires_at in DB), email mismatch (redeem while signed in as wrong user).

- [ ] **Step 5: Update memory + open PR notes**

Append to `.claude/projects/-Users-kevinjohnson/memory/project_partner_marketplace.md`:
```
Sub-plan 1 (Foundation) SHIPPED YYYY-MM-DD. Kevin can invite → composer onboards on Stripe → uploads PDF drafts.
Sub-plan 2 (Store + purchase) is next.
```

Add to MEMORY.md index.

- [ ] **Step 6: Commit + update PR**

```bash
git commit --allow-empty -m "chore(partner): Sub-plan 1 deployed + verified"
git push
```

---

## Follow-ups (out of scope for Sub-plan 1)

- Sub-plan 2: storefront + Stripe Checkout + webhook + watermark + fulfillment.
- Sub-plan 3: discovery via `repertoire_search()` extension + admin refund UI + `partner-portal` nav gating rewired properly with `partnerOnly` in `NavGate`.
- Thumbnail as PNG instead of PDF (needs a raster dep or a Cloudflare-Workers-like image pipeline).
- Sample audio playback in profile (client uploads to `partner-assets`, path stored on the score).
- Suspending / reactivating partners from `/admin/partners`.
