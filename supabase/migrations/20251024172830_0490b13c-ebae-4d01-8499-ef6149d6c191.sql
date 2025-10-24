-- Add slide approval tracking table
CREATE TABLE IF NOT EXISTS public.slide_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  presentation_id UUID NOT NULL REFERENCES public.group_updates_mus240(id) ON DELETE CASCADE,
  slide_index INTEGER NOT NULL,
  slide_title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'needs_revision')),
  reviewer_comment TEXT,
  reviewer_id UUID REFERENCES auth.users(id),
  reviewer_name TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(presentation_id, slide_index)
);

-- Enable RLS
ALTER TABLE public.slide_approvals ENABLE ROW LEVEL SECURITY;

-- Policies for slide approvals
CREATE POLICY "Anyone can view slide approvals"
  ON public.slide_approvals
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users with admin rights can manage approvals"
  ON public.slide_approvals
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Trigger for updating timestamps
CREATE TRIGGER update_slide_approvals_updated_at
  BEFORE UPDATE ON public.slide_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();