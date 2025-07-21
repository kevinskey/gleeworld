-- Enable RLS on attendance tables
ALTER TABLE gw_event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_attendance_excuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_pre_event_excuses ENABLE ROW LEVEL SECURITY;

-- RLS policies for gw_event_attendance
-- Users can view their own attendance records
CREATE POLICY "Users can view their own attendance records" 
ON gw_event_attendance 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all attendance records
CREATE POLICY "Admins can view all attendance records" 
ON gw_event_attendance 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- Secretary/designated users can manage attendance
CREATE POLICY "Secretaries can manage attendance" 
ON gw_event_attendance 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_super_admin = true OR exec_board_role = 'secretary')
));

-- RLS policies for gw_attendance_excuses
-- Users can view their own excuse requests
CREATE POLICY "Users can view their own excuse requests" 
ON gw_attendance_excuses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM gw_event_attendance 
  WHERE gw_event_attendance.id = gw_attendance_excuses.attendance_id 
  AND gw_event_attendance.user_id = auth.uid()
));

-- Users can create excuse requests for their own attendance
CREATE POLICY "Users can create excuse requests" 
ON gw_attendance_excuses 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM gw_event_attendance 
  WHERE gw_event_attendance.id = gw_attendance_excuses.attendance_id 
  AND gw_event_attendance.user_id = auth.uid()
));

-- Admins can manage excuse requests
CREATE POLICY "Admins can manage excuse requests" 
ON gw_attendance_excuses 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- RLS policies for gw_pre_event_excuses
-- Users can view their own pre-event excuses
CREATE POLICY "Users can view their own pre-event excuses" 
ON gw_pre_event_excuses 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own pre-event excuses
CREATE POLICY "Users can create pre-event excuses" 
ON gw_pre_event_excuses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pre-event excuses
CREATE POLICY "Users can update their own pre-event excuses" 
ON gw_pre_event_excuses 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Admins can manage all pre-event excuses
CREATE POLICY "Admins can manage pre-event excuses" 
ON gw_pre_event_excuses 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));