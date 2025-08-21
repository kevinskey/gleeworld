-- Temporarily disable RLS to test if the issue is policy-related
ALTER TABLE public.gw_appointments DISABLE ROW LEVEL SECURITY;

-- Add a comment to track this temporary change
COMMENT ON TABLE public.gw_appointments IS 'RLS temporarily disabled for troubleshooting appointment booking issue';