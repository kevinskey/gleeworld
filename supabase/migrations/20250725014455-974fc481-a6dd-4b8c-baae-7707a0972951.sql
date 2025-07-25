-- Add attendance tracking configuration to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS attendance_required boolean DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS attendance_type text DEFAULT 'optional' CHECK (attendance_type IN ('none', 'optional', 'required', 'rehearsal'));
ALTER TABLE events ADD COLUMN IF NOT EXISTS attendance_notes text;

ALTER TABLE gw_events ADD COLUMN IF NOT EXISTS attendance_required boolean DEFAULT false;
ALTER TABLE gw_events ADD COLUMN IF NOT EXISTS attendance_type text DEFAULT 'optional' CHECK (attendance_type IN ('none', 'optional', 'required', 'rehearsal'));
ALTER TABLE gw_events ADD COLUMN IF NOT EXISTS attendance_notes text;

-- Enhance event_participants table to support class lists
ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS role text DEFAULT 'participant';
ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS required_attendance boolean DEFAULT false;
ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS voice_part text;
ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS section text;
ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS notes text;

-- Create event class lists table for more structured participant management
CREATE TABLE IF NOT EXISTS event_class_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  attendance_required boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create event class list members junction table
CREATE TABLE IF NOT EXISTS event_class_list_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_list_id uuid NOT NULL REFERENCES event_class_lists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  voice_part text,
  section text,
  required_attendance boolean DEFAULT true,
  notes text,
  added_by uuid REFERENCES profiles(id),
  added_at timestamp with time zone DEFAULT now(),
  UNIQUE(class_list_id, user_id)
);

-- Enable RLS on new tables
ALTER TABLE event_class_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_class_list_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_class_lists
CREATE POLICY "Event creators can manage class lists" 
ON event_class_lists 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = event_class_lists.event_id 
    AND events.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can manage all class lists" 
ON event_class_lists 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Users can view class lists they're part of" 
ON event_class_lists 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM event_class_list_members 
    WHERE event_class_list_members.class_list_id = event_class_lists.id 
    AND event_class_list_members.user_id = auth.uid()
  )
);

-- RLS policies for event_class_list_members
CREATE POLICY "Event creators can manage class list members" 
ON event_class_list_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM event_class_lists ecl
    JOIN events e ON e.id = ecl.event_id
    WHERE ecl.id = event_class_list_members.class_list_id 
    AND e.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can manage all class list members" 
ON event_class_list_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Users can view their own class list memberships" 
ON event_class_list_members 
FOR SELECT 
USING (user_id = auth.uid());

-- Create updated_at trigger for new tables
CREATE OR REPLACE FUNCTION update_updated_at_event_class_lists()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_class_lists_updated_at
  BEFORE UPDATE ON event_class_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_event_class_lists();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_class_lists_event_id ON event_class_lists(event_id);
CREATE INDEX IF NOT EXISTS idx_event_class_list_members_class_list_id ON event_class_list_members(class_list_id);
CREATE INDEX IF NOT EXISTS idx_event_class_list_members_user_id ON event_class_list_members(user_id);
CREATE INDEX IF NOT EXISTS idx_events_attendance_required ON events(attendance_required);
CREATE INDEX IF NOT EXISTS idx_events_attendance_type ON events(attendance_type);