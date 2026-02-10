-- Create the missing gw_attendance_scan_logs table
CREATE TABLE IF NOT EXISTS public.gw_attendance_scan_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_code_id UUID REFERENCES public.gw_attendance_qr_codes(id),
  scanned_by UUID,
  scan_result TEXT NOT NULL,
  scan_message TEXT,
  qr_token_used TEXT,
  event_id UUID,
  session_id UUID,
  scan_location TEXT,
  user_agent TEXT,
  ip_address TEXT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_attendance_scan_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all scan logs
CREATE POLICY "Admins can view scan logs"
ON public.gw_attendance_scan_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (role IN ('admin', 'super-admin') OR is_admin = true)
  )
);

-- Users can view their own scan logs
CREATE POLICY "Users can view own scan logs"
ON public.gw_attendance_scan_logs
FOR SELECT
USING (scanned_by = auth.uid());

-- Allow inserts via security definer functions
CREATE POLICY "System can insert scan logs"
ON public.gw_attendance_scan_logs
FOR INSERT
WITH CHECK (true);