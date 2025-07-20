-- Update RLS policies for setlists to allow viewing setlists created by super admins and librarians
DROP POLICY IF EXISTS "Users can view public setlists" ON public.setlists;
DROP POLICY IF EXISTS "Users can view their own setlists" ON public.setlists;

-- New policy to allow users to view:
-- 1. Their own setlists
-- 2. Public setlists 
-- 3. Setlists created by super-admin or admin users
CREATE POLICY "Users can view accessible setlists" 
ON public.setlists 
FOR SELECT 
USING (
  created_by = auth.uid() OR 
  is_public = true OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = setlists.created_by 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

-- Update similar policies for sheet_music_setlists table
DROP POLICY IF EXISTS "Users can view public setlists" ON public.sheet_music_setlists;

CREATE POLICY "Users can view accessible sheet music setlists" 
ON public.sheet_music_setlists 
FOR SELECT 
USING (
  created_by = auth.uid() OR 
  is_public = true OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = sheet_music_setlists.created_by 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

-- Update setlist items policies to match
DROP POLICY IF EXISTS "Users can view items in public setlists" ON public.setlist_items;

CREATE POLICY "Users can view items in accessible setlists" 
ON public.setlist_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM setlists 
    WHERE setlists.id = setlist_items.setlist_id 
    AND (
      setlists.created_by = auth.uid() OR 
      setlists.is_public = true OR 
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = setlists.created_by 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);

-- Update sheet_music_setlist_items policies to match
DROP POLICY IF EXISTS "Users can view items in accessible setlists" ON public.sheet_music_setlist_items;

CREATE POLICY "Users can view items in accessible sheet music setlists" 
ON public.sheet_music_setlist_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM sheet_music_setlists sms 
    WHERE sms.id = sheet_music_setlist_items.setlist_id 
    AND (
      sms.created_by = auth.uid() OR 
      sms.is_public = true OR 
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = sms.created_by 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);