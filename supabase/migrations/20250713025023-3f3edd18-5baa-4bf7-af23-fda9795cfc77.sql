-- Mark the 2 GW profiles without auth users for manual attention
UPDATE public.gw_profiles 
SET notes = COALESCE(notes || ' | ', '') || 'NEEDS AUTH ACCOUNT - Original Glee World user without system login'
WHERE user_id IS NULL;