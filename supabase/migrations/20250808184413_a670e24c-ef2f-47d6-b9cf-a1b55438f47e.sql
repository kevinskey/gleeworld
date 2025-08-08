-- Create public bucket for audition documents
insert into storage.buckets (id, name, public)
values ('audition-docs', 'audition-docs', true)
on conflict (id) do nothing;

-- Ensure clean re-create of policies
drop policy if exists "Public read for audition-docs" on storage.objects;
drop policy if exists "Privileged insert for audition-docs" on storage.objects;
drop policy if exists "Privileged update for audition-docs" on storage.objects;
drop policy if exists "Privileged delete for audition-docs" on storage.objects;

-- Public read policy
create policy "Public read for audition-docs"
on storage.objects
for select
using (bucket_id = 'audition-docs');

-- Insert by admins / super admins / exec board only
create policy "Privileged insert for audition-docs"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'audition-docs'
  and exists (
    select 1 from public.gw_profiles p
    where p.user_id = auth.uid()
      and (p.is_admin is true or p.is_super_admin is true or coalesce(p.exec_board_role, '') <> '')
  )
);

-- Update by privileged users
create policy "Privileged update for audition-docs"
on storage.objects
for update to authenticated
using (
  bucket_id = 'audition-docs'
  and exists (
    select 1 from public.gw_profiles p
    where p.user_id = auth.uid()
      and (p.is_admin is true or p.is_super_admin is true or coalesce(p.exec_board_role, '') <> '')
  )
)
with check (
  bucket_id = 'audition-docs'
  and exists (
    select 1 from public.gw_profiles p
    where p.user_id = auth.uid()
      and (p.is_admin is true or p.is_super_admin is true or coalesce(p.exec_board_role, '') <> '')
  )
);

-- Delete by privileged users
create policy "Privileged delete for audition-docs"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'audition-docs'
  and exists (
    select 1 from public.gw_profiles p
    where p.user_id = auth.uid()
      and (p.is_admin is true or p.is_super_admin is true or coalesce(p.exec_board_role, '') <> '')
  )
);
