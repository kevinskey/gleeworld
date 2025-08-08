-- Create a dedicated bucket for audition documents (publicly readable)
insert into storage.buckets (id, name, public)
values ('audition-docs', 'audition-docs', true)
on conflict (id) do nothing;

-- Public can read files in audition-docs (so the PDF can be viewed on the dashboard)
create policy if not exists "Public read for audition-docs"
on storage.objects
for select
using (bucket_id = 'audition-docs');

-- Allow only authenticated admins/super admins/exec board to upload
create policy if not exists "Privileged insert for audition-docs"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'audition-docs'
  and exists (
    select 1 from public.gw_profiles p
    where p.id = auth.uid()
      and (p.is_admin is true or p.is_super_admin is true or coalesce(p.exec_board_role, '') <> '')
  )
);

-- Allow only privileged users to update files in audition-docs
create policy if not exists "Privileged update for audition-docs"
on storage.objects
for update to authenticated
using (
  bucket_id = 'audition-docs'
  and exists (
    select 1 from public.gw_profiles p
    where p.id = auth.uid()
      and (p.is_admin is true or p.is_super_admin is true or coalesce(p.exec_board_role, '') <> '')
  )
)
with check (
  bucket_id = 'audition-docs'
  and exists (
    select 1 from public.gw_profiles p
    where p.id = auth.uid()
      and (p.is_admin is true or p.is_super_admin is true or coalesce(p.exec_board_role, '') <> '')
  )
);

-- Allow only privileged users to delete files in audition-docs
create policy if not exists "Privileged delete for audition-docs"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'audition-docs'
  and exists (
    select 1 from public.gw_profiles p
    where p.id = auth.uid()
      and (p.is_admin is true or p.is_super_admin is true or coalesce(p.exec_board_role, '') <> '')
  )
);
