-- Grant Tyara Petty admin access
UPDATE gw_profiles 
SET is_admin = true 
WHERE user_id = '799ae001-0cd5-438d-87f2-1cbf5434ddf0';

-- Update RLS policy to allow exec board members to manage advertising_hero
DROP POLICY IF EXISTS "Admins can manage advertising hero" ON advertising_hero;

CREATE POLICY "Admins and exec board can manage advertising hero" ON advertising_hero
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  )
);