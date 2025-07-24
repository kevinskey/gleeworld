-- Create enums for vocal health tracking
CREATE TYPE vocal_status_enum AS ENUM ('Healthy', 'Fatigued', 'Sore', 'Injured');
CREATE TYPE hydration_level_enum AS ENUM ('Low', 'Normal', 'High');
CREATE TYPE feedback_category_enum AS ENUM ('Vocal Blend', 'Rhythmic Precision', 'Diction', 'Posture', 'Energy');
CREATE TYPE review_type_enum AS ENUM ('Self Assessment', 'Section Leader Review', 'Admin Review', 'Peer Review');

-- Table for vocal health tracking
CREATE TABLE public.gw_vocal_health_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  vocal_status vocal_status_enum NOT NULL,
  hydration_level hydration_level_enum NOT NULL,
  hours_slept INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Table for uniform and gear tracking
CREATE TABLE public.gw_uniform_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item TEXT NOT NULL,
  size TEXT,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  return_due DATE,
  returned BOOLEAN NOT NULL DEFAULT false,
  condition_notes TEXT,
  assigned_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for rehearsal feedback
CREATE TABLE public.gw_rehearsal_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID,
  user_id UUID NOT NULL,
  reviewer_id UUID NOT NULL,
  category feedback_category_enum NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for performance reviews
CREATE TABLE public.gw_performance_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  music_id UUID,
  user_id UUID NOT NULL,
  reviewer_id UUID NOT NULL,
  review_type review_type_enum NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  rehearsal_date DATE,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.gw_vocal_health_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_uniform_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_rehearsal_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_performance_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vocal health entries (private to user and admins)
CREATE POLICY "Users can view their own vocal health entries"
ON public.gw_vocal_health_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vocal health entries"
ON public.gw_vocal_health_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vocal health entries"
ON public.gw_vocal_health_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all vocal health entries"
ON public.gw_vocal_health_entries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- RLS Policies for uniform assignments
CREATE POLICY "Users can view their own uniform assignments"
ON public.gw_uniform_assignments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all uniform assignments"
ON public.gw_uniform_assignments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- RLS Policies for rehearsal feedback
CREATE POLICY "Users can view feedback about themselves"
ON public.gw_rehearsal_feedback FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create feedback"
ON public.gw_rehearsal_feedback FOR INSERT
WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Admins and section leaders can view all feedback"
ON public.gw_rehearsal_feedback FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role IN ('section_leader', 'executive'))
  )
);

CREATE POLICY "Admins and section leaders can create feedback for anyone"
ON public.gw_rehearsal_feedback FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role IN ('section_leader', 'executive'))
  )
);

-- RLS Policies for performance reviews
CREATE POLICY "Users can view reviews about themselves"
ON public.gw_performance_reviews FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create self-assessments"
ON public.gw_performance_reviews FOR INSERT
WITH CHECK (auth.uid() = reviewer_id AND auth.uid() = user_id AND review_type = 'Self Assessment');

CREATE POLICY "Admins and section leaders can view all reviews"
ON public.gw_performance_reviews FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role IN ('section_leader', 'executive'))
  )
);

CREATE POLICY "Admins and section leaders can create reviews for anyone"
ON public.gw_performance_reviews FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role IN ('section_leader', 'executive'))
  )
);

-- Create indexes for performance
CREATE INDEX idx_vocal_health_user_date ON public.gw_vocal_health_entries(user_id, date DESC);
CREATE INDEX idx_uniform_assignments_user ON public.gw_uniform_assignments(user_id);
CREATE INDEX idx_uniform_assignments_returned ON public.gw_uniform_assignments(returned, return_due);
CREATE INDEX idx_rehearsal_feedback_user ON public.gw_rehearsal_feedback(user_id);
CREATE INDEX idx_rehearsal_feedback_event ON public.gw_rehearsal_feedback(event_id);
CREATE INDEX idx_performance_reviews_user ON public.gw_performance_reviews(user_id);
CREATE INDEX idx_performance_reviews_music ON public.gw_performance_reviews(music_id);

-- Create triggers for updated_at
CREATE TRIGGER update_gw_vocal_health_entries_updated_at
  BEFORE UPDATE ON public.gw_vocal_health_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_gw_uniform_assignments_updated_at
  BEFORE UPDATE ON public.gw_uniform_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_gw_rehearsal_feedback_updated_at
  BEFORE UPDATE ON public.gw_rehearsal_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_gw_performance_reviews_updated_at
  BEFORE UPDATE ON public.gw_performance_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Function to check for vocal health alerts
CREATE OR REPLACE FUNCTION public.check_vocal_health_alerts(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.gw_vocal_health_entries 
    WHERE user_id = target_user_id 
    AND vocal_status = 'Fatigued'
    AND date >= CURRENT_DATE - INTERVAL '5 days'
    GROUP BY user_id
    HAVING COUNT(*) >= 3
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;