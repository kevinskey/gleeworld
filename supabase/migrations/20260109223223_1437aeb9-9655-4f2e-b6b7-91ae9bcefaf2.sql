-- Create handbook_appendices table for versioned, editable handbook appendix content
CREATE TABLE public.handbook_appendices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  markdown_content TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  is_published BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(course_id, slug, version)
);

-- Create indexes for faster lookups
CREATE INDEX idx_handbook_appendices_course_slug ON public.handbook_appendices(course_id, slug);
CREATE INDEX idx_handbook_appendices_published ON public.handbook_appendices(course_id, slug, is_published);

-- Enable RLS
ALTER TABLE public.handbook_appendices ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read published appendices
CREATE POLICY "Anyone can read published handbook appendices"
ON public.handbook_appendices
FOR SELECT
USING (is_published = true);

-- Policy: Admins and directors can read all appendices (including drafts)
CREATE POLICY "Admins can read all handbook appendices"
ON public.handbook_appendices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role = 'director')
  )
);

-- Policy: Only admins/directors can insert
CREATE POLICY "Admins can insert handbook appendices"
ON public.handbook_appendices
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role = 'director')
  )
);

-- Policy: Only admins/directors can update
CREATE POLICY "Admins can update handbook appendices"
ON public.handbook_appendices
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role = 'director')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_handbook_appendices_updated_at
BEFORE UPDATE ON public.handbook_appendices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the initial Appendix D content
INSERT INTO public.handbook_appendices (course_id, slug, title, markdown_content, version, is_published)
VALUES (
  'MUS070',
  'appendix-d-shadowing',
  'Appendix D — Executive Board Shadowing & Leadership Pipeline',
  '# Appendix D — Executive Board Shadowing & Leadership Pipeline

Spelman College Glee Club — MUS 070

## Purpose

The Executive Board Shadowing Program ensures continuity, professionalism, and institutional stability in the leadership of the Spelman College Glee Club. Leadership is earned through service, training, and evaluation.

## Who May Participate

Any active member of the Glee Club in good standing may apply to shadow an Executive Board position during the Spring semester for the following academic year.

## What Shadowing Is

Shadowing is a working apprenticeship. A shadow assists the current officer, completes assigned tasks, and is evaluated on professionalism, reliability, and competence. Shadowing does not guarantee election or appointment.

## Structure

Each Executive Board position has:

- An Officer of Record
- One or more Shadows
- Defined responsibilities, tasks, and evaluation criteria

## Application

Students apply during the Spring semester by selecting a primary and alternate position, submitting a statement of intent, confirming availability, and agreeing to professional conduct standards. Final approval rests with the Director.

## Evaluation

Shadows are evaluated by their assigned officer using a standardized rubric measuring reliability, professionalism, skill, leadership, and growth.

## Certification

Only students who:

- Complete all required tasks,
- Receive a satisfactory evaluation,
- And are approved by the Director

may be certified to run for the corresponding Executive Board position.

## Elections

Only certified candidates may appear on election ballots. This protects the integrity and continuity of the Spelman College Glee Club.',
  1,
  true
);