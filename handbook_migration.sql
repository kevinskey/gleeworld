-- Create handbook exam results table
CREATE TABLE public.gw_handbook_exam_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 15),
  total_questions INTEGER NOT NULL DEFAULT 15,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  questions_data JSONB,
  answers_data JSONB,
  passed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create handbook signatures table
CREATE TABLE public.gw_handbook_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_result_id UUID REFERENCES public.gw_handbook_exam_results(id) ON DELETE CASCADE,
  signature_data TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  device_info JSONB,
  ip_address INET,
  pdf_storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create storage bucket for handbook signatures
INSERT INTO storage.buckets (id, name, public) VALUES ('handbook-signatures', 'handbook-signatures', false);

-- Enable RLS on both tables
ALTER TABLE public.gw_handbook_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_handbook_signatures ENABLE ROW LEVEL SECURITY;

-- RLS policies for exam results
CREATE POLICY "Users can view their own exam results" 
ON public.gw_handbook_exam_results 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exam results" 
ON public.gw_handbook_exam_results 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all exam results" 
ON public.gw_handbook_exam_results 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Historians can view all exam results" 
ON public.gw_handbook_exam_results 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.gw_executive_board_members 
  WHERE user_id = auth.uid() 
  AND position = 'historian' 
  AND is_active = true
));

-- RLS policies for signatures
CREATE POLICY "Users can view their own signatures" 
ON public.gw_handbook_signatures 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own signatures" 
ON public.gw_handbook_signatures 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all signatures" 
ON public.gw_handbook_signatures 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Historians can view all signatures" 
ON public.gw_handbook_signatures 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.gw_executive_board_members 
  WHERE user_id = auth.uid() 
  AND position = 'historian' 
  AND is_active = true
));

-- Storage policies for handbook signatures bucket
CREATE POLICY "Admin access to handbook signatures" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'handbook-signatures' 
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Historian read access to handbook signatures" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'handbook-signatures' 
  AND EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position = 'historian' 
    AND is_active = true
  )
);

CREATE POLICY "Users can read their own signed contracts" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'handbook-signatures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION public.update_gw_handbook_exam_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_handbook_exam_results_updated_at
BEFORE UPDATE ON public.gw_handbook_exam_results
FOR EACH ROW
EXECUTE FUNCTION public.update_gw_handbook_exam_results_updated_at();

CREATE OR REPLACE FUNCTION public.update_gw_handbook_signatures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_handbook_signatures_updated_at
BEFORE UPDATE ON public.gw_handbook_signatures
FOR EACH ROW
EXECUTE FUNCTION public.update_gw_handbook_signatures_updated_at();