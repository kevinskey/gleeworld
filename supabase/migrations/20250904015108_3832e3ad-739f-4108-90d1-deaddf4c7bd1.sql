-- Add approval tracking columns to gw_appointments table
ALTER TABLE public.gw_appointments 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_gw_appointments_status ON public.gw_appointments(status);
CREATE INDEX IF NOT EXISTS idx_gw_appointments_pending ON public.gw_appointments(status, created_at) WHERE status = 'pending_approval';