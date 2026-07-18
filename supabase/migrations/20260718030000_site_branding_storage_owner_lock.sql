-- Close a live, independent cross-tenant vulnerability found while auditing
-- the 2026-07-16 gw_site_blocks leak (unrelated root cause, discovered
-- during that investigation): the `site-branding` Storage bucket's
-- UPDATE/DELETE policies only check "is this user an admin of ANY tenant",
-- with no tenant match at all. Any admin of any tenant can currently
-- overwrite or delete any OTHER tenant's uploaded logo/hero/about image in
-- this shared bucket. Object paths are a flat namespace (e.g.
-- `logo-<timestamp>.png`, see src/components/public-site/ImageUploadField.tsx)
-- with no tenant-id prefix, so we can't scope by path today.
--
-- Interim fix (this migration): tighten UPDATE/DELETE to the object's own
-- `owner_id` (Supabase Storage populates this from auth.uid() at upload
-- time — confirmed populated on 100% of existing site-branding objects) or
-- the platform owner. This closes the cross-tenant clobber/delete gap with
-- zero data migration and no app-code change, at the cost of a same-tenant
-- edge case: a second admin on the same tenant can't replace a logo a
-- DIFFERENT admin on their own tenant originally uploaded (they can still
-- upload a new one — INSERT is unaffected — just not overwrite/delete the
-- old object). Read access remains public/bucket-wide (intentional — these
-- render on public pages).
--
-- Proper long-term fix (NOT this migration, needs planning + an app-code
-- path-prefix change + a one-time rename of existing objects): scope by a
-- real tenant_id, e.g. tenant-prefixed paths (`${tenant_id}/logo-...png`)
-- checked against current_tenant_id(), matching this repo's tenant_id-scoped
-- RLS pattern used everywhere else.
drop policy if exists "branding bucket admin update" on storage.objects;
create policy "branding bucket admin update"
  on storage.objects
  for update
  using (
    bucket_id = 'site-branding'
    and (owner_id = auth.uid()::text or public.is_platform_owner())
  );

drop policy if exists "branding bucket admin delete" on storage.objects;
create policy "branding bucket admin delete"
  on storage.objects
  for delete
  using (
    bucket_id = 'site-branding'
    and (owner_id = auth.uid()::text or public.is_platform_owner())
  );
