-- Ensure YouTube Management exists in the base modules table used by dashboards
insert into public.gw_modules (name, key, description, category, is_active, default_permissions)
select
  'youtube-management',
  'youtube-management',
  'Manage YouTube video content and playlists',
  'communications',
  true,
  '["view","manage"]'::jsonb
where not exists (
  select 1 from public.gw_modules where key = 'youtube-management'
);

-- Touch updated_at for consistency (optional)
update public.gw_modules
set updated_at = now()
where key = 'youtube-management';