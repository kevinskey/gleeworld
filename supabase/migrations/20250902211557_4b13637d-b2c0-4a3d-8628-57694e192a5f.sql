-- Fix storage policies for sheet-music bucket to allow executive board members to upload
-- Update the policy to allow executive board members and admins to insert sheet music

DROP POLICY IF EXISTS "Admins and librarians can insert sheet music" ON storage.objects;

CREATE POLICY "Admins, exec board and librarians can insert sheet music"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sheet-music' AND (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (
        is_admin = true 
        OR is_super_admin = true 
        OR role = 'librarian'
        OR is_exec_board = true
      )
    )
  )
);

-- Also update the delete policy to be consistent
DROP POLICY IF EXISTS "Admins and librarians can delete sheet music" ON storage.objects;

CREATE POLICY "Admins, exec board and librarians can delete sheet music"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'sheet-music' AND (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (
        is_admin = true 
        OR is_super_admin = true 
        OR role = 'librarian'
        OR is_exec_board = true
      )
    )
  )
);

-- Update the update policy to be consistent
DROP POLICY IF EXISTS "Admins and librarians can update sheet music" ON storage.objects;

CREATE POLICY "Admins, exec board and librarians can update sheet music"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'sheet-music' AND (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (
        is_admin = true 
        OR is_super_admin = true 
        OR role = 'librarian'
        OR is_exec_board = true
      )
    )
  )
);