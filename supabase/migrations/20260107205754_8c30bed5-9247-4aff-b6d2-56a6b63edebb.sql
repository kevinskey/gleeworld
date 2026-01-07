-- Add course_id column to gw_attendance_qr_codes for direct course linkage
ALTER TABLE public.gw_attendance_qr_codes 
ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.gw_courses(id) ON DELETE SET NULL;

-- Create index for faster course-based queries
CREATE INDEX IF NOT EXISTS idx_qr_codes_course_id ON public.gw_attendance_qr_codes(course_id);

-- Add course_id to gw_course_calendar for course-specific events
-- (already has course_id, so just verify the foreign key)

-- Create a table for course class sessions with QR integration
CREATE TABLE IF NOT EXISTS public.gw_course_class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.gw_courses(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(255),
  session_type VARCHAR(50) DEFAULT 'class', -- class, lab, workshop, rehearsal
  image_url TEXT,
  qr_code_id UUID REFERENCES public.gw_attendance_qr_codes(id) ON DELETE SET NULL,
  attendance_required BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_course_class_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view class sessions"
ON public.gw_course_class_sessions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create class sessions"
ON public.gw_course_class_sessions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update class sessions"
ON public.gw_course_class_sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete class sessions"
ON public.gw_course_class_sessions FOR DELETE TO authenticated USING (true);

-- Create index for course lookup
CREATE INDEX IF NOT EXISTS idx_class_sessions_course_id ON public.gw_course_class_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_date ON public.gw_course_class_sessions(session_date);