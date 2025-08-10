-- Add cancel_token to audition_applications for secure cancellations
ALTER TABLE public.audition_applications
ADD COLUMN IF NOT EXISTS cancel_token uuid DEFAULT gen_random_uuid();

-- Ensure uniqueness of active slots in gw_auditions while allowing cancelled slots to free up
CREATE UNIQUE INDEX IF NOT EXISTS uniq_gw_auditions_slot_active
ON public.gw_auditions (session_id, audition_date, audition_time)
WHERE (status IS NULL OR status <> 'cancelled');

-- Optional: index cancel_token for quick lookup
CREATE INDEX IF NOT EXISTS idx_audition_applications_cancel_token
ON public.audition_applications (cancel_token);
