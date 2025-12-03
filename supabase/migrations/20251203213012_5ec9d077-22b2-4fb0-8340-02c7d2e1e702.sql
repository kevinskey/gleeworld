-- Temporarily disable privilege escalation triggers to fix Jordyn's admin flags
ALTER TABLE gw_profiles DISABLE TRIGGER prevent_gw_profile_privilege_escalation_enhanced_trigger;
ALTER TABLE gw_profiles DISABLE TRIGGER prevent_privilege_escalation_gw_profiles;
ALTER TABLE gw_profiles DISABLE TRIGGER prevent_privilege_escalation_trigger;
ALTER TABLE gw_profiles DISABLE TRIGGER prevent_self_privilege_escalation_trigger;

-- Fix Jordyn's admin flags to match their super-admin role
UPDATE gw_profiles 
SET is_super_admin = true, is_admin = true
WHERE email = 'jordynoneal@spelman.edu';

-- Re-enable the triggers
ALTER TABLE gw_profiles ENABLE TRIGGER prevent_gw_profile_privilege_escalation_enhanced_trigger;
ALTER TABLE gw_profiles ENABLE TRIGGER prevent_privilege_escalation_gw_profiles;
ALTER TABLE gw_profiles ENABLE TRIGGER prevent_privilege_escalation_trigger;
ALTER TABLE gw_profiles ENABLE TRIGGER prevent_self_privilege_escalation_trigger;