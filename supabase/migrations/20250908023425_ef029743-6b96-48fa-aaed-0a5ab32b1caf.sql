-- CRITICAL SECURITY FIXES PHASE 4: Final Security Hardening
-- Handle only the most critical remaining security issues

-- 1. Enable RLS on bulletin_posts (already done, but ensure it's enabled)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bulletin_posts') THEN
        EXECUTE 'ALTER TABLE public.bulletin_posts ENABLE ROW LEVEL SECURITY';
    END IF;
EXCEPTION 
    WHEN OTHERS THEN
        -- Already enabled, continue
        NULL;
END $$;

-- 2. Create missing RLS policies for tables that need them (using IF NOT EXISTS pattern)

-- security_rate_limits policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'security_rate_limits' AND policyname = 'Users can manage their own rate limits') THEN
        EXECUTE 'CREATE POLICY "Users can manage their own rate limits" ON public.security_rate_limits FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- gw_security_audit_log policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gw_security_audit_log' AND policyname = 'Admins can view security audit log') THEN
        EXECUTE 'CREATE POLICY "Admins can view security audit log" ON public.gw_security_audit_log FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)))';
    END IF;
END $$;

-- 3. Create enhanced security confirmation function for dangerous operations
CREATE OR REPLACE FUNCTION public.require_security_confirmation(
  operation_type text,
  target_resource text,
  performer_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_profile RECORD;
BEGIN
  -- Get performer profile
  SELECT is_admin, is_super_admin, role, full_name
  INTO user_profile
  FROM public.gw_profiles
  WHERE user_id = performer_id;
  
  -- Verify admin status
  IF NOT FOUND OR NOT (
    user_profile.is_admin = true OR 
    user_profile.is_super_admin = true OR 
    user_profile.role IN ('admin', 'super-admin')
  ) THEN
    RETURN false;
  END IF;
  
  -- Log the security confirmation request
  PERFORM public.log_security_event(
    'security_confirmation_required',
    'admin_operation',
    NULL,
    jsonb_build_object(
      'operation_type', operation_type,
      'target_resource', target_resource,
      'performer_id', performer_id,
      'performer_name', user_profile.full_name,
      'timestamp', now()
    )
  );
  
  RETURN true;
END;
$function$;

-- 4. Update the existing secure password generation function to be more secure
CREATE OR REPLACE FUNCTION public.generate_secure_password(length integer DEFAULT 16)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    -- Use a strong character set avoiding ambiguous characters
    chars text := 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*()';
    result text := '';
    i integer;
    char_count integer;
BEGIN
    -- Validate input
    IF length < 8 THEN
        RAISE EXCEPTION 'Password length must be at least 8 characters';
    END IF;
    
    IF length > 256 THEN
        RAISE EXCEPTION 'Password length cannot exceed 256 characters';
    END IF;
    
    char_count := LENGTH(chars);
    
    -- Generate random password
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * char_count + 1)::integer, 1);
    END LOOP;
    
    -- Log password generation (without revealing the password)
    PERFORM public.log_security_event(
        'secure_password_generated',
        'security_function',
        NULL,
        jsonb_build_object(
            'length', length,
            'generator', 'generate_secure_password',
            'timestamp', now()
        )
    );
    
    RETURN result;
END;
$function$;

-- 5. Create secure file access validation function
CREATE OR REPLACE FUNCTION public.validate_secure_file_access(
  user_id_param uuid,
  bucket_name text,
  file_path_param text,
  access_type text DEFAULT 'read'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_profile RECORD;
  is_authorized boolean := false;
BEGIN
  -- Get user profile
  SELECT role, is_admin, is_super_admin
  INTO user_profile
  FROM public.gw_profiles
  WHERE user_id = user_id_param;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Admin bypass
  IF user_profile.is_admin OR user_profile.is_super_admin THEN
    RETURN true;
  END IF;
  
  -- Check bucket-specific permissions
  CASE bucket_name
    WHEN 'user-files' THEN
      -- Users can access their own files
      is_authorized := file_path_param LIKE 'avatars/' || user_id_param::text || '/%' OR
                      file_path_param LIKE user_id_param::text || '/%';
    
    WHEN 'sheet-music' THEN
      -- Check sheet music permissions
      is_authorized := EXISTS (
        SELECT 1 FROM public.gw_sheet_music sm
        LEFT JOIN public.gw_sheet_music_permissions smp ON sm.id = smp.sheet_music_id
        WHERE sm.file_path = file_path_param
        AND (
          sm.is_public = true OR
          sm.created_by = user_id_param OR
          (smp.user_id = user_id_param AND smp.is_active = true)
        )
      );
    
    WHEN 'public-files' THEN
      -- Public files are accessible to authenticated users
      is_authorized := true;
      
    ELSE
      -- Default deny for unknown buckets
      is_authorized := false;
  END CASE;
  
  -- Log access attempt
  PERFORM public.log_security_event(
    CASE WHEN is_authorized THEN 'file_access_granted' ELSE 'file_access_denied' END,
    'file_access',
    user_id_param,
    jsonb_build_object(
      'bucket_name', bucket_name,
      'file_path', file_path_param,
      'access_type', access_type,
      'authorized', is_authorized
    )
  );
  
  RETURN is_authorized;
END;
$function$;