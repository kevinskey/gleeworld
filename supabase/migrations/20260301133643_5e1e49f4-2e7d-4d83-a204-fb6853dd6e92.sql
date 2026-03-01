
-- Table for office hours reminders configuration
CREATE TABLE public.gw_office_hours_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('upcoming_appointment', 'book_prompt')),
  hours_before INTEGER DEFAULT 24,
  sms_enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  message_template TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gw_office_hours_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reminders"
ON public.gw_office_hours_reminders
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Seed default reminder configs
INSERT INTO public.gw_office_hours_reminders (reminder_type, hours_before, sms_enabled, is_active, message_template) VALUES
('upcoming_appointment', 24, true, true, '📅 Reminder: You have an office hours appointment tomorrow at {time}. See you there!'),
('upcoming_appointment', 1, true, true, '⏰ Reminder: Your office hours appointment is in 1 hour at {time}. Please be on time!'),
('book_prompt', 0, true, false, '📚 GleeWorld: Office hours are available this week. Book your slot at {link}');
