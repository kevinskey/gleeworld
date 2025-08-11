-- Create private storage buckets for members-only media
insert into storage.buckets (id, name, public)
values
  ('media-audio', 'media-audio', false),
  ('media-docs', 'media-docs', false)
on conflict (id) do nothing;

-- Storage policies for media-audio
create policy "media-audio insert by owner"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "media-audio select for members/admins/owner"
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'media-audio' and (
      (exists (
        select 1 from public.gw_profiles p
        where p.user_id = auth.uid() and (p.is_admin = true or p.is_super_admin = true or p.role in ('member','executive'))
      ))
      or ((storage.foldername(name))[1] = auth.uid()::text)
    )
  );

create policy "media-audio update by owner or admin"
  on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media-audio' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.gw_profiles p where p.user_id = auth.uid() and (p.is_admin = true or p.is_super_admin = true))
    )
  )
  with check (bucket_id = 'media-audio');

create policy "media-audio delete by owner or admin"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media-audio' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.gw_profiles p where p.user_id = auth.uid() and (p.is_admin = true or p.is_super_admin = true))
    )
  );

-- Storage policies for media-docs
create policy "media-docs insert by owner"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "media-docs select for members/admins/owner"
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'media-docs' and (
      (exists (
        select 1 from public.gw_profiles p
        where p.user_id = auth.uid() and (p.is_admin = true or p.is_super_admin = true or p.role in ('member','executive'))
      ))
      or ((storage.foldername(name))[1] = auth.uid()::text)
    )
  );

create policy "media-docs update by owner or admin"
  on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media-docs' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.gw_profiles p where p.user_id = auth.uid() and (p.is_admin = true or p.is_super_admin = true))
    )
  )
  with check (bucket_id = 'media-docs');

create policy "media-docs delete by owner or admin"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media-docs' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.gw_profiles p where p.user_id = auth.uid() and (p.is_admin = true or p.is_super_admin = true))
    )
  );

-- Ensure gw_media_library has a bucket_id column to track storage bucket used
alter table public.gw_media_library
  add column if not exists bucket_id text;

-- Optional: index for faster queries by created_at
create index if not exists idx_gw_media_library_created_at on public.gw_media_library (created_at desc);
