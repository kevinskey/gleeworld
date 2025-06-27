
-- Check if there are any templates at all (including inactive ones)
SELECT id, name, is_active FROM public.contract_templates ORDER BY created_at;

-- Also check what template names are mentioned in the contract content
SELECT DISTINCT title, template_id FROM public.contracts_v2 
WHERE title ILIKE '%syracuse%' OR title ILIKE '%jazz%' 
LIMIT 10;
