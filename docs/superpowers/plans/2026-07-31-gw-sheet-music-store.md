# GW Sheet Music Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the partner marketplace as the "GW Sheet Music Store" tab in the Music Library (before Public Domain), give each partner a complete storefront with featured items/owner photo/history, land partners in their store backend by email match at sign-in, and give the platform owner curation controls (featured stores + featured pieces that deep-link to the store of origin).

**Architecture:** Builds on Partner Marketplace sub-plan 1 (PR #302). One new SQL migration adds featured/profile columns, an email-claim RPC, and a widened `partner_update_self`. Frontend: a shared `StoreScoreGrid`, a new `GwStoreTab` rendered both inside the Music Library and at `/store`, an upgraded `/store/partners/:id` storefront, portal additions, and a partner branch in `pickDestination`.

**Tech Stack:** Vite + React 18 + TS, TanStack Query, Supabase (self-hosted), React Router v6, Vitest (jsdom + @testing-library/react), shadcn/Tailwind.

**Spec:** `docs/superpowers/specs/2026-07-31-gw-sheet-music-store-design.md`

## Global Constraints

- Branch: `gw-sheet-music-store` (already exists, spec committed). Never commit to main.
- Partner marketplace tables are **platform-global — NO tenant_id** (per `20260728100000_gw_partners.sql` header). Do not add tenant scoping.
- Tenant-neutral copy: never "Spelman", never "alumnae/alumni" (say "graduates"), marketing says "students".
- Light theme: use tokens (`text-muted-foreground`, `bg-card`, etc.); never dark-navy cards. Never set `color` on bare h1–h6.
- Migrations: new timestamped file only; never edit historical migrations. Claude cannot write to the prod DB — Kevin applies migrations himself (via `!`).
- Every `useMyPartner*` query filters by `my_partner_id()` first.
- Gates: `npm run typecheck:guard` and `npx vitest run <file>` per task; full `npm run test` at the end.
- Deploy (Kevin, later): `bash scripts/deploy-frontend.sh` only — never bare rsync, never `--delete`.
- Commit after every task with the trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: Migration — featured columns, email claim RPC, widened self-update

**Files:**
- Create: `supabase/migrations/20260731100000_gw_store_featured.sql`

**Interfaces:**
- Produces (used by later tasks):
  - Columns: `gw_partners.owner_photo_storage_path text`, `gw_partners.history text`, `gw_partners.featured_order integer`, `gw_partner_scores.partner_featured_order integer`, `gw_partner_scores.gw_featured_order integer`; `gw_partners.user_id` becomes nullable.
  - RPC `partner_claim_by_email() RETURNS uuid` (authenticated).
  - RPC `partner_update_self(p_display_name text, p_bio text, p_website_url text, p_contact_email text, p_logo_storage_path text, p_owner_photo_storage_path text, p_history text) RETURNS gw_partners` — **replaces** the old 5-arg version (dropped to avoid PostgREST overload ambiguity).
  - View `gw_partners_public` gains trailing columns `owner_photo_storage_path, history, featured_order`.

- [ ] **Step 1: Write the migration**

```sql
-- GW Sheet Music Store — featured selections + email-claimed partners.
-- Spec: docs/superpowers/specs/2026-07-31-gw-sheet-music-store-design.md
--
-- Platform-global (NO tenant_id), same as the rest of the partner tables.

-- 1) Partners may now exist before their user signs in: admin creates the
--    row with contact_email; first sign-in with that email claims it.
--    UNIQUE(user_id) still holds (Postgres allows multiple NULLs).
ALTER TABLE gw_partners ALTER COLUMN user_id DROP NOT NULL;

-- 2) Storefront profile + featuring columns.
ALTER TABLE gw_partners
  ADD COLUMN IF NOT EXISTS owner_photo_storage_path text,
  ADD COLUMN IF NOT EXISTS history text,
  ADD COLUMN IF NOT EXISTS featured_order integer;

ALTER TABLE gw_partner_scores
  ADD COLUMN IF NOT EXISTS partner_featured_order integer,
  ADD COLUMN IF NOT EXISTS gw_featured_order integer;

CREATE INDEX IF NOT EXISTS gw_partners_featured_idx
  ON gw_partners (featured_order) WHERE featured_order IS NOT NULL;
CREATE INDEX IF NOT EXISTS gw_partner_scores_gw_featured_idx
  ON gw_partner_scores (gw_featured_order) WHERE gw_featured_order IS NOT NULL;

-- 3) gw_featured_order is platform-curation-only. Partners have a broad
--    owner_all UPDATE policy on their own score rows, so guard the column
--    with a trigger instead of a policy. Service-role writes (edge fns)
--    never touch the column, so IS DISTINCT FROM lets them through.
CREATE OR REPLACE FUNCTION guard_gw_featured_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.gw_featured_order IS NOT NULL)
     OR (TG_OP = 'UPDATE' AND NEW.gw_featured_order IS DISTINCT FROM OLD.gw_featured_order) THEN
    IF NOT EXISTS (SELECT 1 FROM gw_profiles p
                   WHERE p.user_id = auth.uid()
                     AND (p.is_super_admin = true OR p.is_admin = true)) THEN
      RAISE EXCEPTION 'gw_featured_order is admin-only' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_gw_featured_order ON gw_partner_scores;
CREATE TRIGGER trg_guard_gw_featured_order
BEFORE INSERT OR UPDATE ON gw_partner_scores
FOR EACH ROW EXECUTE FUNCTION guard_gw_featured_order();

-- 4) Email-driven claim: link the signed-in user to an unclaimed partner
--    row whose contact_email matches their auth email (case-insensitive).
--    Never re-links a partner away from an established user; if the caller
--    is already a partner, just return that id. Oldest matching row wins
--    if an admin accidentally created duplicates.
CREATE OR REPLACE FUNCTION partner_claim_by_email()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text;
  v_id    uuid;
BEGIN
  SELECT id INTO v_id FROM gw_partners WHERE user_id = auth.uid();
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE gw_partners
     SET user_id = auth.uid(),
         status  = CASE WHEN status = 'invited' THEN 'onboarding' ELSE status END
   WHERE id = (
     SELECT id FROM gw_partners
      WHERE user_id IS NULL
        AND lower(contact_email) = lower(v_email)
      ORDER BY created_at
      LIMIT 1
   )
   RETURNING id INTO v_id;

  RETURN v_id;  -- NULL when no match: caller is simply not a partner.
END;
$$;
GRANT EXECUTE ON FUNCTION partner_claim_by_email() TO authenticated;

-- 5) Widen the whitelisted self-update with owner photo + history.
--    Drop the old signature first — two overloads would make PostgREST
--    rpc('partner_update_self') ambiguous.
DROP FUNCTION IF EXISTS partner_update_self(text, text, text, text, text);

CREATE OR REPLACE FUNCTION partner_update_self(
  p_display_name             text,
  p_bio                      text,
  p_website_url              text,
  p_contact_email            text,
  p_logo_storage_path        text,
  p_owner_photo_storage_path text,
  p_history                  text
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
     SET display_name             = COALESCE(p_display_name, display_name),
         bio                      = p_bio,
         website_url              = p_website_url,
         contact_email            = p_contact_email,
         logo_storage_path        = p_logo_storage_path,
         owner_photo_storage_path = p_owner_photo_storage_path,
         history                  = p_history
   WHERE user_id = auth.uid()
   RETURNING * INTO updated;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not a partner' USING ERRCODE = '42501';
  END IF;
  RETURN updated;
END;
$$;
GRANT EXECUTE ON FUNCTION partner_update_self(text, text, text, text, text, text, text) TO authenticated;

-- 6) Public storefront view: append the new columns (trailing appends keep
--    CREATE OR REPLACE legal).
CREATE OR REPLACE VIEW gw_partners_public AS
SELECT id, display_name, bio, website_url, logo_storage_path, status,
       owner_photo_storage_path, history, featured_order
FROM gw_partners
WHERE status = 'active';

GRANT SELECT ON gw_partners_public TO authenticated;
```

- [ ] **Step 2: Sanity-check the SQL parses** (no local DB writes — syntax only)

Run: `node -e "const s=require('fs').readFileSync('supabase/migrations/20260731100000_gw_store_featured.sql','utf8'); if(!/partner_claim_by_email/.test(s)) throw new Error('missing rpc'); console.log('ok', s.length)"`
Expected: `ok <bytes>`. (Real application happens on the droplet by Kevin — do NOT attempt to run it against prod.)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260731100000_gw_store_featured.sql
git commit -m "feat(store): migration for featured selections + email-claimed partners"
```

---

### Task 2: Store + partner API additions

**Files:**
- Modify: `src/lib/store/api.ts`
- Modify: `src/lib/partner/api.ts`

**Interfaces:**
- Produces:
  - `StoreScoreRow` gains `partner_featured_order: number | null; gw_featured_order: number | null;`
  - `StorePartner` gains `owner_photo_storage_path: string | null; history: string | null; featured_order: number | null;`
  - `useFeaturedPartners(): UseQueryResult<StorePartner[]>`
  - `useStorePartners(): UseQueryResult<StorePartner[]>`
  - `useGwFeaturedScores(): UseQueryResult<StoreScoreRow[]>`
  - `Partner` (partner lib) gains the same three gw_partners fields; `PartnerScore` gains the two featured-order fields.
  - `UpdateSelfArgs` gains `owner_photo_storage_path: string | null; history: string | null;` and `useUpdateMyPartner` passes `p_owner_photo_storage_path` / `p_history`.
  - `useSetPartnerScoreFeatured(): UseMutationResult<{ id: string }, Error, { id: string; partner_featured_order: number | null }>`
  - `claimPartnerByEmail(): Promise<string | null>` (plain async fn, exported from `src/lib/partner/api.ts`)
  - Admin: `useSetPartnerFeatured(): UseMutationResult<{ id: string }, Error, { id: string; featured_order: number | null }>` and `useSetGwFeaturedScore(): UseMutationResult<{ id: string }, Error, { id: string; gw_featured_order: number | null }>`
  - `useCreatePartnerByEmail(): UseMutationResult<{ id: string }, Error, { display_name: string; contact_email: string }>` (admin inserts an unclaimed partner row)

- [ ] **Step 1: Extend `src/lib/store/api.ts`**

Add the two fields to `StoreScoreRow`, the three fields to `StorePartner`, and:

```ts
export function useFeaturedPartners(): UseQueryResult<StorePartner[]> {
  return useQuery({
    queryKey: ['store-featured-partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_partners_public')
        .select('*')
        .not('featured_order', 'is', null)
        .order('featured_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as StorePartner[];
    },
  });
}

export function useStorePartners(): UseQueryResult<StorePartner[]> {
  return useQuery({
    queryKey: ['store-partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_partners_public')
        .select('*')
        .order('display_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as StorePartner[];
    },
  });
}

export function useGwFeaturedScores(): UseQueryResult<StoreScoreRow[]> {
  return useQuery({
    queryKey: ['store-gw-featured-scores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_partner_scores')
        .select('*, partner:gw_partners(display_name, logo_storage_path)')
        .eq('status', 'published')
        .not('gw_featured_order', 'is', null)
        .order('gw_featured_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as StoreScoreRow[];
    },
  });
}
```

- [ ] **Step 2: Extend `src/lib/partner/api.ts`**

Add fields to `Partner` (`owner_photo_storage_path: string | null; history: string | null; featured_order: number | null;`) and `PartnerScore` (`partner_featured_order: number | null; gw_featured_order: number | null;`). Extend `UpdateSelfArgs` and the rpc call in `useUpdateMyPartner`:

```ts
      const { data, error } = await supabase.rpc('partner_update_self', {
        p_display_name: args.display_name,
        p_bio: args.bio,
        p_website_url: args.website_url,
        p_contact_email: args.contact_email,
        p_logo_storage_path: args.logo_storage_path,
        p_owner_photo_storage_path: args.owner_photo_storage_path,
        p_history: args.history,
      });
```

Then add:

```ts
// Links the signed-in user to an unclaimed partner row matching their auth
// email. Returns the partner id (existing or newly claimed) or null.
export async function claimPartnerByEmail(): Promise<string | null> {
  const { data, error } = await supabase.rpc('partner_claim_by_email');
  if (error) throw error;
  return (data as string | null) ?? null;
}

export function useSetPartnerScoreFeatured(): UseMutationResult<{ id: string }, Error, { id: string; partner_featured_order: number | null }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, partner_featured_order }) => {
      const { data, error } = await supabase
        .from('gw_partner_scores')
        .update({ partner_featured_order })
        .eq('id', id)
        .select('id')
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-partner-scores'] }),
  });
}

