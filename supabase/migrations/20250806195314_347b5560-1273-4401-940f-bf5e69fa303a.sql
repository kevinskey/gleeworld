-- Add new executive board functions that don't exist yet
INSERT INTO public.gw_app_functions (name, description, category, module, is_active) VALUES
-- Tours & Logistics
('booking_management', 'Handle performance bookings', 'tours', 'booking-forms', true),
('venue_coordination', 'Coordinate with venues', 'tours', 'tour-management', true),

-- Financial Management
('budget_oversight', 'Oversee budgets and financial planning', 'financial', 'budgets', true),
('expense_approval', 'Approve expenses and reimbursements', 'financial', 'approval-system', true),
('dues_collection', 'Manage member dues collection', 'financial', 'dues-collection', true),
('financial_reporting', 'Generate financial reports', 'financial', 'glee-ledger', true),

-- Communications
('internal_communications', 'Manage internal club communications', 'communications', 'email-management', true),
('external_pr', 'Handle public relations and media', 'communications', 'pr-coordinator', true),
('notification_management', 'Manage system notifications', 'communications', 'notifications', true),
('social_media', 'Manage social media presence', 'communications', 'pr-coordinator', true),

-- Member Management
('attendance_tracking', 'Track member attendance', 'member_management', 'attendance-management', true),
('member_oversight', 'Oversee general membership', 'member_management', 'user-management', true),
('audition_coordination', 'Coordinate audition processes', 'member_management', 'auditions', true),
('section_leadership', 'Lead voice sections', 'musical', 'section-leader', true),

-- Musical Leadership
('musical_direction', 'Provide musical leadership', 'musical', 'student-conductor', true),
('sight_singing_coord', 'Coordinate sight singing training', 'musical', 'sight-singing-management', true),
('sheet_music_management', 'Manage sheet music library', 'musical', 'sight-reading-preview', true),

-- Administrative
('wardrobe_management', 'Manage performance wardrobes', 'administrative', 'wardrobe', true),
('data_analytics', 'Analyze club data and metrics', 'administrative', 'admin', true),
('scheduling_coordination', 'Coordinate rehearsal scheduling', 'administrative', 'scheduling-module', true)
ON CONFLICT (name) DO NOTHING;

-- Now assign permissions to Onnesty as tour_manager
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'tour_manager', id, true, true 
FROM public.gw_app_functions 
WHERE name IN ('booking_management', 'venue_coordination', 'event_create', 'event_edit', 'event_view', 'dashboard_access', 'member_dashboard')
ON CONFLICT (position, function_id) DO NOTHING;