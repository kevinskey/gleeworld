# Personal Music Library — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the user-scoped personal music library — `gw_personal_scores` + private uploads + a "My Music" tab — plus the `shared_with_members` toggle that scopes the tenant library for members.

**Architecture:** New user-owned table with `auth.uid()` RLS (favorites pattern, deliberately NO tenant_id — the library follows the person). Uploads land in a new private `personal-scores` bucket under `<user_id>/uploads/`, gated by per-user-prefix storage policies (studio-bucket pattern). UI is a new `MyMusicTab` component wired into the existing dashboard Music Library tabs. Member visibility of the tenant library is filtered by a new `shared_with_members` boolean unless the user has librarian/edit permission.

**Tech Stack:** Supabase (self-hosted) SQL migration + SQL assert test, React + TanStack Query + shadcn/ui, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-12-personal-music-library-design.md`

## Global Constraints

- Colors/fonts via theme tokens only (`bg-card`, `text-muted-foreground`, …) — never hex or raw Tailwind palette colors; `hover:bg-accent` is tenant-branded, use `hover:bg-border`/`hover:bg-muted` for neutral hovers
- Minimum text size `text-xs`; icons ≥ `w-4 h-4`; sentence case copy; tenant-neutral copy (never "Spelman")
- Migrations idempotent (`IF NOT EXISTS` / `ON CONFLICT DO NOTHING`); applied on the droplet as the postgres superuser
- `gw_personal_scores` intentionally has NO tenant_id — document in a SQL comment so multi-tenant audits don't flag it
- New DB columns aren't in generated types yet — cast query results explicitly (existing repo pattern) and leave a `-- types regen pending` note
- No service worker; no `rsync --delete`; deploy = build locally + rsync with `--exclude 'tenants'`
- Uploads: PDF only (`application/pdf`), 25 MB cap
- **Known deviation from spec:** annotation tables FK to `gw_sheet_music`, so personal scores open in the viewer WITHOUT annotation persistence in phase 1. Follow-up noted in Task 7.

---

### Task 1: Migration + SQL assert test

**Files:**
- Create: `supabase/migrations/20260712120000_personal_music_library.sql`
- Create: `supabase/migrations/tests/personal_music_library_test.sql`

**Interfaces:**
- Produces: table `public.gw_personal_scores` (columns as below), bucket `personal-scores`, column `public.gw_sheet_music.shared_with_members boolean not null default false`. Later tasks rely on these exact names.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260712120000_personal_music_library.sql
-- Personal music library (spec: docs/superpowers/specs/2026-07-12-personal-music-library-design.md)
--
-- gw_personal_scores intentionally has NO tenant_id: the personal library
-- follows the person across tenants, like gw_sheet_music_favorites and the
-- annotation tables. Multi-tenant RLS audits: this is a deliberate exception.

CREATE TABLE IF NOT EXISTS public.gw_personal_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  composer text,
  voicing text,
  source text NOT NULL CHECK (source IN ('upload','cpdl','purchase')),
  pd_work_id uuid REFERENCES public.pd_works(id),
  entitlement_id uuid REFERENCES public.gw_store_entitlements(id),
  storage_path text NOT NULL,
  thumbnail_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gw_personal_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gw_personal_scores_select ON public.gw_personal_scores;
CREATE POLICY gw_personal_scores_select ON public.gw_personal_scores
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS gw_personal_scores_insert ON public.gw_personal_scores;
CREATE POLICY gw_personal_scores_insert ON public.gw_personal_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS gw_personal_scores_update ON public.gw_personal_scores;
CREATE POLICY gw_personal_scores_update ON public.gw_personal_scores
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS gw_personal_scores_delete ON public.gw_personal_scores;
CREATE POLICY gw_personal_scores_delete ON public.gw_personal_scores
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS gw_personal_scores_user_idx
  ON public.gw_personal_scores (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS gw_personal_scores_pd_uq
  ON public.gw_personal_scores (user_id, pd_work_id) WHERE pd_work_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS gw_personal_scores_entitlement_uq
  ON public.gw_personal_scores (user_id, entitlement_id) WHERE entitlement_id IS NOT NULL;

-- Private bucket for personal uploads. Path layout: <user_id>/uploads/<uuid>.pdf
INSERT INTO storage.buckets (id, name, public)
VALUES ('personal-scores', 'personal-scores', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS personal_scores_bucket_read ON storage.objects;
CREATE POLICY personal_scores_bucket_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'personal-scores'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
DROP POLICY IF EXISTS personal_scores_bucket_write ON storage.objects;
CREATE POLICY personal_scores_bucket_write ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'personal-scores'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
DROP POLICY IF EXISTS personal_scores_bucket_delete ON storage.objects;
CREATE POLICY personal_scores_bucket_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'personal-scores'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Tenant library sharing: members only see scores an admin marked shared.
ALTER TABLE public.gw_sheet_music
  ADD COLUMN IF NOT EXISTS shared_with_members boolean NOT NULL DEFAULT false;
-- types regen pending
```

