-- Insert wardrobe fitting appointment type
INSERT INTO gw_appointment_types (name, description, default_duration_minutes, color, is_active) 
VALUES ('Wardrobe Fitting', 'Individual wardrobe fitting appointment for costumes and formal wear', 20, '#F59E0B', true)
ON CONFLICT (name) DO UPDATE SET 
  description = EXCLUDED.description,
  default_duration_minutes = EXCLUDED.default_duration_minutes,
  color = EXCLUDED.color,
  is_active = EXCLUDED.is_active;