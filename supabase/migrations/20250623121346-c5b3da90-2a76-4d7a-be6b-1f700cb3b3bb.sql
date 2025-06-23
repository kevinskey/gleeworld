
-- Add header_image_url column to contract_templates table
ALTER TABLE public.contract_templates 
ADD COLUMN header_image_url TEXT;

-- Create storage bucket for template headers
INSERT INTO storage.buckets (id, name, public) 
VALUES ('template-headers', 'template-headers', true);

-- Create policy to allow public access to template header images
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'template-headers');

-- Create policy to allow authenticated users to upload template headers
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'template-headers' AND auth.role() = 'authenticated');

-- Create policy to allow authenticated users to update template headers
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE USING (bucket_id = 'template-headers' AND auth.role() = 'authenticated');

-- Create policy to allow authenticated users to delete template headers
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE USING (bucket_id = 'template-headers' AND auth.role() = 'authenticated');
