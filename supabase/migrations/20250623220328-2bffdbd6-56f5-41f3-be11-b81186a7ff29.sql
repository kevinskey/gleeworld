
-- Create storage bucket for W9 forms
INSERT INTO storage.buckets (id, name, public)
VALUES ('w9-forms', 'w9-forms', false)
ON CONFLICT (id) DO NOTHING;

-- Create policies for W9 forms bucket
CREATE POLICY "Users can upload their own W9 forms" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'w9-forms' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own W9 forms" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'w9-forms' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own W9 forms" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'w9-forms' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create table to track W9 form submissions
CREATE TABLE public.w9_forms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  storage_path text NOT NULL,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'submitted',
  form_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on W9 forms table
ALTER TABLE public.w9_forms ENABLE ROW LEVEL SECURITY;

-- Create policies for W9 forms table
CREATE POLICY "Users can view their own W9 forms" 
ON public.w9_forms FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own W9 forms" 
ON public.w9_forms FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own W9 forms" 
ON public.w9_forms FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_w9_forms_updated_at
    BEFORE UPDATE ON public.w9_forms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
