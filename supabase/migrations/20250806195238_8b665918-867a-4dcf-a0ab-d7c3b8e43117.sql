-- Add more executive board functions
INSERT INTO public.gw_app_functions (name, description, category, module, is_active) VALUES
-- Tours & Logistics
('tour_planning', 'Plan and coordinate tours', 'tours', 'tour-management', true),
('tour_logistics', 'Manage tour logistics and transportation', 'tours', 'tour-management', true),
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
('scheduling_coordination', 'Coordinate rehearsal scheduling', 'administrative', 'scheduling-module', true);

-- Assign default permissions to executive positions
-- President gets broad access
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'president', id, true, true 
FROM public.gw_app_functions 
WHERE category IN ('dashboard', 'users', 'events', 'tours', 'financial', 'communications', 'member_management')
ON CONFLICT (position, function_id) DO NOTHING;

-- Tour Manager gets tour-related permissions
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'tour_manager', id, true, true 
FROM public.gw_app_functions 
WHERE name IN ('tour_planning', 'tour_logistics', 'booking_management', 'venue_coordination', 'event_create', 'event_edit', 'event_view')
ON CONFLICT (position, function_id) DO NOTHING;

-- Treasurer gets financial permissions
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'treasurer', id, true, true 
FROM public.gw_app_functions 
WHERE name IN ('budget_oversight', 'expense_approval', 'dues_collection', 'financial_reporting', 'admin_dashboard')
ON CONFLICT (position, function_id) DO NOTHING;

-- Secretary gets communications and administrative permissions
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'secretary', id, true, true 
FROM public.gw_app_functions 
WHERE name IN ('internal_communications', 'notification_management', 'member_oversight', 'attendance_tracking', 'scheduling_coordination')
ON CONFLICT (position, function_id) DO NOTHING;

-- PR Coordinator gets communications permissions
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'pr_coordinator', id, true, true 
FROM public.gw_app_functions 
WHERE name IN ('external_pr', 'social_media', 'internal_communications', 'notification_management')
ON CONFLICT (position, function_id) DO NOTHING;

-- Wardrobe Manager gets wardrobe permissions
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'wardrobe_manager', id, true, true 
FROM public.gw_app_functions 
WHERE name IN ('wardrobe_management', 'member_dashboard')
ON CONFLICT (position, function_id) DO NOTHING;

-- Librarian gets musical permissions
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'librarian', id, true, true 
FROM public.gw_app_functions 
WHERE name IN ('sheet_music_management', 'musical_direction', 'sight_singing_coord', 'member_dashboard')
ON CONFLICT (position, function_id) DO NOTHING;

-- Data Analyst gets analytical permissions
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'data_analyst', id, true, true 
FROM public.gw_app_functions 
WHERE name IN ('data_analytics', 'admin_dashboard', 'member_dashboard')
ON CONFLICT (position, function_id) DO NOTHING;