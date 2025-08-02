-- Add more sample meeting minutes data
INSERT INTO gw_meeting_minutes (
  title,
  meeting_date,
  meeting_type,
  attendees,
  agenda_items,
  discussion_points,
  action_items,
  status,
  created_by
) VALUES 
(
  'Executive Board Meeting - March 2024',
  '2024-03-15 14:00:00+00',
  'executive_board',
  ARRAY['President', 'Vice President', 'Secretary', 'Treasurer', 'Tour Manager', 'Chaplain'],
  ARRAY['Opening Prayer', 'Review of Previous Minutes', 'Treasurer Report', 'Tour Planning Update', 'Spring Concert Preparation', 'New Business'],
  'Meeting focused on spring concert preparation and upcoming tour logistics. Discussed budget allocations and performance venues. Reviewed member attendance and academic standing requirements.',
  ARRAY['Secretary to finalize spring concert program by March 20', 'Treasurer to submit budget report by March 18', 'Tour Manager to confirm hotel bookings by March 22', 'All members to submit bio updates for program'],
  'approved',
  (SELECT user_id FROM gw_profiles WHERE role = 'super-admin' LIMIT 1)
),
(
  'General Assembly - March 2024',
  '2024-03-12 19:00:00+00',
  'general_assembly',
  ARRAY['All Active Members'],
  ARRAY['Call to Order', 'Announcements', 'Spring Concert Details', 'Tour Information', 'Academic Requirements Reminder', 'Q&A Session'],
  'General assembly meeting with all members to discuss spring concert logistics and tour expectations. Emphasized importance of academic standing and attendance requirements.',
  ARRAY['All members to submit headshots by March 16', 'Section leaders to coordinate sectionals', 'Members to confirm tour participation by March 19'],
  'approved',
  (SELECT user_id FROM gw_profiles WHERE role = 'super-admin' LIMIT 1)
),
(
  'Emergency Executive Board Meeting - February 2024',
  '2024-02-28 16:00:00+00',
  'executive_board',
  ARRAY['President', 'Vice President', 'Secretary', 'Treasurer', 'Tour Manager'],
  ARRAY['Urgent Venue Change', 'Budget Reallocation', 'Member Communication Strategy'],
  'Emergency meeting called to address venue change for spring concert. Discussed budget implications and communication plan for members.',
  ARRAY['Secretary to email all members about venue change', 'Treasurer to adjust budget for new venue costs', 'President to meet with venue coordinator'],
  'approved',
  (SELECT user_id FROM gw_profiles WHERE role = 'super-admin' LIMIT 1)
),
(
  'Planning Committee Meeting - February 2024',
  '2024-02-20 15:30:00+00',
  'committee',
  ARRAY['Secretary', 'Chaplain', 'Social Chair', 'PR Coordinator'],
  ARRAY['Event Planning Timeline', 'Member Engagement Activities', 'Social Media Strategy', 'Spiritual Development Programming'],
  'Committee meeting to plan member engagement activities and coordinate between different committees for better collaboration.',
  ARRAY['Social Chair to plan member bonding activity', 'PR Coordinator to create social media calendar', 'Chaplain to schedule spiritual development sessions'],
  'approved',
  (SELECT user_id FROM gw_profiles WHERE role = 'super-admin' LIMIT 1)
);