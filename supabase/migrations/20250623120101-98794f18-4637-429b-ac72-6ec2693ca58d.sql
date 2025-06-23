
-- Remove the foreign key constraint temporarily until auth is implemented
ALTER TABLE public.contracts_v2 DROP CONSTRAINT IF EXISTS contracts_v2_created_by_fkey;

-- Make created_by nullable for now
ALTER TABLE public.contracts_v2 ALTER COLUMN created_by DROP NOT NULL;