- [ ] **Step 2: Write the assert test**

```sql
-- supabase/migrations/tests/personal_music_library_test.sql
-- Run against a DB with 20260712120000_personal_music_library.sql applied.
BEGIN;

DO $$
BEGIN
  ASSERT (SELECT count(*) = 1 FROM information_schema.tables
          WHERE table_name = 'gw_personal_scores'), 'table missing';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'gw_personal_scores'),
         'RLS not enabled';
  -- no tenant_id — deliberate personal scope
  ASSERT (SELECT count(*) = 0 FROM information_schema.columns
          WHERE table_name = 'gw_personal_scores' AND column_name = 'tenant_id'),
         'gw_personal_scores must NOT have tenant_id';
  -- all four owner policies present and PERMISSIVE
  ASSERT (SELECT count(*) = 4 FROM pg_policies
          WHERE tablename = 'gw_personal_scores'
            AND policyname LIKE 'gw_personal_scores_%'), 'owner policies missing';
  -- source check constraint
  ASSERT (SELECT count(*) = 1 FROM information_schema.check_constraints c
          JOIN information_schema.constraint_column_usage u
            ON u.constraint_name = c.constraint_name
          WHERE u.table_name = 'gw_personal_scores' AND u.column_name = 'source'),
         'source CHECK missing';
  -- partial unique indexes
  ASSERT (SELECT count(*) = 1 FROM pg_indexes
          WHERE tablename = 'gw_personal_scores'
            AND indexname = 'gw_personal_scores_pd_uq'), 'pd unique index missing';
  ASSERT (SELECT count(*) = 1 FROM pg_indexes
          WHERE tablename = 'gw_personal_scores'
            AND indexname = 'gw_personal_scores_entitlement_uq'),
         'entitlement unique index missing';
  -- bucket + policies
  ASSERT (SELECT count(*) = 1 FROM storage.buckets
          WHERE id = 'personal-scores' AND public = false), 'bucket missing/public';
  ASSERT (SELECT count(*) = 3 FROM pg_policies
          WHERE tablename = 'objects' AND schemaname = 'storage'
            AND policyname LIKE 'personal_scores_bucket_%'),
         'bucket policies missing';
  -- shared_with_members column
  ASSERT (SELECT count(*) = 1 FROM information_schema.columns
          WHERE table_name = 'gw_sheet_music'
            AND column_name = 'shared_with_members'
            AND column_default = 'false'), 'shared_with_members missing';
END $$;

ROLLBACK;
```

- [ ] **Step 3: Syntax-check both files locally**

