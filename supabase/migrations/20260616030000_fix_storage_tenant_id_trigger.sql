-- Storage object INSERT trigger: fix wrong tenant_id assignment.
--
-- Background: the uploader uses asSuperUser() for the INSERT to storage.objects,
-- which means request.jwt.* GUCs are NOT set to the end user's JWT — they're set
-- to the storage service's superuser payload. So public.current_tenant_id() and
-- auth.uid() both return NULL during the BEFORE INSERT trigger.
--
-- The original trigger fell back to (SELECT tenant_id FROM storage.buckets WHERE id = bucket_id),
-- which for shared system buckets (sheet-music, marked-scores, etc.) is the MAIN
-- tenant's id — silently mis-tagging every upload. RLS then hides the row from
-- the actual uploader because tenant_id != current_tenant_id() during the
-- subsequent createSignedUrl call (which runs as the authenticated user).
--
-- The fix: look up the uploader's tenant via NEW.owner, which IS populated
-- explicitly by the storage container during upload, before falling back to the
-- bucket's tenant_id.

CREATE OR REPLACE FUNCTION storage.set_tenant_id_objects()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := COALESCE(
      public.current_tenant_id(),
      (SELECT tenant_id FROM public.gw_profiles WHERE user_id = NEW.owner LIMIT 1),
      (SELECT tenant_id FROM storage.buckets WHERE id = NEW.bucket_id)
    );
  END IF;
  RETURN NEW;
END;
$$;
