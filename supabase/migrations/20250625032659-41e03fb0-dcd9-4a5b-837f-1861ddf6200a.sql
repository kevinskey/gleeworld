
-- Add the missing embedded_signatures column to contract_signatures_v2 table
ALTER TABLE public.contract_signatures_v2 
ADD COLUMN IF NOT EXISTS embedded_signatures jsonb;

-- Update existing records to have empty embedded_signatures if null
UPDATE public.contract_signatures_v2 
SET embedded_signatures = '[]'::jsonb 
WHERE embedded_signatures IS NULL;
