-- Create appointment types table for better management
CREATE TABLE IF NOT EXISTS public.gw_appointment_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_duration_minutes INTEGER NOT NULL DEFAULT 30,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user appointment preferences
CREATE TABLE IF NOT EXISTS public.gw_user_appointment_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  appointment_type_id UUID REFERENCES public.gw_appointment_types(id),
  buffer_time_minutes INTEGER DEFAULT 15,
  max_daily_appointments INTEGER DEFAULT 10,
  allow_same_day_booking BOOLEAN DEFAULT true,
  advance_booking_days INTEGER DEFAULT 30,
  google_calendar_sync BOOLEAN DEFAULT false,
  apple_calendar_sync BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointment history table
CREATE TABLE IF NOT EXISTS public.gw_appointment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES public.gw_appointments(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'created', 'approved', 'denied', 'cancelled', 'rescheduled'
  performed_by UUID,
  old_values JSONB,
  new_values JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create calendar sync table
CREATE TABLE IF NOT EXISTS public.gw_appointment_calendar_sync (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES public.gw_appointments(id) ON DELETE CASCADE,
  calendar_type TEXT NOT NULL, -- 'google', 'apple', 'outlook'
  external_event_id TEXT,
  sync_status TEXT DEFAULT 'pending', -- 'pending', 'synced', 'failed'
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add missing user_id to appointment availability if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'gw_appointment_availability' 
                 AND column_name = 'user_id') THEN
    ALTER TABLE public.gw_appointment_availability 
    ADD COLUMN user_id UUID;
  END IF;
END $$;

-- Insert default appointment types
INSERT INTO public.gw_appointment_types (name, description, default_duration_minutes, color) VALUES
('Audition', 'Glee Club audition appointment', 5, '#8B5CF6'),
('Consultation', 'General consultation meeting', 30, '#10B981'),
('Rehearsal Planning', 'Planning session for rehearsals', 45, '#F59E0B'),
('Administrative', 'Administrative meeting', 15, '#EF4444'),
('Coaching', 'Individual vocal coaching', 60, '#3B82F6')
ON CONFLICT DO NOTHING;

-- Enable RLS on all new tables
ALTER TABLE public.gw_appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_user_appointment_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_appointment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_appointment_calendar_sync ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointment types
CREATE POLICY "Everyone can view appointment types" ON public.gw_appointment_types
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage appointment types" ON public.gw_appointment_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- RLS Policies for user preferences
CREATE POLICY "Users can manage their own preferences" ON public.gw_user_appointment_preferences
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all preferences" ON public.gw_user_appointment_preferences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- RLS Policies for appointment history
CREATE POLICY "Users can view history of their appointments" ON public.gw_appointment_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_appointments 
      WHERE id = appointment_id 
      AND (created_by = auth.uid() OR assigned_to = auth.uid())
    )
  );

CREATE POLICY "Admins can view all appointment history" ON public.gw_appointment_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "System can insert appointment history" ON public.gw_appointment_history
  FOR INSERT WITH CHECK (true);

-- RLS Policies for calendar sync
CREATE POLICY "Users can view sync status of their appointments" ON public.gw_appointment_calendar_sync
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_appointments 
      WHERE id = appointment_id 
      AND (created_by = auth.uid() OR assigned_to = auth.uid())
    )
  );

CREATE POLICY "System can manage calendar sync" ON public.gw_appointment_calendar_sync
  FOR ALL USING (true);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_appointment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_appointment_types_updated_at
  BEFORE UPDATE ON public.gw_appointment_types
  FOR EACH ROW EXECUTE FUNCTION public.update_appointment_updated_at();

CREATE TRIGGER update_gw_user_appointment_preferences_updated_at
  BEFORE UPDATE ON public.gw_user_appointment_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_appointment_updated_at();

CREATE TRIGGER update_gw_appointment_calendar_sync_updated_at
  BEFORE UPDATE ON public.gw_appointment_calendar_sync
  FOR EACH ROW EXECUTE FUNCTION public.update_appointment_updated_at();

-- Function to log appointment history
CREATE OR REPLACE FUNCTION public.log_appointment_action(
  p_appointment_id UUID,
  p_action_type TEXT,
  p_performed_by UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  history_id UUID;
BEGIN
  INSERT INTO public.gw_appointment_history (
    appointment_id, action_type, performed_by, old_values, new_values, notes
  ) VALUES (
    p_appointment_id, p_action_type, COALESCE(p_performed_by, auth.uid()), 
    p_old_values, p_new_values, p_notes
  ) RETURNING id INTO history_id;
  
  RETURN history_id;
END;
$$;