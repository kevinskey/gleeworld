-- Media Library folder sharing (Phase 3a) — WITHIN-TENANT only.
-- See docs/design/2026-07-08-media-folder-sharing.md.
--
-- A share = (owner_user_id, folder) granted to an invited_email. Access
-- is matched at query time by the recipient's GoTrue-VERIFIED JWT email,
-- so no signup-resolution trigger is needed. The RESTRICTIVE
-- tenant_isolation on gw_media_library still ANDs on top, so a share only
-- resolves when grantee and owner share a tenant — cross-tenant is
-- deferred to 3b (would require relaxing that invariant + a review).

CREATE TABLE IF NOT EXISTS public.gw_media_folder_shares (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL DEFAULT public.current_tenant_id(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder        text NOT NULL,
  invited_email text NOT NULL,
  permission    text NOT NULL DEFAULT 'view' CHECK (permission IN ('view')),
  created_by    uuid DEFAULT auth.uid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  revoked_at    timestamptz,
  UNIQUE (owner_user_id, folder, invited_email)
);

-- Normalize email to lower-case on write so the RLS lower()=lower() match
-- is index-friendly and case-insensitive.
CREATE OR REPLACE FUNCTION public.gw_media_folder_shares_norm()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.invited_email := lower(trim(NEW.invited_email));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_gw_media_folder_shares_norm ON public.gw_media_folder_shares;
CREATE TRIGGER trg_gw_media_folder_shares_norm
  BEFORE INSERT OR UPDATE ON public.gw_media_folder_shares
  FOR EACH ROW EXECUTE FUNCTION public.gw_media_folder_shares_norm();

DROP TRIGGER IF EXISTS trg_gw_media_folder_shares_set_tenant ON public.gw_media_folder_shares;
CREATE TRIGGER trg_gw_media_folder_shares_set_tenant
  BEFORE INSERT ON public.gw_media_folder_shares
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

CREATE INDEX IF NOT EXISTS gw_media_folder_shares_grantee_idx
  ON public.gw_media_folder_shares (invited_email) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS gw_media_folder_shares_owner_idx
  ON public.gw_media_folder_shares (owner_user_id, folder);

ALTER TABLE public.gw_media_folder_shares ENABLE ROW LEVEL SECURITY;

-- Tenant isolation (RESTRICTIVE), same shape as the rest of the schema.
CREATE POLICY tenant_isolation_restrict ON public.gw_media_folder_shares
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- A user manages ONLY their own shares (as owner). A grantee can SEE
-- shares addressed to their email (so the UI can show "shared with me").
CREATE POLICY media_folder_shares_owner_all ON public.gw_media_folder_shares
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY media_folder_shares_grantee_read ON public.gw_media_folder_shares
  FOR SELECT TO authenticated
  USING (lower(invited_email) = lower(auth.jwt() ->> 'email'));

-- The actual access grant: a recipient may SELECT gw_media_library rows
-- that belong to a folder shared with their (verified) email. ANDed with
-- the existing RESTRICTIVE tenant isolation → same-tenant only.
DROP POLICY IF EXISTS media_library_shared_select ON public.gw_media_library;
CREATE POLICY media_library_shared_select ON public.gw_media_library
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gw_media_folder_shares s
    WHERE s.owner_user_id = gw_media_library.uploaded_by
      AND s.folder        = gw_media_library.folder
      AND s.revoked_at IS NULL
      AND lower(s.invited_email) = lower(auth.jwt() ->> 'email')
  ));
