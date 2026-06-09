-- Read Music — progress storage bucket
-- Per-user JSON state at read-music-progress/{auth.uid()}/state.json

insert into storage.buckets (id, name, public)
values ('read-music-progress', 'read-music-progress', false)
on conflict (id) do nothing;

-- Each authenticated user can read their own folder
create policy "read_music_progress_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'read-music-progress'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "read_music_progress_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'read-music-progress'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "read_music_progress_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'read-music-progress'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'read-music-progress'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "read_music_progress_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'read-music-progress'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
