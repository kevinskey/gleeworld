-- Add dashboard_background_url column to gw_profiles
ALTER TABLE public.gw_profiles 
ADD COLUMN IF NOT EXISTS dashboard_background_url TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN public.gw_profiles.dashboard_background_url IS 'URL to user custom dashboard background image stored in Supabase Storage';

-- Create storage bucket for dashboard backgrounds if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('dashboard-backgrounds', 'dashboard-backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for dashboard backgrounds bucket
CREATE POLICY "Users can view their own dashboard background"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'dashboard-backgrounds' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload their own dashboard background"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dashboard-backgrounds' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own dashboard background"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'dashboard-backgrounds' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own dashboard background"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'dashboard-backgrounds' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );