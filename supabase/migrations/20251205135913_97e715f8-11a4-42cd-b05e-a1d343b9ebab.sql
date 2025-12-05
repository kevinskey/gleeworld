-- Delete orphan Drew Roberts profile (no user_id linked)
DELETE FROM gw_profiles 
WHERE id = '8ced5395-e1ef-4141-8461-142c4f66204b' 
AND user_id IS NULL;