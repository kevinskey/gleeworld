-- Concert Program rebuild: block-model document + print designs.
-- Spec: docs/superpowers/specs/2026-08-17-concert-program-rebuild-design.md
-- NOTE self-hosted droplet has no schema_migrations; this file is applied
-- manually via psql -U supabase_admin at deploy time.

ALTER TABLE public.gw_concert_programs
  ADD COLUMN IF NOT EXISTS print_design text NOT NULL DEFAULT 'classic-1943'
    CHECK (print_design IN ('classic-1943','modern-clean','formal')),
  ADD COLUMN IF NOT EXISTS blocks jsonb NOT NULL DEFAULT '[]';

-- Retire trifold / qr-lobby (prod verified 2026-08-17: zero such rows; safety no-op).
UPDATE public.gw_concert_programs
   SET print_format = 'letter-portrait'
 WHERE print_format IN ('trifold','qr-lobby');

ALTER TABLE public.gw_concert_programs
  DROP CONSTRAINT gw_concert_programs_print_format_check;
ALTER TABLE public.gw_concert_programs
  ADD CONSTRAINT gw_concert_programs_print_format_check
    CHECK (print_format IN ('letter-portrait','half-fold'));

NOTIFY pgrst, 'reload schema';
