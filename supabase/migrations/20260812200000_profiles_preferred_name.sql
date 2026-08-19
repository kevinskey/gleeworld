-- What the assistant calls the user ("call me Doc") — personal, follows the
-- user across workspaces like assistant_name. NULL = use their first name.
-- Record-only: self-hosted prod has no migration runner; apply by hand as
-- supabase_admin BEFORE deploying the assistant-chat edge function.
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS preferred_name text;
