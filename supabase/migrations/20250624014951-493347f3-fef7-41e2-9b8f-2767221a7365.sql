
-- Add the missing contract_type column to contract_templates table
ALTER TABLE public.contract_templates 
ADD COLUMN contract_type text;

-- Set a default value for existing records (if any)
UPDATE public.contract_templates 
SET contract_type = 'other' 
WHERE contract_type IS NULL;

-- Make the column not null with a default value for future inserts
ALTER TABLE public.contract_templates 
ALTER COLUMN contract_type SET DEFAULT 'other';

-- Create the template-headers storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('template-headers', 'template-headers', true)
ON CONFLICT (id) DO NOTHING;