Run: `psql --set ON_ERROR_STOP=1 -f /dev/null 2>/dev/null; node -e "1"` is not applicable — instead verify SQL parses by running each file through `psql --echo-errors --dry-run` equivalents is unavailable; do a visual re-read and confirm every `CREATE POLICY` has a matching `DROP POLICY IF EXISTS`, every index name matches the test's expectations exactly. (Application + test execution happens on the droplet in Task 7.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260712120000_personal_music_library.sql supabase/migrations/tests/personal_music_library_test.sql
git commit -m "feat(library): gw_personal_scores + personal-scores bucket + shared_with_members migration"
```

---

### Task 2: Pure helpers for upload validation and paths

**Files:**
- Create: `src/lib/personalLibrary.ts`
- Test: `src/lib/personalLibrary.test.ts`

**Interfaces:**
- Produces:
  - `personalScoreUploadPath(userId: string, fileName: string): string` — returns `<userId>/uploads/<uuid>.pdf` (uuid via `crypto.randomUUID()`, extension always `.pdf`)
  - `validateScoreFile(file: File): string | null` — returns an error message or null; rejects non-PDF MIME (`application/pdf` only) and files > 25 MB (`MAX_SCORE_BYTES = 25 * 1024 * 1024`)
  - `PERSONAL_SCORES_BUCKET = 'personal-scores'`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/personalLibrary.test.ts
import { describe, it, expect } from 'vitest';
import { personalScoreUploadPath, validateScoreFile, MAX_SCORE_BYTES, PERSONAL_SCORES_BUCKET } from './personalLibrary';

const pdf = (bytes: number) =>
  new File([new Uint8Array(bytes)], 'score.pdf', { type: 'application/pdf' });

describe('personalScoreUploadPath', () => {
  it('nests under <userId>/uploads/ and always ends .pdf', () => {
    const p = personalScoreUploadPath('user-123', 'My Song (final).PDF');
    expect(p.startsWith('user-123/uploads/')).toBe(true);
    expect(p.endsWith('.pdf')).toBe(true);
    // no user-supplied name fragments leak into the object key
    expect(p).not.toContain('My Song');
  });
  it('generates unique paths per call', () => {
    expect(personalScoreUploadPath('u', 'a.pdf')).not.toBe(personalScoreUploadPath('u', 'a.pdf'));
  });
});

describe('validateScoreFile', () => {
  it('accepts a small pdf', () => {
    expect(validateScoreFile(pdf(1000))).toBeNull();
  });
  it('rejects non-pdf mime', () => {
    const doc = new File([new Uint8Array(10)], 'a.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    expect(validateScoreFile(doc)).toMatch(/pdf/i);
  });
  it('rejects files over the cap', () => {
    const big = pdf(MAX_SCORE_BYTES + 1);
    expect(validateScoreFile(big)).toMatch(/25/);
  });
});

it('exports the bucket name', () => {
  expect(PERSONAL_SCORES_BUCKET).toBe('personal-scores');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/personalLibrary.test.ts`
Expected: FAIL — cannot resolve `./personalLibrary`

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/personalLibrary.ts
// Pure helpers for the personal music library (My Music). Storage layout and
// caps per docs/superpowers/specs/2026-07-12-personal-music-library-design.md.

export const PERSONAL_SCORES_BUCKET = 'personal-scores';
export const MAX_SCORE_BYTES = 25 * 1024 * 1024;

// Path layout the bucket RLS depends on: (storage.foldername(name))[1] must
// be the user's id. Never put user-supplied filename text in the object key.
export function personalScoreUploadPath(userId: string, _fileName: string): string {
  return `${userId}/uploads/${crypto.randomUUID()}.pdf`;
}

export function validateScoreFile(file: File): string | null {
  if (file.type !== 'application/pdf') return 'Only PDF files can be added to My Music.';
  if (file.size > MAX_SCORE_BYTES) return 'PDFs must be 25 MB or smaller.';
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/personalLibrary.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/personalLibrary.ts src/lib/personalLibrary.test.ts
git commit -m "feat(library): personal score upload path + validation helpers"
```

---

### Task 3: usePersonalScores hook

**Files:**
- Create: `src/hooks/usePersonalScores.ts`

**Interfaces:**
- Consumes: `personalScoreUploadPath`, `validateScoreFile`, `PERSONAL_SCORES_BUCKET` from `@/lib/personalLibrary`; `supabase` from `@/integrations/supabase/client`; `useAuth` from `@/contexts/AuthContext`.
- Produces:
  ```ts
  export interface PersonalScore {
    id: string; user_id: string; title: string; composer: string | null;
    voicing: string | null; source: 'upload' | 'cpdl' | 'purchase';
    pd_work_id: string | null; entitlement_id: string | null;
    storage_path: string; thumbnail_path: string | null; created_at: string;
  }
  export function usePersonalScores(): {
    scores: PersonalScore[]; isLoading: boolean;
    uploadScore: (file: File, meta: { title: string; composer?: string; voicing?: string }) => Promise<void>;
    removeScore: (score: PersonalScore) => Promise<void>;
  }
  ```
  `uploadScore` throws `Error(message)` on validation failure so the dialog can toast it.

- [ ] **Step 1: Write the hook** (no isolated unit test — the query/storage chain is exercised by Task 4's component test with this module mocked, and end-to-end in Task 7's browser pass; keep the hook free of logic beyond wiring)

```ts
// src/hooks/usePersonalScores.ts
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  PERSONAL_SCORES_BUCKET, personalScoreUploadPath, validateScoreFile,
} from '@/lib/personalLibrary';

