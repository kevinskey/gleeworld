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
