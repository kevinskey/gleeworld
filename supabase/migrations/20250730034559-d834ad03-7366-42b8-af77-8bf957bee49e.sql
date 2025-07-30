-- Check if pr-images bucket exists and make it public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'pr-images';

-- If bucket doesn't exist, create it as public
INSERT INTO storage.buckets (id, name, public)
VALUES ('pr-images', 'pr-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;