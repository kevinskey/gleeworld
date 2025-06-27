
-- Add stipend_amount column to contracts_v2 table for structured numeric storage
ALTER TABLE public.contracts_v2 
ADD COLUMN stipend_amount NUMERIC;

-- Add comment to document the column purpose
COMMENT ON COLUMN public.contracts_v2.stipend_amount IS 'Structured storage for stipend amounts to improve import accuracy';
