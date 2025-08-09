-- Create practice-media bucket for MP3 uploads
insert into storage.buckets (id, name, public)
values ('practice-media', 'practice-media', true)
on conflict (id) do nothing;

-- Public read access to practice-media
create policy if not exists "Practice media is publicly accessible"
  on storage.objects for select
  using (bucket_id = 'practice-media');

-- Allow authenticated users to upload to their own folder (userId/...)
create policy if not exists "Users can upload their own practice media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'practice-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to update their own objects
create policy if not exists "Users can update their practice media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'practice-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own objects
create policy if not exists "Users can delete their practice media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'practice-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );