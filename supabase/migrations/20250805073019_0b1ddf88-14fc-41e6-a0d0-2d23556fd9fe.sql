-- Create receipts table
CREATE TABLE public.gw_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2),
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT DEFAULT 'general',
  vendor_name TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_receipts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own receipts" 
ON public.gw_receipts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own receipts" 
ON public.gw_receipts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receipts" 
ON public.gw_receipts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all receipts" 
ON public.gw_receipts 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Admins can update all receipts" 
ON public.gw_receipts 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_receipts_updated_at
BEFORE UPDATE ON public.gw_receipts
FOR EACH ROW
EXECUTE FUNCTION public.update_receipts_updated_at();