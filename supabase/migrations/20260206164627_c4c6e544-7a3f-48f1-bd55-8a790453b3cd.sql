
-- 1. Add SMS action token to gw_appointments for approve/deny via SMS links
ALTER TABLE public.gw_appointments 
ADD COLUMN IF NOT EXISTS sms_action_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS sms_notified_at TIMESTAMPTZ;

-- Create index for quick token lookups
CREATE INDEX IF NOT EXISTS idx_gw_appointments_sms_token ON public.gw_appointments(sms_action_token) WHERE sms_action_token IS NOT NULL;

-- 2. Insert "Office Hours" calendar entry (toggleable, only for admin visibility)
INSERT INTO public.gw_calendars (id, name, description, color, is_visible, is_default, created_by)
VALUES (
  'a0000000-0000-0000-0000-000000000200',
  'Office Hours',
  'Dr. Johnson office hours appointments - visible to admin and chief of staff only',
  '#06b6d4',
  false,
  false,
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert "Office Hours" badge into academy_course_badges
INSERT INTO public.academy_course_badges (
  id, course_code, course_title, badge_image_url, link_url, display_order, is_active
)
VALUES (
  gen_random_uuid(),
  'OFFICE HRS',
  'Book Office Hours',
  '',
  '/book-appointment',
  99,
  true
)
ON CONFLICT DO NOTHING;
