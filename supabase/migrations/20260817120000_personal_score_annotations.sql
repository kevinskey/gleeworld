-- 20260817120000_personal_score_annotations.sql
-- Personal-score annotations. gw_sheet_music_annotations FKs gw_sheet_music,
-- so My Music scores (gw_personal_scores) could never persist markup — the
-- phase-1 ledger item this closes. DELIBERATELY NO tenant_id: personal scope,
-- same audit exception as gw_personal_scores (20260712120000). No layer
-- column: annotation layers (voice-part markings) are a group-library concept.
create table public.gw_personal_score_annotations (
  id uuid primary key default gen_random_uuid(),
  personal_score_id uuid not null
    references public.gw_personal_scores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  page_number int not null,
  annotation_type text not null
    check (annotation_type in ('drawing','highlight','text_note','stamp')),
  annotation_data jsonb not null,
  position_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gw_personal_score_annotations_score_page_idx
  on public.gw_personal_score_annotations (personal_score_id, page_number);

alter table public.gw_personal_score_annotations enable row level security;

-- Owner-only. The WITH CHECK subquery also stops annotating someone ELSE's
-- personal score (FK checks bypass RLS, so user_id alone is not enough).
-- Scans a DIFFERENT table than the policy's own — no 42P17 recursion risk.
create policy gw_personal_score_annotations_select
  on public.gw_personal_score_annotations for select
  using (user_id = auth.uid());
create policy gw_personal_score_annotations_insert
  on public.gw_personal_score_annotations for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.gw_personal_scores s
                where s.id = personal_score_id and s.user_id = auth.uid())
  );
create policy gw_personal_score_annotations_update
  on public.gw_personal_score_annotations for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy gw_personal_score_annotations_delete
  on public.gw_personal_score_annotations for delete
  using (user_id = auth.uid());

-- Phase-2 fulfillment idempotency: partner-watermark re-invocation must not
-- duplicate the buyer's My Music row. Partial: uploads/cpdl are unconstrained.
-- Safe to create: prod has zero source='purchase' rows (verified 2026-08-17).
create unique index gw_personal_scores_purchase_uq
  on public.gw_personal_scores (user_id, storage_path)
  where source = 'purchase';