export function useSetPartnerFeatured(): UseMutationResult<{ id: string }, Error, { id: string; featured_order: number | null }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, featured_order }) => {
      const { data, error } = await supabase
        .from('gw_partners')
        .update({ featured_order })
        .eq('id', id)
        .select('id')
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partners-admin'] }),
  });
}

export function useSetGwFeaturedScore(): UseMutationResult<{ id: string }, Error, { id: string; gw_featured_order: number | null }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, gw_featured_order }) => {
      const { data, error } = await supabase
        .from('gw_partner_scores')
        .update({ gw_featured_order })
        .eq('id', id)
        .select('id')
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gw-featured-admin'] }),
  });
}

export function useCreatePartnerByEmail(): UseMutationResult<{ id: string }, Error, { display_name: string; contact_email: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args) => {
      const { data, error } = await supabase
        .from('gw_partners')
        .insert({ display_name: args.display_name, contact_email: args.contact_email, status: 'invited' })
        .select('id')
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partners-admin'] }),
  });
}
```

- [ ] **Step 3: Gate + commit**

Run: `npm run typecheck:guard` — expect no NEW errors.
```bash
git add src/lib/store/api.ts src/lib/partner/api.ts
git commit -m "feat(store): featured/browse queries, email claim, featuring mutations"
```

---

### Task 3: Shared StoreScoreGrid + rename `/store` page

**Files:**
- Create: `src/components/store/StoreScoreGrid.tsx`
- Create: `src/components/store/StoreScoreGrid.test.tsx`
- Modify: `src/pages/store/StorePage.tsx`

**Interfaces:**
- Produces: `StoreScoreGrid({ scores, linkFor }: { scores: StoreScoreRow[]; linkFor?: (s: StoreScoreRow) => string })` — card grid; `linkFor` defaults to `` (s) => `/store/scores/${s.id}` ``.

- [ ] **Step 1: Write the failing test** (`src/components/store/StoreScoreGrid.test.tsx`)

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StoreScoreGrid } from './StoreScoreGrid';
import type { StoreScoreRow } from '@/lib/store/api';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.example/${p}` } }) }) } },
}));

