-- Phase 1: Attendance System Database Schema (Final)

-- Add is_section_leader to gw_profiles table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'gw_profiles' 
                 AND column_name = 'is_section_leader') THEN
    ALTER TABLE gw_profiles 
    ADD COLUMN is_section_leader boolean DEFAULT false;
  END IF;
END $$;

-- Create attendance policies table
CREATE TABLE IF NOT EXISTS gw_attendance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  required_attendance_percentage numeric DEFAULT 80,
  max_unexcused_absences integer DEFAULT 3,
  policy_description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Create event attendance table
CREATE TABLE IF NOT EXISTS gw_event_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES gw_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendance_status text NOT NULL DEFAULT 'present' CHECK (attendance_status IN ('present', 'absent', 'excused', 'late', 'left_early')),
  check_in_time timestamp with time zone,
  check_out_time timestamp with time zone,
  notes text,
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create excuse requests table
CREATE TABLE IF NOT EXISTS gw_attendance_excuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id uuid NOT NULL REFERENCES gw_event_attendance(id) ON DELETE CASCADE,
  reason text NOT NULL,
  documentation_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE gw_attendance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_attendance_excuses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance policies
CREATE POLICY "Everyone can view active attendance policies" 
ON gw_attendance_policies 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage attendance policies" 
ON gw_attendance_policies 
FOR ALL 
USING (
  is_admin(auth.uid()) OR is_super_admin(auth.uid())
);

-- RLS Policies for event attendance
CREATE POLICY "Members can view their own attendance" 
ON gw_event_attendance 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid()) OR
  -- Section leaders can view their section members' attendance
  EXISTS (
    SELECT 1 FROM gw_profiles gp1, gw_profiles gp2 
    WHERE gp1.user_id = auth.uid() 
    AND gp2.user_id = gw_event_attendance.user_id
    AND gp1.is_section_leader = true
    AND gp1.voice_part = gp2.voice_part
  )
);

CREATE POLICY "Authorized users can take attendance" 
ON gw_event_attendance 
FOR INSERT 
WITH CHECK (
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid()) OR
  -- Secretary can take attendance at any event
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND exec_board_role = 'secretary'
  ) OR
  -- Section leaders can take attendance for their section members at sectionals
  (EXISTS (
    SELECT 1 FROM gw_events 
    WHERE id = gw_event_attendance.event_id 
    AND event_type = 'sectionals'
  ) AND EXISTS (
    SELECT 1 FROM gw_profiles gp1, gw_profiles gp2 
    WHERE gp1.user_id = auth.uid() 
    AND gp2.user_id = gw_event_attendance.user_id
    AND gp1.is_section_leader = true
    AND gp1.voice_part = gp2.voice_part
  ))
);

CREATE POLICY "Attendance recorders can update attendance" 
ON gw_event_attendance 
FOR UPDATE 
USING (
  recorded_by = auth.uid() OR
  is_admin(auth.uid()) OR 
  is_super_admin(auth.uid())
);

-- RLS Policies for excuse requests
CREATE POLICY "Members can manage their own excuse requests" 
ON gw_attendance_excuses 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM gw_event_attendance 
    WHERE id = gw_attendance_excuses.attendance_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can review excuse requests" 
ON gw_attendance_excuses 
FOR ALL 
USING (
  is_admin(auth.uid()) OR is_super_admin(auth.uid())
);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_attendance()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_attendance_policies_updated_at
  BEFORE UPDATE ON gw_attendance_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_attendance();

CREATE TRIGGER update_gw_event_attendance_updated_at
  BEFORE UPDATE ON gw_event_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_attendance();

-- Insert default attendance policies
INSERT INTO gw_attendance_policies (event_type, required_attendance_percentage, max_unexcused_absences, policy_description)
VALUES 
  ('rehearsal', 85, 3, 'Regular rehearsals require 85% attendance with maximum 3 unexcused absences'),
  ('performance', 100, 0, 'All performances are mandatory with no unexcused absences allowed'),
  ('sectionals', 80, 2, 'Sectionals require 80% attendance with maximum 2 unexcused absences')
ON CONFLICT DO NOTHING;