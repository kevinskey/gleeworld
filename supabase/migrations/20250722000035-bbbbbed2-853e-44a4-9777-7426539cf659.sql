-- Create class conflict requests table
CREATE TABLE public.gw_class_conflict_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  schedule JSONB NOT NULL,
  conflict_analysis JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_section_leader' CHECK (status IN ('pending_section_leader', 'pending_secretary', 'pending_final', 'approved', 'rejected')),
  section_leader_approval JSONB,
  secretary_approval JSONB,
  final_approval JSONB,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.gw_class_conflict_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for class conflict requests
CREATE POLICY "Users can view their own conflict requests" 
ON public.gw_class_conflict_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conflict requests" 
ON public.gw_class_conflict_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Section leaders can view and update pending requests" 
ON public.gw_class_conflict_requests 
FOR ALL
USING (
  status = 'pending_section_leader' AND 
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND section_leader = true
  )
);

CREATE POLICY "Secretary can view and update requests from section leaders" 
ON public.gw_class_conflict_requests 
FOR ALL
USING (
  status IN ('pending_secretary', 'pending_section_leader') AND 
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND exec_board_role = 'secretary'
  )
);

CREATE POLICY "Admins can view and update all requests" 
ON public.gw_class_conflict_requests 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create trigger for updating timestamps
CREATE TRIGGER update_gw_class_conflict_requests_updated_at
BEFORE UPDATE ON public.gw_class_conflict_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();