-- Fix the playlists table column name
alter table if exists playlists rename column public to is_public;

-- Update the RLS policy for playlists with correct column name
drop policy if exists pl_read on playlists;
create policy pl_read on playlists for select using (is_public = true or is_super_admin() or has_role('admin') or auth.uid() = created_by);