const row = (over: Partial<StoreScoreRow>): StoreScoreRow => ({
  id: 'sc1', partner_id: 'pt1', title: 'Lift Every Voice', composer: 'J. R. Johnson',
  arranger: null, voicing: 'SATB', ensemble_type: null, difficulty_grade: null,
  description: null, tags: null, price_cents: 495, currency: 'USD',
  thumbnail_storage_path: null, sample_audio_storage_path: null, page_count: null,
  status: 'published', partner: { display_name: 'KPJ Music', logo_storage_path: null },
  partner_featured_order: null, gw_featured_order: null, ...over,
});

afterEach(cleanup);

describe('StoreScoreGrid', () => {
  it('renders title, price, partner and default detail link', () => {
    render(<MemoryRouter><StoreScoreGrid scores={[row({})]} /></MemoryRouter>);
    expect(screen.getByText('Lift Every Voice')).toBeInTheDocument();
    expect(screen.getByText('$4.95')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/store/scores/sc1');
  });

  it('honors a custom linkFor', () => {
    render(
      <MemoryRouter>
        <StoreScoreGrid scores={[row({})]} linkFor={(s) => `/store/partners/${s.partner_id}?score=${s.id}`} />
      </MemoryRouter>
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/store/partners/pt1?score=sc1');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/store/StoreScoreGrid.test.tsx`
Expected: FAIL — module `./StoreScoreGrid` not found.

- [ ] **Step 3: Implement `StoreScoreGrid.tsx`** — lift the card grid out of `StorePage.tsx` verbatim (thumbnail via `partner-assets` public URL, title, composer · partner name, price, voicing badge), parameterized by `scores` and `linkFor`:

```tsx
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { StoreScoreRow } from '@/lib/store/api';

const ASSETS_BUCKET = 'partner-assets';

interface Props {
  scores: StoreScoreRow[];
  linkFor?: (s: StoreScoreRow) => string;
}

export function StoreScoreGrid({ scores, linkFor = (s) => `/store/scores/${s.id}` }: Props) {
  const thumbUrl = (path: string | null) =>
    path ? supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path).data.publicUrl : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {scores.map((s) => (
        <Link key={s.id} to={linkFor(s)} className="block">
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
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/store/StoreScoreGrid.test.tsx` — expected: PASS.

- [ ] **Step 5: Rewrite `StorePage.tsx` to use the grid and the new name.** Title becomes `GW Sheet Music Store`; subtitle unchanged; loading/empty branches unchanged; the inline grid is replaced by `<StoreScoreGrid scores={scores} />`. (Task 5 swaps the body for the full `GwStoreTab`; this task only de-duplicates the grid and fixes the name so the rename ships even if later tasks slip.)

- [ ] **Step 6: Gate + commit**

Run: `npm run typecheck:guard`
```bash
git add src/components/store/ src/pages/store/StorePage.tsx
git commit -m "feat(store): shared StoreScoreGrid; rename Composer Store -> GW Sheet Music Store"
```

---

### Task 4: GwStoreTab — featured stores, featured pieces, browse

**Files:**
- Create: `src/components/store/GwStoreTab.tsx`
- Create: `src/components/store/GwStoreTab.test.tsx`

**Interfaces:**
- Consumes: `useFeaturedPartners`, `useGwFeaturedScores`, `useStorePartners`, `useStoreScores` (Task 2), `StoreScoreGrid` (Task 3).
- Produces: `GwStoreTab()` — default-props component, no args. Featured piece cards link to `/store/partners/{partner_id}?score={id}`; store cards link to `/store/partners/{id}`.

- [ ] **Step 1: Write the failing test** (`src/components/store/GwStoreTab.test.tsx`)

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GwStoreTab } from './GwStoreTab';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.example/${p}` } }) }) } },
}));

const partner = {
  id: 'pt1', display_name: 'KPJ Music', bio: null, website_url: null,
  logo_storage_path: null, status: 'active',
  owner_photo_storage_path: null, history: null, featured_order: 1,
};
const scoreRow = {
  id: 'sc1', partner_id: 'pt1', title: 'Featured Anthem', composer: 'K. Johnson',
  arranger: null, voicing: 'SATB', ensemble_type: null, difficulty_grade: null,
  description: null, tags: null, price_cents: 600, currency: 'USD',
  thumbnail_storage_path: null, sample_audio_storage_path: null, page_count: null,
  status: 'published', partner: { display_name: 'KPJ Music', logo_storage_path: null },
  partner_featured_order: null, gw_featured_order: 1,
};

vi.mock('@/lib/store/api', () => ({
  useFeaturedPartners: () => ({ data: [partner], isLoading: false }),
  useGwFeaturedScores: () => ({ data: [scoreRow], isLoading: false }),
  useStorePartners: () => ({ data: [partner], isLoading: false }),
  useStoreScores: () => ({ data: [scoreRow], isLoading: false }),
}));

afterEach(cleanup);

describe('GwStoreTab', () => {
  it('links a featured piece to its store of origin with the score param', () => {
    render(<MemoryRouter><GwStoreTab /></MemoryRouter>);
    const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(links).toContain('/store/partners/pt1?score=sc1');
  });

  it('links a featured store card to the partner storefront', () => {
    render(<MemoryRouter><GwStoreTab /></MemoryRouter>);
    const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(links).toContain('/store/partners/pt1');
    expect(screen.getByText('Featured Stores')).toBeInTheDocument();
    expect(screen.getByText('Featured Pieces')).toBeInTheDocument();
  });

  it('filters the browse grid by search text', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(<MemoryRouter><GwStoreTab /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText('Search scores…'), { target: { value: 'zzzz' } });
    expect(screen.getByText('No scores match your search.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/components/store/GwStoreTab.test.tsx` → FAIL (module not found).

- [ ] **Step 3: Implement `GwStoreTab.tsx`**

```tsx
// GW Sheet Music Store — curated front door for the partner marketplace.
// Featured stores + featured pieces lead; browse-all follows. A featured
// piece deep-links to its store of origin so every feature drives traffic
// into the partner's full catalog.
// Spec: docs/superpowers/specs/2026-07-31-gw-sheet-music-store-design.md
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
  useFeaturedPartners, useGwFeaturedScores, useStorePartners, useStoreScores,
  type StorePartner,
} from '@/lib/store/api';
import { StoreScoreGrid } from './StoreScoreGrid';

const ASSETS_BUCKET = 'partner-assets';

function partnerImage(p: StorePartner): string | null {
  const path = p.owner_photo_storage_path ?? p.logo_storage_path;
  return path ? supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path).data.publicUrl : null;
}

function PartnerCard({ p }: { p: StorePartner }) {
  const img = partnerImage(p);
  return (
    <Link to={`/store/partners/${p.id}`} className="block shrink-0 w-44">
      <Card className="hover:border-slate-400 transition-colors h-full">
        <CardContent className="p-3 text-center">
          {img ? (
            <img src={img} alt="" className="w-16 h-16 rounded-full object-cover mx-auto mb-2 border" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-2 border" />
          )}
          <p className="text-sm font-medium truncate">{p.display_name}</p>
          {p.bio && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.bio}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

export function GwStoreTab() {
  const { data: featuredPartners } = useFeaturedPartners();
  const { data: featuredScores } = useGwFeaturedScores();
  const { data: allPartners } = useStorePartners();
  const { data: allScores, isLoading } = useStoreScores();
  const [query, setQuery] = useState('');

  const browseScores = useMemo(() => {
    const list = allScores ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) =>
      s.title.toLowerCase().includes(q)
      || (s.composer ?? '').toLowerCase().includes(q)
      || (s.voicing ?? '').toLowerCase().includes(q)
      || (s.partner?.display_name ?? '').toLowerCase().includes(q));
  }, [allScores, query]);

  return (
    <div className="space-y-8">
      {(featuredPartners?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Featured Stores</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {featuredPartners!.map((p) => <PartnerCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {(featuredScores?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Featured Pieces</h2>
          <StoreScoreGrid
            scores={featuredScores!}
            linkFor={(s) => `/store/partners/${s.partner_id}?score=${s.id}`}
          />
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">All Stores</h2>
        {(allPartners?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No partner stores yet.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {allPartners!.map((p) => <PartnerCard key={p.id} p={p} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">All Scores</h2>
        <div className="relative max-w-sm mb-3">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search scores…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && browseScores.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {query ? 'No scores match your search.' : 'No scores in the store yet. Composers publish scores from their portal.'}
          </p>
        )}
        {browseScores.length > 0 && <StoreScoreGrid scores={browseScores} />}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/components/store/GwStoreTab.test.tsx` → PASS.

- [ ] **Step 5: Point `/store` at the same content.** In `StorePage.tsx`, replace the body (loading/empty/grid from Task 3 Step 5) with `<GwStoreTab />` inside the existing `DashboardPageShell` (title `GW Sheet Music Store`, same subtitle, `maxWidth="6xl"`). Remove now-unused imports.

- [ ] **Step 6: Gate + commit**

Run: `npm run typecheck:guard` and `npx vitest run src/components/store/`
```bash
git add src/components/store/ src/pages/store/StorePage.tsx
git commit -m "feat(store): GwStoreTab with featured stores/pieces and browse-all"
```

---

### Task 5: Music Library tab + nav cleanup + My Music label

**Files:**
- Modify: `src/pages/dashboard/MusicLibraryPage.tsx`
- Create: `src/pages/dashboard/musicLibraryTabs.ts`
- Create: `src/pages/dashboard/musicLibraryTabs.test.ts`
- Modify: `src/lib/navigation/navCatalog.ts:59` (remove the `composer-store` row)
- Modify: `src/components/music-library/MyMusicTab.tsx:24`

**Interfaces:**
- Consumes: `GwStoreTab` (Task 4).
- Produces: `MUSIC_LIBRARY_TABS: Array<{ key: 'scores' | 'my-music' | 'setlists' | 'store' | 'public-domain'; label: string }>` exported from `musicLibraryTabs.ts`.

- [ ] **Step 1: Write the failing test** (`src/pages/dashboard/musicLibraryTabs.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { MUSIC_LIBRARY_TABS } from './musicLibraryTabs';

describe('MUSIC_LIBRARY_TABS', () => {
  it('places the GW Sheet Music Store tab immediately before Public Domain', () => {
    expect(MUSIC_LIBRARY_TABS.map((t) => t.key)).toEqual(
      ['scores', 'my-music', 'setlists', 'store', 'public-domain']
    );
    const store = MUSIC_LIBRARY_TABS.find((t) => t.key === 'store');
    expect(store?.label).toBe('GW Sheet Music Store');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/pages/dashboard/musicLibraryTabs.test.ts` → FAIL (module not found).

- [ ] **Step 3: Create `musicLibraryTabs.ts`** (labels only — icons stay in the page, keyed by `key`, so this module stays render-free and testable):

```ts
// Music Library top-tab order. The GW Sheet Music Store sits immediately
// before Public Domain by design — buying scores is a library activity.
// Spec: docs/superpowers/specs/2026-07-31-gw-sheet-music-store-design.md
export type MusicLibraryTabKey = 'scores' | 'my-music' | 'setlists' | 'store' | 'public-domain';

export const MUSIC_LIBRARY_TABS: Array<{ key: MusicLibraryTabKey; label: string }> = [
  { key: 'scores',        label: 'Scores' },
  { key: 'my-music',      label: 'My Music' },
  { key: 'setlists',      label: 'Setlists' },
  { key: 'store',         label: 'GW Sheet Music Store' },
  { key: 'public-domain', label: 'Public Domain' },
];
```

- [ ] **Step 4: Wire into `MusicLibraryPage.tsx`**
  - Replace `type TopTab = 'scores' | 'my-music' | 'setlists' | 'public-domain';` with `import { MUSIC_LIBRARY_TABS, type MusicLibraryTabKey } from './musicLibraryTabs';` and `type TopTab = MusicLibraryTabKey;`.
  - Replace the inline array in the tab row (lines ~277–282) with a map from `MUSIC_LIBRARY_TABS`, resolving icons via a local record — add `Store` to the existing `lucide-react` import:
    ```tsx
    const TAB_ICONS: Record<MusicLibraryTabKey, React.ComponentType<{ className?: string }>> = {
      'scores': Music, 'my-music': FileMusic, 'setlists': ListMusic, 'store': Store, 'public-domain': BookOpenIcon,
    };
    ```
    and render `MUSIC_LIBRARY_TABS.map((t) => { const Icon = TAB_ICONS[t.key]; ... })` keeping the existing button markup/classes exactly.
  - Add the content branch next to the others (before `public-domain`), lazy like SetlistBuilder:
    ```tsx
    {topTab === 'store' && (
      <Suspense fallback={<div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>}>
        <GwStoreTab />
      </Suspense>
    )}
    ```
    with `const GwStoreTab = lazy(() => import('@/components/store/GwStoreTab').then((m) => ({ default: m.GwStoreTab })));` at module level (match the file's existing lazy-import style if it differs).
  - Update the stale comment above the tab row ("Top-level tabs: Scores | Setlists | Public Domain…" → include the store; "Four tabs exceed" → "Five tabs exceed").

- [ ] **Step 5: Remove the sidebar entry.** Delete line 59 in `src/lib/navigation/navCatalog.ts` (the `composer-store` row). Grep to confirm nothing else references the key: `grep -rn "composer-store" src/` → only zero hits expected after the edit. (Saved nav orders that still contain the key are dropped harmlessly by the catalog lookup.)

- [ ] **Step 6: Rename the My Music source label.** In `MyMusicTab.tsx:24`: `purchase: 'Composer Store',` → `purchase: 'GW Sheet Music Store',`.

- [ ] **Step 7: Run tests + gate**

Run: `npx vitest run src/pages/dashboard/musicLibraryTabs.test.ts src/components/music-library/MyMusicTab.test.tsx` → PASS.
Run: `npm run typecheck:guard` → no new errors.

- [ ] **Step 8: Commit**

```bash
git add src/pages/dashboard/musicLibraryTabs.ts src/pages/dashboard/musicLibraryTabs.test.ts src/pages/dashboard/MusicLibraryPage.tsx src/lib/navigation/navCatalog.ts src/components/music-library/MyMusicTab.tsx
git commit -m "feat(store): GW Sheet Music Store tab in Music Library; retire Composer Store nav"
```

---

### Task 6: Complete partner storefront (`/store/partners/:id`)

**Files:**
- Modify: `src/pages/store/StorePartnerPage.tsx` (full rewrite)
- Create: `src/pages/store/StorePartnerPage.test.tsx`

**Interfaces:**
- Consumes: `useStorePartner`, `useStoreScores` (store lib), `StoreScoreGrid` (Task 3).
- Produces: route behavior — `?score=<id>` scrolls to and highlights that score card (wrapper div id `score-<id>`, highlight class `ring-2 ring-primary rounded-xl`).

- [ ] **Step 1: Write the failing test** (`src/pages/store/StorePartnerPage.test.tsx`)

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import StorePartnerPage from './StorePartnerPage';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.example/${p}` } }) }) } },
}));
vi.mock('@/components/dashboard/DashboardPageShell', () => ({
  default: ({ title, subtitle, children }: any) => <div><h1>{title}</h1><p>{subtitle}</p>{children}</div>,
}));

const base = {
  id: 'sc1', partner_id: 'pt1', title: 'Anthem One', composer: 'K. Johnson',
  arranger: null, voicing: 'SATB', ensemble_type: null, difficulty_grade: null,
  description: null, tags: null, price_cents: 500, currency: 'USD',
  thumbnail_storage_path: null, sample_audio_storage_path: null, page_count: null,
  status: 'published', partner: { display_name: 'KPJ Music', logo_storage_path: null },
  partner_featured_order: null, gw_featured_order: null,
};

vi.mock('@/lib/store/api', () => ({
  useStorePartner: () => ({ data: {
    id: 'pt1', display_name: 'KPJ Music', bio: 'Short bio', website_url: null,
    logo_storage_path: null, status: 'active',
    owner_photo_storage_path: 'pt1/owner.jpg', history: 'Founded in 2020.', featured_order: null,
  } }),
  useStoreScores: () => ({ data: [
    base,
    { ...base, id: 'sc2', title: 'Anthem Two', partner_featured_order: 1 },
  ] }),
}));

afterEach(cleanup);

const renderAt = (url: string) => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes><Route path="/store/partners/:id" element={<StorePartnerPage />} /></Routes>
  </MemoryRouter>
);

describe('StorePartnerPage', () => {
  it('shows owner photo, history, and a Featured Items shelf', () => {
    renderAt('/store/partners/pt1');
    expect(screen.getByText('Founded in 2020.')).toBeInTheDocument();
    expect(screen.getByText('Featured Items')).toBeInTheDocument();
    expect(screen.getByAltText('KPJ Music')).toHaveAttribute('src', 'https://cdn.example/pt1/owner.jpg');
    // Featured shelf + full catalog both contain Anthem Two.
    expect(screen.getAllByText('Anthem Two').length).toBe(2);
  });

  it('highlights the ?score= target card', () => {
    renderAt('/store/partners/pt1?score=sc1');
    const wrapper = document.getElementById('score-sc1');
    expect(wrapper).not.toBeNull();
    expect(wrapper!.className).toContain('ring-2');
    expect(document.getElementById('score-sc2')?.className ?? '').not.toContain('ring-2');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/pages/store/StorePartnerPage.test.tsx` → FAIL (no history/featured shelf/highlight yet).

- [ ] **Step 3: Rewrite `StorePartnerPage.tsx`**

```tsx
// A partner's complete store: owner photo, history, their own featured
// shelf, full catalog. ?score=<id> deep-links (from GW featured pieces)
// scroll to and highlight that score.
// Spec: docs/superpowers/specs/2026-07-31-gw-sheet-music-store-design.md
import { useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { useStorePartner, useStoreScores } from '@/lib/store/api';
import { StoreScoreGrid } from '@/components/store/StoreScoreGrid';
import type { StoreScoreRow } from '@/lib/store/api';

const ASSETS_BUCKET = 'partner-assets';

function HighlightableGrid({ scores, targetId }: { scores: StoreScoreRow[]; targetId: string | null }) {
  // Card-level wrapper so the ring survives StoreScoreGrid's internals.
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {scores.map((s) => (
        <div key={s.id} id={`score-${s.id}`} className={s.id === targetId ? 'ring-2 ring-primary rounded-xl' : ''}>
          <StoreScoreGrid scores={[s]} />
        </div>
      ))}
    </div>
  );
}

export default function StorePartnerPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const targetId = params.get('score');
  const { data: partner } = useStorePartner(id);
  const { data: scores } = useStoreScores({ partnerId: id });

  const featured = useMemo(
    () => (scores ?? [])
      .filter((s) => s.partner_featured_order != null)
      .sort((a, b) => (a.partner_featured_order! - b.partner_featured_order!)),
    [scores]
  );

  useEffect(() => {
    if (!targetId || !scores?.length) return;
    document.getElementById(`score-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [targetId, scores?.length]);

  const url = (path: string | null) =>
    path ? supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path).data.publicUrl : null;
  const ownerPhoto = url(partner?.owner_photo_storage_path ?? null);
  const logo = url(partner?.logo_storage_path ?? null);

  return (
    <DashboardPageShell title={partner?.display_name ?? 'Store'} maxWidth="6xl">
      <div className="space-y-6">
        <div className="rounded-2xl bg-card p-4 shadow-sm flex items-start gap-4">
          {ownerPhoto ? (
            <img src={ownerPhoto} alt={partner?.display_name ?? ''} className="w-24 h-24 rounded-full border object-cover" />
          ) : logo ? (
            <img src={logo} alt={partner?.display_name ?? ''} className="w-24 h-24 rounded border object-cover" />
          ) : (
            <div className="w-24 h-24 rounded-full border bg-muted" />
          )}
          <div className="min-w-0">
            <p className="text-lg font-semibold">{partner?.display_name ?? '—'}</p>
            {partner?.bio && <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{partner.bio}</p>}
            {partner?.website_url && (
              <a href={partner.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
                {partner.website_url}
              </a>
            )}
          </div>
        </div>

        {partner?.history && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-2">Our Story</h2>
            <p className="text-sm whitespace-pre-wrap">{partner.history}</p>
          </section>
        )}

        {featured.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Featured Items</h2>
            <StoreScoreGrid scores={featured} />
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">All Scores</h2>
          {(scores?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No published scores yet.</p>
          ) : (
            <HighlightableGrid scores={scores!} targetId={targetId} />
          )}
        </section>
      </div>
    </DashboardPageShell>
  );
}
```

Note: the test's "Anthem Two appears twice" assertion covers featured shelf + catalog; the header `alt` uses the display name so the owner-photo assertion works.

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/pages/store/StorePartnerPage.test.tsx` → PASS.

- [ ] **Step 5: Gate + commit**

Run: `npm run typecheck:guard`
```bash
git add src/pages/store/StorePartnerPage.tsx src/pages/store/StorePartnerPage.test.tsx
git commit -m "feat(store): complete partner storefront with featured shelf, history, deep-link highlight"
```

---

### Task 7: Portal — owner photo + history in Partner Profile

**Files:**
- Modify: `src/components/partner/LogoUploadField.tsx` (generalize)
- Modify: `src/pages/partner/PartnerProfile.tsx`

**Interfaces:**
- Consumes: widened `UpdateSelfArgs` / `useUpdateMyPartner` (Task 2).
- Produces: `LogoUploadField` gains optional props `filenameBase?: string` (default `'logo'`, controls `${partnerId}/${filenameBase}.${ext}` — `'owner'` for the owner photo, allowed by the existing prefix-based storage policy) and `emptyLabel?: string` (default `'No logo'`).

- [ ] **Step 1: Generalize `LogoUploadField`.** Add the two optional props; replace the hardcoded `` `${partnerId}/logo.${ext}` `` with `` `${partnerId}/${filenameBase}.${ext}` `` and the "No logo" placeholder text with `{emptyLabel}`. No caller changes needed (defaults preserve behavior).

- [ ] **Step 2: Extend `PartnerProfile.tsx`.** Add `owner_photo_storage_path: null as string | null` and `history: ''` to the form state + the `useEffect` hydration (`partner.owner_photo_storage_path`, `partner.history ?? ''`); pass both in `save()` (`history: form.history || null`). Add fields after the Logo block:

```tsx
        <div className="space-y-1">
          <Label className="text-xs">Owner photo</Label>
          <LogoUploadField
            partnerId={partner.id}
            currentPath={form.owner_photo_storage_path}
            filenameBase="owner"
            emptyLabel="No photo"
            onUploaded={(path) => setForm({ ...form, owner_photo_storage_path: path })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pp-history" className="text-xs">History / About your store</Label>
          <Textarea id="pp-history" value={form.history} onChange={(e) => setForm({ ...form, history: e.target.value })} rows={6}
            placeholder="Tell buyers who you are — your background, your catalog, what makes your music yours." />
        </div>
```

- [ ] **Step 3: Gate + commit**

Run: `npm run typecheck:guard` and `npx vitest run src/components src/pages 2>/dev/null || npm run test` (no new failures).
```bash
git add src/components/partner/LogoUploadField.tsx src/pages/partner/PartnerProfile.tsx
git commit -m "feat(store): partner portal owner photo + store history"
```

---

### Task 8: Portal — partner featured-items picker

**Files:**
- Modify: `src/pages/partner/PartnerScoresList.tsx`
- Create: `src/pages/partner/PartnerScoresList.test.tsx` (only if the file doesn't already have one)

**Interfaces:**
- Consumes: `useSetPartnerScoreFeatured` (Task 2), `PartnerScore.partner_featured_order`.
- Produces: each **published** score row gets a "Feature"/"Unfeature" control; featuring appends to the end of the order (`max(existing)+1`), unfeaturing sets `null`.

- [ ] **Step 1: Read `PartnerScoresList.tsx` first** and follow its existing row markup. Add, for rows with `status === 'published'`:

```tsx
  const setFeatured = useSetPartnerScoreFeatured();
  // inside the row render, next to the existing status controls:
  {s.status === 'published' && (
    s.partner_featured_order != null ? (
      <Button size="sm" variant="secondary" disabled={setFeatured.isPending}
        onClick={() => setFeatured.mutate({ id: s.id, partner_featured_order: null })}>
        ★ Featured — remove
      </Button>
    ) : (
      <Button size="sm" variant="outline" disabled={setFeatured.isPending}
        onClick={() => {
          const next = Math.max(0, ...scoresList.filter((x) => x.partner_featured_order != null).map((x) => x.partner_featured_order!)) + 1;
          setFeatured.mutate({ id: s.id, partner_featured_order: next });
        }}>
        Feature on my store
      </Button>
    )
  )}
```

(`scoresList` = whatever the component names its `useMyPartnerScores()` data; adapt the variable name, keep the logic.)

- [ ] **Step 2: Component test** — mock `@/lib/partner/api` (`useMyPartnerScores` returning one published unfeatured + one featured score, `useSetPartnerScoreFeatured` returning a `mutate` spy plus any other hooks the file imports); assert clicking "Feature on my store" calls `mutate({ id, partner_featured_order: 2 })` and the featured row shows "★ Featured — remove". Follow the `MyMusicTab.test.tsx` mocking pattern (jsdom pragma, `vi.mock`, `afterEach(cleanup)`).

- [ ] **Step 3: Run test (fails → implement → passes), gate, commit**

Run: `npx vitest run src/pages/partner/PartnerScoresList.test.tsx` → PASS; `npm run typecheck:guard`.
```bash
git add src/pages/partner/
git commit -m "feat(store): partners pick featured items for their storefront"
```

---

### Task 9: Email-driven auth landing

**Files:**
- Modify: `src/hooks/useRoleBasedRedirect.ts`
- Create: `src/hooks/useRoleBasedRedirect.test.ts` (pure `pickDestination` tests; create only if absent — otherwise extend)
- Modify: `src/pages/partner/PartnerPortal.tsx` (dashboard escape link)

**Interfaces:**
- Consumes: `claimPartnerByEmail` (Task 2).
- Produces: `pickDestination(profile: { role?: string | null; is_super_admin?: boolean | null; is_admin?: boolean | null; tenant_slug?: string | null; partner_id?: string | null }): string | null` — platform super-admin (`main` tenant) still wins `/admin/tenants`; otherwise a non-null `partner_id` returns `/partner`; otherwise unchanged.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { pickDestination } from './useRoleBasedRedirect';

describe('pickDestination — partner landing', () => {
  it('lands partners in their store backend', () => {
    expect(pickDestination({ role: 'member', partner_id: 'pt1' })).toBe('/partner');
  });
  it('platform super-admin still outranks partner', () => {
    expect(pickDestination({ is_super_admin: true, tenant_slug: 'main', partner_id: 'pt1' })).toBe('/admin/tenants');
  });
  it('tenant super-admin with a partner record goes to the portal', () => {
    expect(pickDestination({ is_super_admin: true, tenant_slug: 'demo', partner_id: 'pt1' })).toBe('/partner');
  });
  it('no partner id → unchanged role routing', () => {
    expect(pickDestination({ role: 'member' })).toBe('/dashboard');
    expect(pickDestination({ role: 'fan' })).toBe('/fan');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/hooks/useRoleBasedRedirect.test.ts` → FAIL (`partner_id` ignored).

- [ ] **Step 3: Implement.** In `pickDestination`, after the platform-super-admin return but before every other branch:

```ts
  const isSuper = profile.is_super_admin || profile.role === 'super-admin';
  if (isSuper && profile.tenant_slug === 'main') return '/admin/tenants';
  // Partners land in their store backend — the portal is a partner's home.
  if (profile.partner_id) return '/partner';
  if (isSuper) return '/dashboard';
```

(Restructure the existing `isSuper` block accordingly; every later branch is untouched.) Then in the hook body:

```ts
  // undefined = claim not yet resolved; null = definitively not a partner.
  const [partnerId, setPartnerId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!user) { setPartnerId(undefined); return; }
    let cancelled = false;
    claimPartnerByEmail()
      .then((id) => { if (!cancelled) setPartnerId(id); })
      .catch(() => { if (!cancelled) setPartnerId(null); }); // claim failure must never block login routing
    return () => { cancelled = true; };
  }, [user]);
```

In the redirect effect, after the `isPostLogin` gate: `if (partnerId === undefined) return;` then `const dest = pickDestination({ ...userProfile, tenant_slug: tenantSlug, partner_id: partnerId });`. Add `partnerId` to the effect deps. Import `claimPartnerByEmail` from `@/lib/partner/api`.

- [ ] **Step 4: Portal escape link.** In `PartnerPortal.tsx`, under the `DashboardPageShell` title area (top of the returned content), add:

```tsx
      <Link to="/dashboard" className="text-xs text-primary hover:underline inline-block mb-4">← Go to my member dashboard</Link>
```

with `Link` added to the existing `react-router-dom` import. (Partners who are also members need a way out of the auto-landing.)

- [ ] **Step 5: Run tests, gate, commit**

Run: `npx vitest run src/hooks/useRoleBasedRedirect.test.ts` → PASS; `npm run typecheck:guard`.
```bash
git add src/hooks/useRoleBasedRedirect.ts src/hooks/useRoleBasedRedirect.test.ts src/pages/partner/PartnerPortal.tsx
git commit -m "feat(store): partner emails auto-claim and land in the store backend"
```

---

### Task 10: Admin curation — featured stores, featured pieces, add-by-email

**Files:**
- Modify: `src/pages/admin/PartnersAdmin.tsx`

**Interfaces:**
- Consumes: `useSetPartnerFeatured`, `useSetGwFeaturedScore`, `useCreatePartnerByEmail` (Task 2), `useStoreScores` (store lib).

- [ ] **Step 1: Read `PartnersAdmin.tsx` fully**, then add three things following its existing card/list style:

1. **Add partner by email** (next to the existing invite form): inputs for display name + email, submit via `useCreatePartnerByEmail`; success toast "Partner added — they'll be linked when they sign in with this email." The invite-link flow stays as-is beside it.
2. **Per-partner featuring** in the partners list: show `★ #{p.featured_order}` when featured; buttons `Feature` (assign `max(existing featured_order)+1` across the loaded list) and `Unfeature` (`featured_order: null`) via `useSetPartnerFeatured`.
3. **GW featured pieces** section at the bottom: `const scores = useStoreScores();` (all published), split into featured (`gw_featured_order != null`, sorted) and the rest (filterable by a small search input on title/composer/partner name). Featured rows get `Remove` (`gw_featured_order: null`); others get `Feature` (append `max+1`) via `useSetGwFeaturedScore`. Each row shows `title — composer · partner.display_name`.

- [ ] **Step 2: Gate + commit**

Run: `npm run typecheck:guard`; `npm run lint` (changed files clean).
```bash
git add src/pages/admin/PartnersAdmin.tsx
git commit -m "feat(store): admin curation — featured stores/pieces, add partner by email"
```

---

### Task 11: Full verification + wrap-up

**Files:** none new.

- [ ] **Step 1: Full gates**

Run, in order, expecting all clean (no NEW failures vs main):
```bash
npm run test
npm run typecheck:guard
npm run lint
npm run build
```

- [ ] **Step 2: Manual QA checklist** (needs the migration applied — hand Kevin the file path `supabase/migrations/20260731100000_gw_store_featured.sql` to apply on the droplet via `!`; Claude must not write to prod):
  - Music Library shows five tabs; GW Sheet Music Store sits before Public Domain; tab row scrolls on 390px.
  - `/store` shows the same content, titled GW Sheet Music Store; old sidebar entry gone.
  - Admin adds a partner by email → that email signs in → lands on `/partner`; "Go to my member dashboard" link works.
  - Partner sets owner photo, history, features an item → `/store/partners/:id` shows all three.
  - Admin features the store + a piece → both rows appear in the tab; clicking the featured piece opens the partner store scrolled to the highlighted score.
  - A purchase still completes end-to-end (Stripe checkout → thanks page → download).
  - As a non-admin partner, attempting to set `gw_featured_order` via devtools fails with `42501`.

- [ ] **Step 3: Finish the branch** — invoke `superpowers:finishing-a-development-branch` (PR against main; do NOT deploy — deploys happen only via `scripts/deploy-frontend.sh` and only when Kevin says so).
