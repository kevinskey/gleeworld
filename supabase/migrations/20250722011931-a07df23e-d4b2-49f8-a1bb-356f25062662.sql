-- Insert the requested calendars
INSERT INTO public.gw_calendars (name, description, color, is_visible, is_default) VALUES
('SCGC', 'Spelman College Glee Club main calendar', '#3b82f6', true, false),
('Exec Board', 'Executive Board meetings and events', '#ef4444', true, false),
('Spelman', 'Spelman College events and activities', '#8b5cf6', true, false),
('Touring', 'Tours and travel performances', '#f59e0b', true, false),
('Alumnae', 'Alumnae events and reunions', '#10b981', true, false),
('Fans', 'Fan events and community gatherings', '#ec4899', true, false),
('Other', 'Miscellaneous events', '#6b7280', true, false),
('Holidays', 'Holiday celebrations and observances', '#dc2626', true, false);