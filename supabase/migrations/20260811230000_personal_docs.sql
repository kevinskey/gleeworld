-- supabase/migrations/20260811230000_personal_docs.sql
-- Documents word processor (spec: docs/superpowers/specs/2026-08-11-documents-word-processor-design.md)
--
-- gw_personal_docs intentionally has NO tenant_id: personal documents follow
-- the person across tenants, like gw_personal_scores. Multi-tenant RLS
-- audits: this is a deliberate exception.

CREATE TABLE IF NOT EXISTS public.gw_personal_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled',
  content jsonb NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}',
  citation_style text NOT NULL DEFAULT 'mla9' CHECK (citation_style IN ('mla9','apa7')),
  sources jsonb NOT NULL DEFAULT '[]',
  footnotes jsonb NOT NULL DEFAULT '[]',
  paper_meta jsonb NOT NULL DEFAULT '{}',
  word_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gw_personal_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gw_personal_docs_select ON public.gw_personal_docs;
CREATE POLICY gw_personal_docs_select ON public.gw_personal_docs
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS gw_personal_docs_insert ON public.gw_personal_docs;
CREATE POLICY gw_personal_docs_insert ON public.gw_personal_docs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS gw_personal_docs_update ON public.gw_personal_docs;
CREATE POLICY gw_personal_docs_update ON public.gw_personal_docs
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS gw_personal_docs_delete ON public.gw_personal_docs;
CREATE POLICY gw_personal_docs_delete ON public.gw_personal_docs
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS gw_personal_docs_user_idx
  ON public.gw_personal_docs (user_id, updated_at DESC);

-- Task 9: in-document image uploads. A first pass reused the existing
-- 'user-files' bucket with a 'personal-docs/' folder prefix, scoped by an
-- owner-checking policy — but 'user-files' already carries pre-existing
-- PERMISSIVE policies from 20250804124514_25d7020b-...sql: "storage_select_all"
-- (`FOR SELECT TO authenticated USING (true)` — every bucket, not just this
-- one) and blanket bucket-only insert/update/delete ("storage_insert_auth"
-- etc., `WITH CHECK/USING (bucket_id = 'user-files')`, no owner check).
-- PERMISSIVE policies OR together in Postgres RLS, so an owner-scoped
-- policy added alongside those grants nothing — any authenticated user
-- could still read/write any object in 'user-files' via the pre-existing
-- rules. Fixed by giving Documents its OWN private bucket instead, mirroring
-- 'personal-scores' (20260712120000_personal_music_library.sql). Path (bucket
-- already scopes to Documents, so no 'personal-docs/' prefix is needed on
-- top):
--   <user_id>/<doc_id>/<uuid>.<ext>
--
-- IMPORTANT — a private bucket is NOT self-isolating here, and the four
-- policies below do not stand on their own. Two follow-up migrations are
-- required for this to behave as written:
--
--   20260811233000_personal_docs_storage_exempt.sql
--     storage.objects carries a RESTRICTIVE tenant_isolation_restrict policy
--     that ANDs with everything below. 'personal-docs' is not on its exempt
--     list, so every read and write would have to satisfy
--     tenant_id = current_tenant_id() — a column the storage API stamps
--     without the caller's tenant context, and which is meaningless for a
--     user-scoped bucket. Without that migration, the feature does not work
--     at all (the same failure personal-scores hit, see 20260718180000).
--
--   20260811233500_storage_drop_select_all_and_sensitive_personal_docs.sql
--     'user-files' is not the only bucket "storage_select_all" applies to —
--     that policy is `FOR SELECT TO authenticated USING (true)` over EVERY
--     bucket, so a dedicated bucket does not escape it. It also predates and
--     survived the 20260610200000 lockdown. That migration drops it and adds
--     'personal-docs' to is_sensitive_bucket() so storage_auth_select
--     requires ownership.
INSERT INTO storage.buckets (id, name, public)
VALUES ('personal-docs', 'personal-docs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS personal_docs_images_select ON storage.objects;
CREATE POLICY personal_docs_images_select ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'personal-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
DROP POLICY IF EXISTS personal_docs_images_insert ON storage.objects;
CREATE POLICY personal_docs_images_insert ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'personal-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
DROP POLICY IF EXISTS personal_docs_images_update ON storage.objects;
CREATE POLICY personal_docs_images_update ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'personal-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
DROP POLICY IF EXISTS personal_docs_images_delete ON storage.objects;
CREATE POLICY personal_docs_images_delete ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'personal-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
