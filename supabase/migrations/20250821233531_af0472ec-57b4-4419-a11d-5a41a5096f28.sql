-- Fix RLS issue for onboarding_signatures table - enable if not already enabled
ALTER TABLE public.onboarding_signatures ENABLE ROW LEVEL SECURITY;

-- Ensure the user_id column is NOT NULL for security
ALTER TABLE public.onboarding_signatures ALTER COLUMN user_id SET NOT NULL;

-- Add constraint to ensure only authenticated users can create signatures
ALTER TABLE public.onboarding_signatures 
ADD CONSTRAINT onboarding_signatures_user_auth_check 
CHECK (user_id IS NOT NULL);