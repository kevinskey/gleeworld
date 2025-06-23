
-- Create storage bucket for signed contracts if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('signed-contracts', 'signed-contracts', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for signed contracts bucket
DROP POLICY IF EXISTS "Allow public access to signed contracts" ON storage.objects;
CREATE POLICY "Allow public access to signed contracts" 
ON storage.objects FOR ALL 
USING (bucket_id = 'signed-contracts');
