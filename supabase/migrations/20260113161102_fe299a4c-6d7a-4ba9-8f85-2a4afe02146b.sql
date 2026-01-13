-- Create shadowing applications table
CREATE TABLE public.gw_shadowing_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  primary_position TEXT NOT NULL,
  alternate_position TEXT,
  statement_of_intent TEXT NOT NULL,
  availability_confirmed BOOLEAN DEFAULT false,
  conduct_agreement BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'certified')),
  evaluation_score NUMERIC(3,2),
  evaluator_notes TEXT,
  evaluated_by UUID,
  evaluated_at TIMESTAMP WITH TIME ZONE,
  academic_year TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_shadowing_applications ENABLE ROW LEVEL SECURITY;

-- Students can view their own applications
CREATE POLICY "Users can view own shadowing applications"
ON public.gw_shadowing_applications FOR SELECT
USING (auth.uid() = user_id);

-- Students can create their own applications
CREATE POLICY "Users can create own shadowing applications"
ON public.gw_shadowing_applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Students can update their own pending applications
CREATE POLICY "Users can update own pending applications"
ON public.gw_shadowing_applications FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- Admins and exec board can view all applications
CREATE POLICY "Admins can view all shadowing applications"
ON public.gw_shadowing_applications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  )
);

-- Admins can update all applications (for evaluation)
CREATE POLICY "Admins can update all shadowing applications"
ON public.gw_shadowing_applications FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_gw_shadowing_applications_updated_at
BEFORE UPDATE ON public.gw_shadowing_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();