
-- Create receipts table to store purchase receipts
CREATE TABLE public.receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number TEXT,
  vendor_name TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  purchase_date DATE NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  template_id UUID REFERENCES public.contract_templates(id),
  event_id UUID REFERENCES public.events(id),
  receipt_image_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on receipts table
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Create policies for receipts
CREATE POLICY "Admins can view all receipts" 
  ON public.receipts 
  FOR SELECT 
  USING (public.current_user_is_admin());

CREATE POLICY "Admins can create receipts" 
  ON public.receipts 
  FOR INSERT 
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "Admins can update receipts" 
  ON public.receipts 
  FOR UPDATE 
  USING (public.current_user_is_admin());

CREATE POLICY "Admins can delete receipts" 
  ON public.receipts 
  FOR DELETE 
  USING (public.current_user_is_admin());

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_receipts_updated_at 
  BEFORE UPDATE ON public.receipts 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for receipt images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true);

-- Create storage policies for receipt images
CREATE POLICY "Admins can upload receipt images" 
  ON storage.objects 
  FOR INSERT 
  WITH CHECK (bucket_id = 'receipts' AND public.current_user_is_admin());

CREATE POLICY "Admins can view receipt images" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'receipts' AND public.current_user_is_admin());

CREATE POLICY "Admins can update receipt images" 
  ON storage.objects 
  FOR UPDATE 
  USING (bucket_id = 'receipts' AND public.current_user_is_admin());

CREATE POLICY "Admins can delete receipt images" 
  ON storage.objects 
  FOR DELETE 
  USING (bucket_id = 'receipts' AND public.current_user_is_admin());
