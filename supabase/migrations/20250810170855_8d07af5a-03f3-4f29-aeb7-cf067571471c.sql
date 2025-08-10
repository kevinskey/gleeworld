-- Fix user deletion being blocked by audit log FK
-- Make gw_security_audit_log.user_id nullable and set FK to ON DELETE SET NULL

BEGIN;

-- Ensure the column can be set to NULL when the referenced auth user is deleted
ALTER TABLE public.gw_security_audit_log
  ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing FK if present
ALTER TABLE public.gw_security_audit_log
  DROP CONSTRAINT IF EXISTS gw_security_audit_log_user_id_fkey;

-- Recreate FK pointing to auth.users with ON DELETE SET NULL to avoid blocking deletions
ALTER TABLE public.gw_security_audit_log
  ADD CONSTRAINT gw_security_audit_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Optional: index for faster lookups by user (noop if already exists)
CREATE INDEX IF NOT EXISTS idx_gw_security_audit_log_user_id
  ON public.gw_security_audit_log(user_id);

COMMIT;