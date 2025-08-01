-- Create storage bucket for SMS images
INSERT INTO storage.buckets (id, name, public)
VALUES ('sms-images', 'sms-images', true);

-- Create storage policies for SMS images bucket
CREATE POLICY "SMS images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'sms-images');

CREATE POLICY "Admins can upload SMS images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'sms-images' AND (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
));