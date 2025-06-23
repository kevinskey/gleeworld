
-- Make created_by column nullable in contract_templates table
ALTER TABLE public.contract_templates ALTER COLUMN created_by DROP NOT NULL;
