-- Multi-page public sites + retirement-page tables.
-- Self-hosted: this file is record-only; apply by hand as supabase_admin.

-- 1. Pages: every site block belongs to a page; existing blocks are 'home'.
ALTER TABLE public.gw_site_blocks
  ADD COLUMN IF NOT EXISTS page text NOT NULL DEFAULT 'home'
  CHECK (page ~ '^[a-z0-9-]{2,40}$');

-- 2. Audition signups (signed-in form block). One row per user per tenant.
CREATE TABLE IF NOT EXISTS public.gw_audition_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  voice_part text NOT NULL,
  era text,
  phone text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
ALTER TABLE public.gw_audition_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY audition_signup_insert_self ON public.gw_audition_signups
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY audition_signup_update_self ON public.gw_audition_signups
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY audition_signup_read_self_or_admin ON public.gw_audition_signups
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_current_user_admin_or_super_admin());
CREATE POLICY audition_signup_tenant_isolation ON public.gw_audition_signups
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- 3. Wish wall posts (login to post, world-readable unless hidden).
CREATE TABLE IF NOT EXISTS public.gw_wish_wall_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL,
  class_year text,
  message text NOT NULL CHECK (length(message) BETWEEN 1 AND 1000),
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gw_wish_wall_posts ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon on the public site) reads visible posts; tenant
-- admins also see hidden ones (rendered dimmed, for unhide).
CREATE POLICY wish_wall_read_visible ON public.gw_wish_wall_posts
  FOR SELECT
  USING (hidden = false OR public.is_current_user_admin_or_super_admin());
CREATE POLICY wish_wall_insert_self ON public.gw_wish_wall_posts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY wish_wall_admin_hide ON public.gw_wish_wall_posts
  FOR UPDATE TO authenticated
  USING (public.is_current_user_admin_or_super_admin())
  WITH CHECK (public.is_current_user_admin_or_super_admin());
CREATE POLICY wish_wall_delete_own_or_admin ON public.gw_wish_wall_posts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_current_user_admin_or_super_admin());
-- Writes stay inside the caller's tenant; reads are cross-tenant-safe
-- because the public page filters by tenant explicitly (join on slug).
CREATE POLICY wish_wall_write_tenant_isolation ON public.gw_wish_wall_posts
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE INDEX IF NOT EXISTS idx_wish_wall_tenant_visible
  ON public.gw_wish_wall_posts (tenant_id, hidden, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audition_signups_tenant
  ON public.gw_audition_signups (tenant_id, created_at DESC);
