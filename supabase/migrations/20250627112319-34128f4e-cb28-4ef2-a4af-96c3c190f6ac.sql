
-- First, let's see what contract templates we have available
SELECT id, name FROM public.contract_templates WHERE is_active = true;

-- Then, let's see which template might be the Syracuse International Jazz Festival template
SELECT id, name FROM public.contract_templates 
WHERE name ILIKE '%syracuse%' OR name ILIKE '%jazz%' OR name ILIKE '%festival%';
