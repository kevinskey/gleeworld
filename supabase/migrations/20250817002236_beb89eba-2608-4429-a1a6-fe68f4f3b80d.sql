-- Add Setup Crew Manager module to gw_modules table
INSERT INTO gw_modules (key, name, category, is_active, default_permissions, description)
VALUES (
  'setup-crew-manager', 
  'Setup Crew Manager', 
  'Executive Board', 
  true, 
  ARRAY['view', 'manage'], 
  'Manage setup crews and assign first-year members to event crews'
);

-- Add permissions for the set_up_crew_manager executive position
INSERT INTO gw_exec_module_grants (exec_position, module_key, can_view, can_manage)
VALUES ('set_up_crew_manager', 'setup-crew-manager', true, true);

-- Also grant view access to admins
INSERT INTO gw_role_module_grants (role, module_key, can_view, can_manage)
VALUES ('admin', 'setup-crew-manager', true, true);