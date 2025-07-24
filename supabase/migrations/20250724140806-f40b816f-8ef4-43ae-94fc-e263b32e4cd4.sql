-- PHASE 1: CRITICAL SECURITY FIXES (Simplified version)

-- 1. Enable RLS on gw_appointments (ignore error if already enabled)
DO $$
BEGIN
    ALTER TABLE public.gw_appointments ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
    -- RLS already enabled, continue
END $$;

-- 2. Drop ALL existing policies on gw_profiles and recreate them securely
DO $$
DECLARE
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'gw_profiles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.gw_profiles';
    END LOOP;
END $$;

-- Create secure gw_profiles policies
CREATE POLICY "Users can view their own profile and admins can view all"
ON public.gw_profiles FOR SELECT
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp 
    WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

CREATE POLICY "Users can update their own profile"
ON public.gw_profiles FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update any profile"
ON public.gw_profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp 
    WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

CREATE POLICY "Users can insert their own profile"
ON public.gw_profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

-- 3. Secure contract_signatures_v2
DROP POLICY IF EXISTS "Allow public access for contract signing" ON public.contract_signatures_v2;

CREATE POLICY "Contract owners and signers can access signatures"
ON public.contract_signatures_v2 FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.contracts_v2 c
    WHERE c.id = contract_signatures_v2.contract_id 
    AND (c.created_by = auth.uid() OR auth.uid() IN (
      SELECT profiles.id FROM profiles 
      WHERE profiles.role IN ('admin', 'super-admin')
    ))
  )
);

-- 4. Add RLS policy for gw_appointments
DROP POLICY IF EXISTS "Users can manage their own appointments and admins can manage all" ON public.gw_appointments;

CREATE POLICY "Users can manage their own appointments and admins can manage all"
ON public.gw_appointments FOR ALL
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp 
    WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

-- 5. Secure storage buckets - make sensitive buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('performer-documents', 'receipts', 'alumni-headshots', 'w9-forms', 'contract-signatures', 'signed-contracts', 'contract-documents', 'user-files', 'sheet-music', 'marked-scores');

-- 6. Create security audit log table
CREATE TABLE IF NOT EXISTS public.gw_security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action_type text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.gw_security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view security audit logs"
ON public.gw_security_audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp 
    WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

-- 7. Create security logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action_type text,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}',
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.gw_security_audit_log (
    user_id, action_type, resource_type, resource_id,
    details, ip_address, user_agent
  )
  VALUES (
    auth.uid(), p_action_type, p_resource_type, p_resource_id,
    p_details, p_ip_address, p_user_agent
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;