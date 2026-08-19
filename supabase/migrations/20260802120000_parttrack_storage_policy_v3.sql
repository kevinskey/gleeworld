-- v2's membership subquery ran under the CALLER'S RLS: gw_tenant_members
-- is tenant-isolated, so the very membership row that would grant access
-- is invisible from the storage session (verified by simulating the
-- authenticated role in psql: auth.uid() resolves, count = 0).
-- A SECURITY DEFINER helper bypasses that inner RLS; it also guards the
-- uuid cast so non-tenant prefixes (uploads/...) return false instead of
-- erroring the whole query.

CREATE OR REPLACE FUNCTION public.gw_is_member_of_tenant_path(folder text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE tid uuid;
BEGIN
  BEGIN
    tid := folder::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  RETURN EXISTS (
    SELECT 1 FROM public.gw_tenant_members m
    WHERE m.user_id = auth.uid() AND m.tenant_id = tid
  );
END $$;

DROP POLICY IF EXISTS parttrack_bucket_tenant_read ON storage.objects;
CREATE POLICY parttrack_bucket_tenant_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'parttrack'
    AND public.gw_is_member_of_tenant_path((storage.foldername(name))[1])
  );
