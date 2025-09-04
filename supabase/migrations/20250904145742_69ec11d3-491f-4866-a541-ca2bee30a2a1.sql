-- Create table for hair/nail approval submissions
CREATE TABLE public.gw_hair_nail_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  submission_type VARCHAR(20) NOT NULL CHECK (submission_type IN ('hair', 'nails', 'both')),
  image_url TEXT NOT NULL,
  image_path TEXT NOT NULL,
  notes TEXT,
  event_date DATE,
  event_name TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.gw_hair_nail_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own submissions" 
ON public.gw_hair_nail_submissions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own submissions" 
ON public.gw_hair_nail_submissions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policies for wardrobe mistresses (admins and executive board)
CREATE POLICY "Wardrobe staff can view all submissions" 
ON public.gw_hair_nail_submissions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) OR
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

CREATE POLICY "Wardrobe staff can update submissions" 
ON public.gw_hair_nail_submissions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) OR
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_hair_nail_submissions_updated_at
BEFORE UPDATE ON public.gw_hair_nail_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for hair/nail photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('hair-nail-photos', 'hair-nail-photos', false);

-- Create storage policies for hair/nail photos
CREATE POLICY "Users can upload their own hair/nail photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'hair-nail-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own hair/nail photos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'hair-nail-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Wardrobe staff can view all hair/nail photos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'hair-nail-photos' 
  AND (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    ) OR
    EXISTS (
      SELECT 1 FROM public.gw_executive_board_members 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  )
);