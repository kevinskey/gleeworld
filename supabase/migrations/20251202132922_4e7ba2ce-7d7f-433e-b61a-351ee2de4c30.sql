INSERT INTO gw_modules (key, name, description, category, is_active, default_permissions)
VALUES (
  'concert-ticket-requests',
  'Concert Tickets',
  'Manage concert ticket requests and reservations',
  'communications',
  true,
  '["view"]'::jsonb
);