export interface PersonalScore {
  id: string;
  user_id: string;
  title: string;
  composer: string | null;
  voicing: string | null;
  source: 'upload' | 'cpdl' | 'purchase';
  pd_work_id: string | null;
  entitlement_id: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  created_at: string;
}

export function usePersonalScores() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: scores = [], isLoading } = useQuery<PersonalScore[]>({
    queryKey: ['personal-scores', user?.id],
    enabled: !!user,
    queryFn: async () => {
      // gw_personal_scores is not in generated types yet (types regen pending)
      const { data, error } = await (supabase as any)
        .from('gw_personal_scores')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PersonalScore[];
    },
  });

  const uploadScore = useCallback(
    async (file: File, meta: { title: string; composer?: string; voicing?: string }) => {
      if (!user) throw new Error('Sign in to add music.');
      const invalid = validateScoreFile(file);
      if (invalid) throw new Error(invalid);
      const path = personalScoreUploadPath(user.id, file.name);
      const { error: upErr } = await supabase.storage
        .from(PERSONAL_SCORES_BUCKET)
        .upload(path, file, { contentType: 'application/pdf', upsert: false });
      if (upErr) throw new Error(upErr.message);
      const { error: insErr } = await (supabase as any).from('gw_personal_scores').insert({
        user_id: user.id,
        title: meta.title.trim(),
        composer: meta.composer?.trim() || null,
        voicing: meta.voicing?.trim() || null,
        source: 'upload',
        storage_path: path,
      });
      if (insErr) {
        // don't strand the object if the row failed
        await supabase.storage.from(PERSONAL_SCORES_BUCKET).remove([path]);
        throw new Error(insErr.message);
      }
      qc.invalidateQueries({ queryKey: ['personal-scores', user.id] });
    },
    [user, qc],
  );

  const removeScore = useCallback(
    async (score: PersonalScore) => {
      const { error } = await (supabase as any)
        .from('gw_personal_scores')
        .delete()
        .eq('id', score.id);
      if (error) throw new Error(error.message);
      if (score.source === 'upload') {
        await supabase.storage.from(PERSONAL_SCORES_BUCKET).remove([score.storage_path]);
      }
      qc.invalidateQueries({ queryKey: ['personal-scores', user?.id] });
    },
    [user, qc],
  );

  return { scores, isLoading, uploadScore, removeScore };
}
```

- [ ] **Step 2: Typecheck via build**

Run: `npm run build 2>&1 | tail -2`
Expected: `✓ built in …` (vite build is the working typecheck; `tsc --noEmit` is a no-op in this repo)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePersonalScores.ts
git commit -m "feat(library): usePersonalScores hook (list/upload/remove)"
```

---

### Task 4: MyMusicTab component + upload dialog

**Files:**
- Create: `src/components/music-library/MyMusicTab.tsx`
- Test: `src/components/music-library/MyMusicTab.test.tsx`

**Interfaces:**
- Consumes: `usePersonalScores`, `PersonalScore` from `@/hooks/usePersonalScores`; `getSignedUrl` from `@/utils/storage`; shadcn `Button`, `Dialog`, `Input`, `Label`, `Badge`; `toast` from `sonner`.
- Produces: `export function MyMusicTab(): JSX.Element` — self-contained tab body (list + upload dialog + viewer dialog). `onOpen(score)` resolves the PDF via `getSignedUrl(PERSONAL_SCORES_BUCKET, score.storage_path)` and opens it in an iframe-based dialog (phase 1: no annotation persistence — annotation tables FK to gw_sheet_music).

- [ ] **Step 1: Write the failing component test**

