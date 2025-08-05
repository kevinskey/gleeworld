-- Create RLS policies for music_tracks table
-- Allow authenticated users to insert tracks they create
CREATE POLICY "Users can create music tracks" 
ON music_tracks 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Allow users to update tracks they created
CREATE POLICY "Users can update their own music tracks" 
ON music_tracks 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Allow admins to manage all tracks
CREATE POLICY "Admins can manage all music tracks" 
ON music_tracks 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);