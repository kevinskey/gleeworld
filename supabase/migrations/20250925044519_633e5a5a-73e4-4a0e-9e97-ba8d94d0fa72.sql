-- Fix Drew's profile and ensure both Drew and Soleil have wardrobe manager access

-- First, fix Drew's user_id in gw_profiles (get from auth.users)
UPDATE public.gw_profiles 
SET user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'drewcooper@spelman.edu' 
  LIMIT 1
)
WHERE email = 'drewcooper@spelman.edu' AND user_id IS NULL;

-- For Drew - either insert or update wardrobe_manager record
DO $$
BEGIN
  -- Try to update existing record for Drew
  UPDATE public.gw_executive_board_members 
  SET is_active = true
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'drewcooper@spelman.edu') 
  AND position = 'wardrobe_manager';
  
  -- If no record was updated, insert new one
  IF NOT FOUND THEN
    INSERT INTO public.gw_executive_board_members (user_id, position, is_active)
    SELECT id, 'wardrobe_manager'::executive_position, true
    FROM auth.users 
    WHERE email = 'drewcooper@spelman.edu';
  END IF;
END $$;

-- For Soleil - either insert or update wardrobe_manager record
DO $$
BEGIN
  -- Try to update existing record for Soleil
  UPDATE public.gw_executive_board_members 
  SET is_active = true
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'soleil@spelman.edu') 
  AND position = 'wardrobe_manager';
  
  -- If no record was updated, insert new one
  IF NOT FOUND THEN
    INSERT INTO public.gw_executive_board_members (user_id, position, is_active)
    SELECT id, 'wardrobe_manager'::executive_position, true
    FROM auth.users 
    WHERE email = 'soleil@spelman.edu';
  END IF;
END $$;