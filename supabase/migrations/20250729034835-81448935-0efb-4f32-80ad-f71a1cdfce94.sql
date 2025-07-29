-- Add image_url column to wardrobe announcements table if it doesn't exist
ALTER TABLE gw_wardrobe_announcements 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for wardrobe announcement images if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('wardrobe-announcements', 'wardrobe-announcements', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for wardrobe announcement images
CREATE POLICY "Anyone can view wardrobe announcement images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'wardrobe-announcements');

CREATE POLICY "Tour managers and admins can upload wardrobe announcement images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'wardrobe-announcements' AND 
  (
    EXISTS (
      SELECT 1 FROM gw_executive_board_members 
      WHERE user_id = auth.uid() 
      AND position = 'tour_manager' 
      AND is_active = true
    ) OR
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  )
);

CREATE POLICY "Tour managers and admins can update wardrobe announcement images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'wardrobe-announcements' AND 
  (
    EXISTS (
      SELECT 1 FROM gw_executive_board_members 
      WHERE user_id = auth.uid() 
      AND position = 'tour_manager' 
      AND is_active = true
    ) OR
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  )
);

CREATE POLICY "Tour managers and admins can delete wardrobe announcement images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'wardrobe-announcements' AND 
  (
    EXISTS (
      SELECT 1 FROM gw_executive_board_members 
      WHERE user_id = auth.uid() 
      AND position = 'tour_manager' 
      AND is_active = true
    ) OR
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  )
);