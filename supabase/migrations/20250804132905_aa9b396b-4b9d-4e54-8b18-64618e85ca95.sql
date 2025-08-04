-- Create audition sessions table to organize auditions by term/semester
CREATE TABLE public.audition_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  application_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  audition_dates TEXT[], -- Array of date strings for multiple audition days
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_applicants INTEGER,
  requirements TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audition applications table
CREATE TABLE public.audition_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.audition_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal Information
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  date_of_birth DATE,
  profile_image_url TEXT,
  
  -- Academic Information
  student_id TEXT,
  academic_year TEXT CHECK (academic_year IN ('freshman', 'sophomore', 'junior', 'senior', 'graduate')),
  major TEXT,
  minor TEXT,
  gpa DECIMAL(3,2),
  
  -- Musical Background
  previous_choir_experience TEXT,
  voice_part_preference TEXT CHECK (voice_part_preference IN ('S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2')),
  years_of_vocal_training INTEGER DEFAULT 0,
  instruments_played TEXT[],
  music_theory_background TEXT,
  
  -- Audition Material
  prepared_pieces TEXT,
  sight_reading_level TEXT CHECK (sight_reading_level IN ('beginner', 'intermediate', 'advanced')),
  
  -- Essays/Questions
  why_glee_club TEXT,
  vocal_goals TEXT,
  availability_conflicts TEXT,
  
  -- Administrative
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'waitlisted')),
  application_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  audition_time_slot TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(session_id, user_id)
);

-- Create audition evaluations table
CREATE TABLE public.audition_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.audition_applications(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Vocal Assessment (1-10 scale)
  tone_quality INTEGER CHECK (tone_quality BETWEEN 1 AND 10),
  intonation INTEGER CHECK (intonation BETWEEN 1 AND 10),
  sight_reading INTEGER CHECK (sight_reading BETWEEN 1 AND 10),
  rhythm INTEGER CHECK (rhythm BETWEEN 1 AND 10),
  musicality INTEGER CHECK (musicality BETWEEN 1 AND 10),
  voice_part_suitability TEXT CHECK (voice_part_suitability IN ('S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2')),
  
  -- Performance Assessment
  stage_presence INTEGER CHECK (stage_presence BETWEEN 1 AND 10),
  confidence INTEGER CHECK (confidence BETWEEN 1 AND 10),
  preparation_level INTEGER CHECK (preparation_level BETWEEN 1 AND 10),
  
  -- Overall Scores
  technical_score DECIMAL(4,2), -- Calculated average of technical skills
  artistic_score DECIMAL(4,2), -- Calculated average of artistic skills
  overall_score DECIMAL(4,2), -- Overall composite score
  
  -- Qualitative Assessment
  strengths TEXT,
  areas_for_improvement TEXT,
  evaluator_notes TEXT,
  recommendation TEXT CHECK (recommendation IN ('strong_accept', 'accept', 'conditional', 'reject')),
  
  -- Administrative
  evaluation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_final BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(application_id, evaluator_id)
);

-- Create audition analytics view for data center
CREATE VIEW public.audition_analytics AS
SELECT 
  aa.id,
  aa.session_id,
  as_session.name as session_name,
  aa.user_id,
  aa.full_name,
  aa.email,
  aa.academic_year,
  aa.major,
  aa.minor,
  aa.gpa,
  aa.voice_part_preference,
  aa.years_of_vocal_training,
  aa.previous_choir_experience,
  aa.sight_reading_level,
  aa.status,
  aa.profile_image_url,
  
  -- Evaluation averages
  AVG(ae.overall_score) as avg_overall_score,
  AVG(ae.technical_score) as avg_technical_score,
  AVG(ae.artistic_score) as avg_artistic_score,
  
  -- Count evaluations
  COUNT(ae.id) as evaluation_count,
  
  -- Most common recommendation
  MODE() WITHIN GROUP (ORDER BY ae.recommendation) as most_common_recommendation,
  
  aa.created_at as application_date,
  aa.audition_time_slot
  
FROM public.audition_applications aa
LEFT JOIN public.audition_evaluations ae ON aa.id = ae.application_id
LEFT JOIN public.audition_sessions as_session ON aa.session_id = as_session.id
GROUP BY aa.id, as_session.name, aa.user_id, aa.full_name, aa.email, aa.academic_year, 
         aa.major, aa.minor, aa.gpa, aa.voice_part_preference, aa.years_of_vocal_training,
         aa.previous_choir_experience, aa.sight_reading_level, aa.status, aa.profile_image_url,
         aa.created_at, aa.audition_time_slot;

-- Add trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_audition_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_audition_sessions_updated_at
  BEFORE UPDATE ON public.audition_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_audition_updated_at();

CREATE TRIGGER update_audition_applications_updated_at
  BEFORE UPDATE ON public.audition_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_audition_updated_at();

CREATE TRIGGER update_audition_evaluations_updated_at
  BEFORE UPDATE ON public.audition_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_audition_updated_at();

-- Enable RLS
ALTER TABLE public.audition_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audition_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audition_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audition_sessions
CREATE POLICY "Everyone can view active audition sessions"
ON public.audition_sessions FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage audition sessions"
ON public.audition_sessions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- RLS Policies for audition_applications
CREATE POLICY "Users can view their own applications"
ON public.audition_applications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own applications"
ON public.audition_applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications"
ON public.audition_applications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all applications"
ON public.audition_applications FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- RLS Policies for audition_evaluations
CREATE POLICY "Evaluators can view evaluations"
ON public.audition_evaluations FOR SELECT
USING (
  auth.uid() = evaluator_id OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Evaluators can create evaluations"
ON public.audition_evaluations FOR INSERT
WITH CHECK (
  auth.uid() = evaluator_id AND
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true OR role = 'executive')
  )
);

CREATE POLICY "Evaluators can update their own evaluations"
ON public.audition_evaluations FOR UPDATE
USING (
  auth.uid() = evaluator_id AND
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true OR role = 'executive')
  )
);

CREATE POLICY "Admins can manage all evaluations"
ON public.audition_evaluations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- Add "auditioner" role to existing role checks if it doesn't exist
-- This will be handled by the application logic when users apply