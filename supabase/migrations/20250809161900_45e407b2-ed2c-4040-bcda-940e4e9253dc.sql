-- Ensure RLS and policies for study scores tables

-- gw_study_scores: owners manage their rows
alter table if exists public.gw_study_scores enable row level security;

create policy if not exists "Study scores: owners can select"
  on public.gw_study_scores for select
  using (owner_id = auth.uid());

create policy if not exists "Study scores: owners can insert"
  on public.gw_study_scores for insert
  with check (owner_id = auth.uid());

create policy if not exists "Study scores: owners can update"
  on public.gw_study_scores for update
  using (owner_id = auth.uid());

create policy if not exists "Study scores: owners can delete"
  on public.gw_study_scores for delete
  using (owner_id = auth.uid());

-- gw_study_score_collaborators: owner or collaborator manages rows
alter table if exists public.gw_study_score_collaborators enable row level security;

create policy if not exists "Collaborators: owner/collab can select"
  on public.gw_study_score_collaborators for select
  using (
    user_id = auth.uid() or exists (
      select 1 from public.gw_study_scores s
      where s.id = study_score_id and s.owner_id = auth.uid()
    )
  );

create policy if not exists "Collaborators: owner can insert"
  on public.gw_study_score_collaborators for insert
  with check (
    exists (
      select 1 from public.gw_study_scores s
      where s.id = study_score_id and s.owner_id = auth.uid()
    )
  );

create policy if not exists "Collaborators: owner/collab can update"
  on public.gw_study_score_collaborators for update
  using (
    user_id = auth.uid() or exists (
      select 1 from public.gw_study_scores s
      where s.id = study_score_id and s.owner_id = auth.uid()
    )
  );

create policy if not exists "Collaborators: owner/collab can delete"
  on public.gw_study_score_collaborators for delete
  using (
    user_id = auth.uid() or exists (
      select 1 from public.gw_study_scores s
      where s.id = study_score_id and s.owner_id = auth.uid()
    )
  );

-- Storage: allow users to delete their own study-scores objects
-- (bucket must exist and be public for read)
drop policy if exists "Users can delete their study scores files" on storage.objects;
create policy "Users can delete their study scores files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'study-scores' and auth.uid()::text = (storage.foldername(name))[1]
  );