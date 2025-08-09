-- Fix RLS for study scores tables (drop/create policies idempotently)

alter table if exists public.gw_study_scores enable row level security;

drop policy if exists "Study scores: owners can select" on public.gw_study_scores;
drop policy if exists "Study scores: owners can insert" on public.gw_study_scores;
drop policy if exists "Study scores: owners can update" on public.gw_study_scores;
drop policy if exists "Study scores: owners can delete" on public.gw_study_scores;

create policy "Study scores: owners can select"
  on public.gw_study_scores for select
  using (owner_id = auth.uid());

create policy "Study scores: owners can insert"
  on public.gw_study_scores for insert
  with check (owner_id = auth.uid());

create policy "Study scores: owners can update"
  on public.gw_study_scores for update
  using (owner_id = auth.uid());

create policy "Study scores: owners can delete"
  on public.gw_study_scores for delete
  using (owner_id = auth.uid());

alter table if exists public.gw_study_score_collaborators enable row level security;

drop policy if exists "Collaborators: owner/collab can select" on public.gw_study_score_collaborators;
drop policy if exists "Collaborators: owner can insert" on public.gw_study_score_collaborators;
drop policy if exists "Collaborators: owner/collab can update" on public.gw_study_score_collaborators;
drop policy if exists "Collaborators: owner/collab can delete" on public.gw_study_score_collaborators;

create policy "Collaborators: owner/collab can select"
  on public.gw_study_score_collaborators for select
  using (
    user_id = auth.uid() or exists (
      select 1 from public.gw_study_scores s
      where s.id = study_score_id and s.owner_id = auth.uid()
    )
  );

create policy "Collaborators: owner can insert"
  on public.gw_study_score_collaborators for insert
  with check (
    exists (
      select 1 from public.gw_study_scores s
      where s.id = study_score_id and s.owner_id = auth.uid()
    )
  );

create policy "Collaborators: owner/collab can update"
  on public.gw_study_score_collaborators for update
  using (
    user_id = auth.uid() or exists (
      select 1 from public.gw_study_scores s
      where s.id = study_score_id and s.owner_id = auth.uid()
    )
  );

create policy "Collaborators: owner/collab can delete"
  on public.gw_study_score_collaborators for delete
  using (
    user_id = auth.uid() or exists (
      select 1 from public.gw_study_scores s
      where s.id = study_score_id and s.owner_id = auth.uid()
    )
  );

-- Storage delete policy for study-scores
drop policy if exists "Users can delete their study scores files" on storage.objects;
create policy "Users can delete their study scores files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'study-scores' and auth.uid()::text = (storage.foldername(name))[1]
  );