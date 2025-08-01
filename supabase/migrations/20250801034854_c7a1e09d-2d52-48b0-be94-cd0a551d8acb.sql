-- Temporarily disable the trigger, update the role, then re-enable
ALTER TABLE gw_profiles DISABLE TRIGGER ALL;
UPDATE gw_profiles SET role = 'member' WHERE user_id = 'c9260ed4-144d-439b-be51-bd0f387b5ae6';
ALTER TABLE gw_profiles ENABLE TRIGGER ALL;

-- Also update profiles table directly  
ALTER TABLE profiles DISABLE TRIGGER ALL;
UPDATE profiles SET role = 'member' WHERE id = 'c9260ed4-144d-439b-be51-bd0f387b5ae6';
ALTER TABLE profiles ENABLE TRIGGER ALL;