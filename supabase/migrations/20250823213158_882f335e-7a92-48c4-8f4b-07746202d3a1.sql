-- Create member check-ins table for tracking attendance and time
CREATE TABLE public.member_check_ins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  check_out_time TIMESTAMP WITH TIME ZONE NULL,
  location TEXT DEFAULT 'Glee Club',
  event_type TEXT DEFAULT 'rehearsal',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.member_check_ins ENABLE ROW LEVEL SECURITY;

-- Create policies for member check-ins
CREATE POLICY "Users can view their own check-ins" 
ON public.member_check_ins 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own check-ins" 
ON public.member_check_ins 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own check-ins" 
ON public.member_check_ins 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all check-ins" 
ON public.member_check_ins 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Admins can manage all check-ins" 
ON public.member_check_ins 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_member_check_ins_updated_at
  BEFORE UPDATE ON public.member_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();