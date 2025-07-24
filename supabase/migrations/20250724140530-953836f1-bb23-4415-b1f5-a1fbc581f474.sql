-- PHASE 1: IMMEDIATE CRITICAL SECURITY FIXES

-- 1. Enable RLS on gw_appointments table (currently missing RLS)
ALTER TABLE public.gw_appointments ENABLE ROW LEVEL SECURITY;

-- 2. Drop overly permissive policies and replace with secure ones

-- Fix gw_profiles - remove "true" policies and add proper restrictions
DROP POLICY IF EXISTS "Allow public access to gw_profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Allow anyone to insert gw_profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Allow anyone to select gw_profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Allow anyone to update gw_profiles" ON public.gw_profiles;

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

-- Fix contract_signatures_v2 - remove public access
DROP POLICY IF EXISTS "Allow public access for contract signing" ON public.contract_signatures_v2;

-- Create secure contract signatures policy
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

-- 3. Add RLS policy for gw_appointments
CREATE POLICY "Users can manage their own appointments and admins can manage all"
ON public.gw_appointments FOR ALL
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp 
    WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

-- 4. Secure database functions - add proper search_path
CREATE OR REPLACE FUNCTION public.update_user_role(user_id uuid, new_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if current user is admin or super-admin
    IF NOT (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())) THEN
        RAISE EXCEPTION 'Permission denied: Only admins or super-admins can update user roles';
    END IF;
    
    -- Only super-admins can assign super-admin role
    IF new_role = 'super-admin' AND NOT public.is_super_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Permission denied: Only super-admins can assign super-admin role';
    END IF;
    
    -- Validate role
    IF new_role NOT IN ('admin', 'user', 'super-admin') THEN
        RAISE EXCEPTION 'Invalid role: must be admin, user, or super-admin';
    END IF;
    
    -- Update the role
    UPDATE public.profiles 
    SET role = new_role, updated_at = now()
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$;

-- 5. Update other critical functions with proper search_path
CREATE OR REPLACE FUNCTION public.delete_user_and_data(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if current user is admin or super-admin
    IF NOT (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())) THEN
        RAISE EXCEPTION 'Permission denied: Only admins can delete users';
    END IF;
    
    -- Prevent self-deletion
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot delete your own account';
    END IF;
    
    -- Delete user data in order (respecting foreign key constraints)
    DELETE FROM public.w9_forms WHERE user_id = target_user_id;
    DELETE FROM public.contract_signatures WHERE user_id = target_user_id OR admin_id = target_user_id;
    DELETE FROM public.contract_signatures_v2 WHERE contract_id IN (
        SELECT id FROM public.generated_contracts WHERE created_by = target_user_id
    );
    DELETE FROM public.contract_user_assignments WHERE user_id = target_user_id;
    DELETE FROM public.singer_contract_assignments WHERE singer_id = target_user_id;
    DELETE FROM public.generated_contracts WHERE created_by = target_user_id;
    DELETE FROM public.contracts WHERE created_by = target_user_id;
    DELETE FROM public.contracts_v2 WHERE created_by = target_user_id;
    DELETE FROM public.contract_documents WHERE created_by = target_user_id;
    DELETE FROM public.events WHERE created_by = target_user_id;
    DELETE FROM public.contract_templates WHERE created_by = target_user_id;
    DELETE FROM public.performers WHERE user_id = target_user_id;
    DELETE FROM public.activity_logs WHERE user_id = target_user_id;
    DELETE FROM public.admin_notifications WHERE admin_id = target_user_id;
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    DELETE FROM public.profiles WHERE id = target_user_id;
    
    RETURN TRUE;
END;
$$;

-- 6. Secure storage buckets - make sensitive buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('performer-documents', 'receipts', 'alumni-headshots', 'w9-forms', 'contract-signatures', 'signed-contracts', 'contract-documents', 'user-files', 'sheet-music', 'marked-scores');

-- 7. Add proper storage RLS policies for secure file access
CREATE POLICY "Admins can access all performer documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'performer-documents' AND
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp 
    WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

CREATE POLICY "Users can access their own files in user-files bucket"
ON storage.objects FOR ALL
USING (
  bucket_id = 'user-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins and authorized users can access sheet music"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'sheet-music' AND
  (
    EXISTS (
      SELECT 1 FROM public.gw_profiles gp 
      WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
    ) OR
    EXISTS (
      SELECT 1 FROM public.gw_sheet_music_permissions smp
      JOIN public.gw_sheet_music sm ON sm.id = smp.sheet_music_id
      WHERE sm.file_path = name AND smp.user_id = auth.uid() AND smp.is_active = true
    )
  )
);

-- 8. Add audit logging for sensitive operations
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

-- Function to log security events
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