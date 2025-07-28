-- Create scholarships table for the scholarship hub
CREATE TABLE public.scholarships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  deadline date,
  amount text,
  eligibility text,
  tags text[],
  link text,
  is_featured boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  is_active boolean DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view active scholarships
CREATE POLICY "Users can view active scholarships" 
ON public.scholarships 
FOR SELECT 
USING (is_active = true);

-- Allow admins to manage scholarships
CREATE POLICY "Admins can manage scholarships" 
ON public.scholarships 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

-- Create trigger for updating updated_at
CREATE TRIGGER update_scholarships_updated_at
  BEFORE UPDATE ON public.scholarships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();