```tsx
// src/components/music-library/MyMusicTab.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MyMusicTab } from './MyMusicTab';
import type { PersonalScore } from '@/hooks/usePersonalScores';

const state: {
  scores: PersonalScore[]; isLoading: boolean;
} = { scores: [], isLoading: false };

vi.mock('@/hooks/usePersonalScores', () => ({
  usePersonalScores: () => ({
    scores: state.scores, isLoading: state.isLoading,
    uploadScore: vi.fn(), removeScore: vi.fn(),
  }),
}));
vi.mock('@/utils/storage', () => ({ getSignedUrl: vi.fn(async () => 'https://signed.example/x.pdf') }));

const score = (over: Partial<PersonalScore>): PersonalScore => ({
  id: 's1', user_id: 'u1', title: 'Ave Maria', composer: 'Gounod', voicing: 'SATB',
  source: 'upload', pd_work_id: null, entitlement_id: null,
  storage_path: 'u1/uploads/a.pdf', thumbnail_path: null,
  created_at: '2026-07-12T00:00:00Z', ...over,
});

afterEach(cleanup);

describe('MyMusicTab', () => {
  it('shows the inviting empty state when there are no scores', () => {
    state.scores = []; state.isLoading = false;
    render(<MyMusicTab />);
    expect(screen.getByText(/no music yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add a pdf/i })).toBeInTheDocument();
  });

  it('lists scores with source badges', () => {
    state.scores = [
      score({ id: '1', title: 'Ave Maria', source: 'upload' }),
      score({ id: '2', title: 'Sicut Cervus', source: 'cpdl' }),
      score({ id: '3', title: 'New Dawn', source: 'purchase' }),
    ];
    render(<MyMusicTab />);
    expect(screen.getByText('Ave Maria')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('CPDL')).toBeInTheDocument();
    expect(screen.getByText('Lion & Lamb')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    state.scores = []; state.isLoading = true;
    render(<MyMusicTab />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/music-library/MyMusicTab.test.tsx`
Expected: FAIL — cannot resolve `./MyMusicTab`

- [ ] **Step 3: Implement the component**

