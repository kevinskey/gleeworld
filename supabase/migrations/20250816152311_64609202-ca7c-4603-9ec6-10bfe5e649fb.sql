-- Phase 1: Critical Database Security Fixes (Final)

-- 1. Fix admin_contract_notifications - Remove public access policy
DROP POLICY IF EXISTS "Allow public access to admin notifications" ON admin_contract_notifications;

-- Add strict admin-only policies for admin_contract_notifications
CREATE POLICY "Admins can view admin notifications" 
ON admin_contract_notifications 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Admins can insert admin notifications" 
ON admin_contract_notifications 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Admins can update admin notifications" 
ON admin_contract_notifications 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Admins can delete admin notifications" 
ON admin_contract_notifications 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- 2. Fix audio_archive - Remove public ALL access policy
DROP POLICY IF EXISTS "Audio archive access" ON audio_archive;

-- Add proper policies for audio_archive
CREATE POLICY "Anyone can view public audio" 
ON audio_archive 
FOR SELECT 
USING (is_public = true OR EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Admins can manage audio archive" 
ON audio_archive 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);