-- Update modules to use consolidated categories

-- Move attendance to member-management  
UPDATE gw_modules SET category = 'member-management' WHERE category = 'attendance';

-- Move tours to communications
UPDATE gw_modules SET category = 'communications' WHERE category = 'tours';

-- Move libraries to musical-leadership
UPDATE gw_modules SET category = 'musical-leadership' WHERE category = 'libraries';

-- Move pr modules to communications 
UPDATE gw_modules SET category = 'communications' WHERE category = 'pr';

-- Move general to member-management
UPDATE gw_modules SET category = 'member-management' WHERE category = 'general';

-- Move administrative to system
UPDATE gw_modules SET category = 'system' WHERE category = 'administrative';

-- Fix case sensitivity - System should be lowercase
UPDATE gw_modules SET category = 'system' WHERE category = 'System';