-- Multi-tenant scoping for notification_sounds.
--
-- The table stores per-notification-type mp3s (poll, message,
-- announcement, success, warning). Currently there's no tenant_id
-- column and no restrictive isolation policy, so:
--   • Anyone can read all rows regardless of tenant.
--   • Any tenant admin can INSERT / UPDATE / DELETE the platform-wide
--     sounds — a Kevin's World admin re-uploading "message" would
--     replace the tone every tenant hears.
--
-- Fix: add tenant_id, backfill existing rows to the main tenant, and
-- gate reads + writes with the standard RESTRICTIVE tenant policy.
-- The useNotificationSounds hook (src/hooks/useNotificationSounds.ts)
-- already treats an empty result set as a no-op, so tenants that
-- haven't uploaded sounds simply won't hear any until their admin
-- uploads. That's the right default — silent rather than borrowing
-- another tenant's tone.

-- ── Add tenant_id ────────────────────────────────────────────────────

ALTER TABLE public.notification_sounds
  ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Backfill all existing global rows to the main tenant so the current
-- platform site keeps its sounds. Other tenants start empty.
UPDATE public.notification_sounds
   SET tenant_id = (SELECT id FROM public.gw_tenants WHERE slug = 'main')
 WHERE tenant_id IS NULL;

ALTER TABLE public.notification_sounds
  ALTER COLUMN tenant_id SET DEFAULT current_tenant_id();

ALTER TABLE public.notification_sounds
  ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS notification_sounds_tenant_type_idx
  ON public.notification_sounds (tenant_id, sound_type);

-- ── BEFORE INSERT trigger to fill tenant_id from JWT ────────────────

CREATE OR REPLACE FUNCTION notification_sounds_fill_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notification_sounds_fill_tenant_trg ON public.notification_sounds;
CREATE TRIGGER notification_sounds_fill_tenant_trg
  BEFORE INSERT ON public.notification_sounds
  FOR EACH ROW EXECUTE FUNCTION notification_sounds_fill_tenant();

-- ── RLS ──────────────────────────────────────────────────────────────
--
-- Drop the pre-existing permissive "Anyone can read notification
-- sounds" (which had no tenant filter) and rebuild the policy stack
-- with restrictive tenant isolation on top.

DROP POLICY IF EXISTS "Anyone can read notification sounds" ON public.notification_sounds;
DROP POLICY IF EXISTS "Admins can manage notification sounds" ON public.notification_sounds;

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.notification_sounds;
CREATE POLICY tenant_isolation_restrict
  ON public.notification_sounds
  AS RESTRICTIVE
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- All signed-in users in the tenant can read (played on notification).
CREATE POLICY notification_sounds_read
  ON public.notification_sounds
  FOR SELECT
  USING (true);

-- Only tenant admins can upload / replace / delete. The RESTRICTIVE
-- tenant policy above additionally forbids cross-tenant writes so a
-- Kevin's World admin cannot touch main tenant rows even if the
-- admin flag composes true.
CREATE POLICY notification_sounds_admin_write
  ON public.notification_sounds
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
       WHERE p.user_id = auth.uid()
         AND (p.is_admin OR p.is_super_admin)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
       WHERE p.user_id = auth.uid()
         AND (p.is_admin OR p.is_super_admin)
    )
  );
