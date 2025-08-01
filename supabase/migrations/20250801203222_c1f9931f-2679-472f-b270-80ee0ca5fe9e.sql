-- Create SMS notifications table
CREATE TABLE public.gw_sms_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'pending')),
  direction TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  sender_name TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category TEXT DEFAULT 'general',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_sms_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for SMS notifications
CREATE POLICY "Users can view their own SMS notifications" ON public.gw_sms_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all SMS notifications" ON public.gw_sms_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Executive board members can view SMS notifications" ON public.gw_sms_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_executive_board_members 
      WHERE user_id = auth.uid() AND is_active = true
    ) OR
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_gw_sms_notifications_updated_at
  BEFORE UPDATE ON public.gw_sms_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert sample SMS notifications
INSERT INTO public.gw_sms_notifications (user_id, phone_number, message, direction, sender_name, priority, category, is_read) VALUES
  (auth.uid(), '+14045551234', 'Reminder: Rehearsal today at 7 PM in the chapel. Please arrive 15 minutes early for warm-ups.', 'inbound', 'Glee Club Director', 'high', 'Rehearsal', false),
  (auth.uid(), '+14045551234', 'URGENT: Concert dress fitting moved to tomorrow 3-5 PM. Please confirm attendance.', 'inbound', 'Wardrobe Manager', 'urgent', 'Wardrobe', false),
  (auth.uid(), '+14045551234', 'Your dues payment of $50 is now overdue. Please submit payment by Friday to avoid late fees.', 'inbound', 'Treasurer', 'high', 'Financial', false),
  (auth.uid(), '+14045551234', 'Don''t forget to return your music folder #127 to the library after today''s rehearsal.', 'inbound', 'Librarian', 'normal', 'Equipment', true),
  (auth.uid(), '+14045551234', 'Great job at last night''s performance! Photos will be available on the website soon.', 'inbound', 'PR Coordinator', 'normal', 'General', true),
  (auth.uid(), '+14045551234', 'Tour bus will depart at 6 AM sharp on Saturday. Please arrive by 5:45 AM with all luggage.', 'inbound', 'Tour Manager', 'high', 'Tour', false),
  (auth.uid(), '+14045551234', 'Spiritual reflection meeting this Sunday at 2 PM. Topic: Finding harmony in challenging times.', 'inbound', 'Chaplain', 'normal', 'Spiritual', false);

-- Create general notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.gw_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category TEXT DEFAULT 'general',
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications if not already enabled
ALTER TABLE public.gw_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for general notifications
CREATE POLICY "Users can view their own notifications" ON public.gw_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications" ON public.gw_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "System can create notifications" ON public.gw_notifications
  FOR INSERT WITH CHECK (true);

-- Create trigger for updated_at on notifications
CREATE TRIGGER update_gw_notifications_updated_at
  BEFORE UPDATE ON public.gw_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert sample general notifications
INSERT INTO public.gw_notifications (user_id, title, message, notification_type, priority, category, is_read) VALUES
  (auth.uid(), 'Welcome to Glee Club!', 'Welcome to the Spelman College Glee Club family! Check out your member resources and upcoming events.', 'welcome', 'normal', 'General', false),
  (auth.uid(), 'New Music Added', 'New spiritual arrangements have been added to the music library. Access them in the Music tab.', 'music', 'normal', 'Music', false),
  (auth.uid(), 'Concert Performance', 'Congratulations on last week''s outstanding performance at the Atlanta Symphony Hall!', 'achievement', 'normal', 'Performance', true),
  (auth.uid(), 'Attendance Reminder', 'Please remember to check in for rehearsals using the QR code system.', 'attendance', 'normal', 'Attendance', false),
  (auth.uid(), 'Emergency Contact Update', 'Please update your emergency contact information in your profile settings.', 'urgent', 'high', 'Safety', false);