```tsx
// src/components/music-library/MyMusicTab.tsx
// "My Music" — the user's personal library (uploads now; CPDL saves and
// purchases land here in later phases). User-scoped, follows the person
// across tenants. Spec: docs/superpowers/specs/2026-07-12-personal-music-library-design.md
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Music, Plus, Trash2, FileMusic } from 'lucide-react';
import { toast } from 'sonner';
import { usePersonalScores, type PersonalScore } from '@/hooks/usePersonalScores';
import { getSignedUrl } from '@/utils/storage';
import { PERSONAL_SCORES_BUCKET } from '@/lib/personalLibrary';

const SOURCE_LABEL: Record<PersonalScore['source'], string> = {
  upload: 'Upload',
  cpdl: 'CPDL',
  purchase: 'Lion & Lamb',
};

export function MyMusicTab() {
  const { scores, isLoading, uploadScore, removeScore } = usePersonalScores();
  const [adding, setAdding] = useState(false);
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const [viewingTitle, setViewingTitle] = useState('');

  const openScore = async (s: PersonalScore) => {
    const url = await getSignedUrl(PERSONAL_SCORES_BUCKET, s.storage_path);
    if (!url) { toast.error('Could not open that score. Try again.'); return; }
    setViewingTitle(s.title);
    setViewingUrl(url);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-8">Loading your music…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Your personal library — it follows you across every group you sing with.
        </p>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add a PDF
        </Button>
      </div>

      {scores.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center bg-muted/30">
          <Music className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
          <p className="text-sm font-medium">No music yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add a PDF, save a public-domain score, or buy one from a publisher.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scores.map((s) => (
            <li key={s.id} className="group relative rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
              <button type="button" className="block w-full text-left" onClick={() => openScore(s)}>
                <div className="flex items-center gap-2">
                  <FileMusic className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-semibold leading-tight truncate">{s.title}</span>
                </div>
                {s.composer && (
                  <div className="text-xs text-muted-foreground truncate mt-1">{s.composer}</div>
                )}
                <div className="mt-2 flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-xs">{SOURCE_LABEL[s.source]}</Badge>
                  {s.voicing && <Badge variant="outline" className="text-xs">{s.voicing}</Badge>}
                </div>
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm(`Remove "${s.title}" from My Music?`)) return;
                  try { await removeScore(s); toast.success('Removed'); }
                  catch (e) { toast.error(e instanceof Error ? e.message : 'Remove failed'); }
                }}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                aria-label={`Remove ${s.title}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <UploadDialog
        open={adding}
        onClose={() => setAdding(false)}
        onUpload={async (file, meta) => {
          await uploadScore(file, meta);
          toast.success(`"${meta.title}" added to My Music`);
        }}
      />

      {/* Phase 1 viewer: plain PDF (annotation tables FK to gw_sheet_music). */}
      <Dialog open={!!viewingUrl} onOpenChange={(o) => !o && setViewingUrl(null)}>
        <DialogContent className="max-w-5xl h-[85vh] p-0 flex flex-col">
          <DialogHeader className="px-4 pt-3 pb-2 shrink-0">
            <DialogTitle className="text-sm">{viewingTitle}</DialogTitle>
          </DialogHeader>
          {viewingUrl && (
            <iframe title={viewingTitle} src={viewingUrl} className="flex-1 w-full border-0 rounded-b-xl" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UploadDialog({ open, onClose, onUpload }: {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, meta: { title: string; composer?: string; voicing?: string }) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [voicing, setVoicing] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => { setFile(null); setTitle(''); setComposer(''); setVoicing(''); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a PDF to My Music</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="score-file">PDF file</Label>
            <Input
              id="score-file" type="file" accept="application/pdf" className="mt-1"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !title) setTitle(f.name.replace(/\.pdf$/i, ''));
              }}
            />
          </div>
          <div>
            <Label htmlFor="score-title">Title</Label>
            <Input id="score-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="score-composer">Composer</Label>
              <Input id="score-composer" value={composer} onChange={(e) => setComposer(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="score-voicing">Voicing</Label>
              <Input id="score-voicing" value={voicing} onChange={(e) => setVoicing(e.target.value)} placeholder="SATB" className="mt-1" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={busy}>Cancel</Button>
          <Button
            disabled={!file || !title.trim() || busy}
            onClick={async () => {
              if (!file) return;
              setBusy(true);
              try {
                await onUpload(file, { title, composer: composer || undefined, voicing: voicing || undefined });
                reset(); onClose();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Upload failed');
              } finally { setBusy(false); }
            }}
          >
            {busy ? 'Adding…' : 'Add to My Music'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/music-library/MyMusicTab.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/music-library/MyMusicTab.tsx src/components/music-library/MyMusicTab.test.tsx
git commit -m "feat(library): My Music tab with uploads, source badges, PDF dialog"
```

---

### Task 5: Wire My Music tab into the dashboard Music Library

**Files:**
- Modify: `src/pages/dashboard/MusicLibraryPage.tsx` (TopTab type ~line 42; tabs array ~line 143; tab-body render below it)

**Interfaces:**
- Consumes: `MyMusicTab` from `@/components/music-library/MyMusicTab`.

- [ ] **Step 1: Extend the tab set**

In `src/pages/dashboard/MusicLibraryPage.tsx`:

```tsx
// type (line ~42)
type TopTab = 'scores' | 'my-music' | 'setlists' | 'public-domain';

// import (with the other component imports)
import { MyMusicTab } from '@/components/music-library/MyMusicTab';

// tabs array — add after 'scores':
{ key: 'my-music', label: 'My Music', Icon: FileMusic },
// (import FileMusic from lucide-react alongside the existing icon imports)

// tab body — alongside the existing topTab === 'setlists' / 'public-domain' branches:
{topTab === 'my-music' && <MyMusicTab />}
```

- [ ] **Step 2: Build**

Run: `npm run build 2>&1 | tail -2`
Expected: `✓ built in …`

- [ ] **Step 3: Manual smoke via preview**

Run: `npm run preview -- --port 4199 --strictPort` and open `http://localhost:4199/dashboard/music-library` — expect redirect to sign-in (unauthenticated), no console module errors. (Authed check happens in Task 7.)

- [ ] **Step 4: Commit**

```bash
git add src/pages/dashboard/MusicLibraryPage.tsx
git commit -m "feat(library): My Music tab in dashboard Music Library"
```

---

### Task 6: shared_with_members toggle + member filtering

**Files:**
- Modify: `src/pages/dashboard/MusicLibraryPage.tsx` (ScoreRow interface ~line 49; scores query ~line 97; score card actions ~line 200)

**Interfaces:**
- Consumes: `canEditMusicLibrary()` from `useUserRole` (already used in this file as `canEdit`).
- Produces: members (non-editors) only ever fetch shared scores; editors see all and can toggle.

- [ ] **Step 1: Add the column to the row type and query**

```tsx
// ScoreRow interface: add
shared_with_members: boolean | null;

// queryFn select list: append ', shared_with_members'

// after the base query is built, before applyFilter:
if (!canEdit) q = q.eq('shared_with_members', true);
// include canEdit in the queryKey so the cache splits per role:
queryKey: ['music-library-scores', scope, canEdit],
```

- [ ] **Step 2: Add the editor toggle to the score card**

In the score card action row (where the edit pencil renders, editors only):

```tsx
{canEdit && (
  <Button
    size="sm"
    variant={r.shared_with_members ? 'secondary' : 'outline'}
    className="text-xs"
    onClick={async (e) => {
      e.stopPropagation();
      const next = !r.shared_with_members;
      const { error } = await (supabase as any)
        .from('gw_sheet_music')
        .update({ shared_with_members: next })
        .eq('id', r.id);
      if (error) { toast.error('Could not update sharing'); return; }
      qc.invalidateQueries({ queryKey: ['music-library-scores'] });
      toast.success(next ? 'Shared with members' : 'No longer shared');
    }}
  >
    {r.shared_with_members ? 'Shared' : 'Share'}
  </Button>
)}
```

- [ ] **Step 3: Build**

Run: `npm run build 2>&1 | tail -2`
Expected: `✓ built in …`

- [ ] **Step 4: Commit**

```bash
git add src/pages/dashboard/MusicLibraryPage.tsx
git commit -m "feat(library): shared-with-members toggle; members see only shared scores"
```

---

### Task 7: Migration apply, deploy, end-to-end verification

**Files:** none new (operations)

- [ ] **Step 1: Run the full nav + new unit tests**

Run: `npx vitest run src/lib/personalLibrary.test.ts src/components/music-library/MyMusicTab.test.tsx src/lib/navigation`
Expected: all PASS

- [ ] **Step 2: Apply migration on the droplet (postgres superuser) and run the assert test**

```bash
scp supabase/migrations/20260712120000_personal_music_library.sql supabase/migrations/tests/personal_music_library_test.sql root@198.211.113.144:/tmp/
ssh root@198.211.113.144 'docker exec -i $(docker ps -qf name=supabase-db) psql -U postgres -d postgres -f /tmp/20260712120000_personal_music_library.sql && docker exec -i $(docker ps -qf name=supabase-db) psql -U postgres -d postgres -f /tmp/personal_music_library_test.sql'
```
Expected: migration applies cleanly; test file ends with `ROLLBACK` and no `ASSERT` failures. (Adjust the `docker ps` filter to the actual supabase-db container name — check with `docker ps | grep db` first; NEVER `docker compose down`.)

- [ ] **Step 3: Merge + deploy (Kevin's approval required for both)**

Open PR from `personal-music-library`, request Kevin's merge; after merge: `npm run build`, then `rsync -az --exclude 'tenants' dist/ root@198.211.113.144:/var/www/gleeworld/html/` (requires Kevin naming the deploy).

- [ ] **Step 4: Authed browser verification on demo tenant**

Via `demo.gleeworld.org/try` (director role): Music Library → My Music tab → upload a small PDF → appears with Upload badge → opens in dialog → remove works. Scores tab → Share toggle on a score. Switch role to student (demo bar) → Scores tab shows only shared scores; My Music is empty and personal. Note: demo tenant is read-only for some writes — if the RPC-write guard blocks the upload, verify upload on gleeworld.org with a real account instead.

- [ ] **Step 5: Record follow-ups**

Add to the PR description: (a) types regen for `gw_personal_scores` + `shared_with_members`; (b) annotation support for personal scores (annotation tables FK `gw_sheet_music` — needs nullable `personal_score_id` or a polymorphic key); (c) phases 2-4 per spec.

---

## Self-review notes

- Spec coverage (phase 1 scope only): table+RLS+bucket ✔ (Task 1), uploads ✔ (Tasks 2-4), My Music tab ✔ (Tasks 4-5), shared_with_members ✔ (Tasks 1, 6), deploy/verify gates ✔ (Task 7). Phases 2-4 intentionally not in this plan.
- Names cross-checked: `gw_personal_scores` / `personal-scores` / `PERSONAL_SCORES_BUCKET` / `personalScoreUploadPath` / `usePersonalScores` / `MyMusicTab` consistent across tasks.
- Known deviation (annotations) called out in Global Constraints and Task 7 follow-ups.
