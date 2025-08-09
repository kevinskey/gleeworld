-- Create practice-media bucket for MP3 uploads (idempotent)
insert into storage.buckets (id, name, public)
values ('practice-media', 'practice-media', true)
on conflict (id) do nothing;

-- Ensure fresh policies (drop then create)
drop policy if exists "Practice media is publicly accessible" on storage.objects;
drop policy if exists "Users can upload their own practice media" on storage.objects;
drop policy if exists "Users can update their practice media" on storage.objects;
drop policy if exists "Users can delete their practice media" on storage.objects;

create policy "Practice media is publicly accessible"
  on storage.objects for select
  using (bucket_id = 'practice-media');

create policy "Users can upload their own practice media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'practice-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their practice media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'practice-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their practice media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'practice-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );