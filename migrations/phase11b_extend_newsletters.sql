-- Phase 11b: extend existing gw_newsletters table with section-based fields.
-- Existing alumni-style rows (just `content`) keep working.

BEGIN;

ALTER TABLE public.gw_newsletters
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS header_image_url text,
  ADD COLUMN IF NOT EXISTS intro text,
  ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS footer text;

-- Status check needs to allow our new lifecycle values.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.gw_newsletters'::regclass
      AND conname = 'gw_newsletters_status_check'
  ) THEN
    ALTER TABLE public.gw_newsletters
      ADD CONSTRAINT gw_newsletters_status_check
      CHECK (status IN ('draft','scheduled','sent','failed'));
  END IF;
END$$;

-- Helper index for the scheduled-newsletter sender.
CREATE INDEX IF NOT EXISTS gw_newsletters_scheduled_idx
  ON public.gw_newsletters(scheduled_date) WHERE status = 'scheduled';

COMMIT;
