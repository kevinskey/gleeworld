
-- Create RLS policies for contract_templates table
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all active templates
CREATE POLICY "Anyone can view active templates" 
ON public.contract_templates 
FOR SELECT 
USING (is_active = true);

-- Allow authenticated users to create templates
CREATE POLICY "Authenticated users can create templates" 
ON public.contract_templates 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update their own templates (if created_by is set)
CREATE POLICY "Users can update their own templates" 
ON public.contract_templates 
FOR UPDATE 
USING (created_by = auth.uid() OR created_by IS NULL);

-- Allow users to delete their own templates (soft delete by setting is_active = false)
CREATE POLICY "Users can delete their own templates" 
ON public.contract_templates 
FOR UPDATE 
USING (created_by = auth.uid() OR created_by IS NULL);

-- Create storage policies for template-headers bucket (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Anyone can view template headers'
    ) THEN
        CREATE POLICY "Anyone can view template headers" 
        ON storage.objects 
        FOR SELECT 
        USING (bucket_id = 'template-headers');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated users can upload template headers'
    ) THEN
        CREATE POLICY "Authenticated users can upload template headers" 
        ON storage.objects 
        FOR INSERT 
        WITH CHECK (bucket_id = 'template-headers' AND auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can update template headers'
    ) THEN
        CREATE POLICY "Users can update template headers" 
        ON storage.objects 
        FOR UPDATE 
        USING (bucket_id = 'template-headers' AND auth.role() = 'authenticated');
    END IF;
END $$;
