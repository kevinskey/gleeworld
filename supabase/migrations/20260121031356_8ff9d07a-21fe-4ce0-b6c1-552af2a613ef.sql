-- =============================================
-- 1. CREATE gw_course_discussions TABLE
-- =============================================
CREATE TABLE public.gw_course_discussions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  module_id UUID NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL,
  parent_id UUID NULL REFERENCES public.gw_course_discussions(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT false,
  is_announcement BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gw_course_discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled students can view discussions"
ON public.gw_course_discussions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM gw_course_enrollments 
    WHERE course_id = gw_course_discussions.course_id 
    AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super-admin', 'instructor')
  )
);

CREATE POLICY "Enrolled students can create discussions"
ON public.gw_course_discussions FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1 FROM gw_course_enrollments 
    WHERE course_id = gw_course_discussions.course_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Authors can update own discussions"
ON public.gw_course_discussions FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Admins can manage all discussions"
ON public.gw_course_discussions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super-admin', 'instructor')
  )
);

CREATE INDEX idx_gw_course_discussions_course ON public.gw_course_discussions(course_id);
CREATE INDEX idx_gw_course_discussions_parent ON public.gw_course_discussions(parent_id);

-- =============================================
-- 2. CREATE gw_course_modules TABLE (Universal)
-- =============================================
CREATE TABLE public.gw_course_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  week_number INTEGER,
  is_active BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,
  unlock_date TIMESTAMP WITH TIME ZONE,
  display_order INTEGER DEFAULT 0,
  semester TEXT DEFAULT 'Spring 2025',
  learning_objectives JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, module_id)
);

ALTER TABLE public.gw_course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active modules"
ON public.gw_course_modules FOR SELECT
USING (true);

CREATE POLICY "Instructors can manage modules"
ON public.gw_course_modules FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super-admin', 'instructor')
  )
);

CREATE INDEX idx_gw_course_modules_course ON public.gw_course_modules(course_id);

-- =============================================
-- 3. CREATE gw_course_module_resources TABLE
-- =============================================
CREATE TABLE public.gw_course_module_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.gw_course_modules(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL,
  resource_url TEXT,
  media_id UUID REFERENCES public.gw_media_library(id),
  display_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gw_course_module_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view module resources"
ON public.gw_course_module_resources FOR SELECT
USING (true);

CREATE POLICY "Instructors can manage resources"
ON public.gw_course_module_resources FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super-admin', 'instructor')
  )
);

CREATE INDEX idx_gw_module_resources_module ON public.gw_course_module_resources(module_id);
CREATE INDEX idx_gw_module_resources_course ON public.gw_course_module_resources(course_id);

-- =============================================
-- 4. MIGRATE MUS 240 DATA TO NEW TABLES
-- =============================================
INSERT INTO public.gw_course_modules (course_id, module_id, title, is_active, is_locked, semester, week_number, display_order)
SELECT 
  '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'::uuid as course_id,
  module_id,
  CASE 
    WHEN module_id = 'week-1' THEN 'Week 1: Introduction to Music Theory'
    WHEN module_id = 'week-2' THEN 'Week 2: Rhythm and Meter'
    WHEN module_id = 'week-3' THEN 'Week 3: Scales and Keys'
    WHEN module_id = 'week-4' THEN 'Week 4: Intervals'
    WHEN module_id = 'week-5' THEN 'Week 5: Triads and Chords'
    WHEN module_id = 'week-6' THEN 'Week 6: Chord Progressions'
    WHEN module_id = 'week-7' THEN 'Week 7: Voice Leading'
    WHEN module_id = 'week-8' THEN 'Week 8: Midterm Review'
    ELSE 'Module ' || module_id
  END as title,
  is_active,
  is_locked,
  semester,
  CASE 
    WHEN module_id ~ '^week-[0-9]+$' THEN CAST(SUBSTRING(module_id FROM 'week-([0-9]+)') AS INTEGER)
    ELSE 0
  END as week_number,
  CASE 
    WHEN module_id ~ '^week-[0-9]+$' THEN CAST(SUBSTRING(module_id FROM 'week-([0-9]+)') AS INTEGER)
    ELSE 99
  END as display_order
FROM public.mus240_module_settings
ON CONFLICT (course_id, module_id) DO NOTHING;

-- =============================================
-- 5. GRANT MUSIC LIBRARY ACCESS TO ALL MEMBERS
-- =============================================
DROP POLICY IF EXISTS "Members can view music pieces" ON public.gw_sheet_music;
DROP POLICY IF EXISTS "Public scores are viewable by everyone" ON public.gw_sheet_music;
DROP POLICY IF EXISTS "Authenticated users can view public scores" ON public.gw_sheet_music;

CREATE POLICY "All authenticated users can view sheet music"
ON public.gw_sheet_music FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    is_public = true
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_course_infrastructure_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_course_modules_updated_at
BEFORE UPDATE ON public.gw_course_modules
FOR EACH ROW
EXECUTE FUNCTION public.update_course_infrastructure_updated_at();

CREATE TRIGGER update_gw_course_discussions_updated_at
BEFORE UPDATE ON public.gw_course_discussions
FOR EACH ROW
EXECUTE FUNCTION public.update_course_infrastructure_updated_at();

CREATE TRIGGER update_gw_course_module_resources_updated_at
BEFORE UPDATE ON public.gw_course_module_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_course_infrastructure_updated_at();