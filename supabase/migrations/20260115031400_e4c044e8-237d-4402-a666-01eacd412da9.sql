-- Create attendance summary table for aggregate attendance stats (MUS 070 style)
CREATE TABLE IF NOT EXISTS gw_course_attendance_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES gw_courses(id) ON DELETE CASCADE NOT NULL,
  student_id UUID,
  student_name VARCHAR(255) NOT NULL,
  semester VARCHAR(50) DEFAULT 'FALL 2025',
  
  -- Rehearsal attendance
  excused_rehearsal_absences INTEGER DEFAULT 0,
  unexcused_rehearsal_absences INTEGER DEFAULT 0,
  tardies INTEGER DEFAULT 0,
  
  -- Performance attendance  
  excused_performance_absences INTEGER DEFAULT 0,
  unexcused_performance_absences INTEGER DEFAULT 0,
  
  -- Status flags
  is_dropped BOOLEAN DEFAULT false,
  dropped_at TIMESTAMPTZ,
  dropped_reason TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint per student name per course per semester (since we may not have UUIDs for all students yet)
  UNIQUE(course_id, student_name, semester)
);

-- Enable RLS
ALTER TABLE gw_course_attendance_summary ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage all records
CREATE POLICY "Admins can manage attendance summary"
ON gw_course_attendance_summary
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Policy: Students can view their own records (by student_id if set)
CREATE POLICY "Students can view own attendance summary"
ON gw_course_attendance_summary
FOR SELECT
USING (student_id = auth.uid());

-- Create indexes for faster lookups
CREATE INDEX idx_attendance_summary_course ON gw_course_attendance_summary(course_id);
CREATE INDEX idx_attendance_summary_student ON gw_course_attendance_summary(student_id);
CREATE INDEX idx_attendance_summary_name ON gw_course_attendance_summary(student_name);
CREATE INDEX idx_attendance_summary_semester ON gw_course_attendance_summary(semester);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_attendance_summary_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_attendance_summary_updated_at
BEFORE UPDATE ON gw_course_attendance_summary
FOR EACH ROW
EXECUTE FUNCTION update_attendance_summary_timestamp();