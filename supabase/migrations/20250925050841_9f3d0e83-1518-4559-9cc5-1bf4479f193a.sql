-- Create pearl inventory table
CREATE TABLE public.gw_pearl_inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pearl_set_number text NOT NULL,
  condition text NOT NULL DEFAULT 'good',
  notes text,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.gw_pearl_inventory ENABLE ROW LEVEL SECURITY;

-- RLS policies for pearl inventory
CREATE POLICY "Wardrobe managers can view all pearl inventory"
ON public.gw_pearl_inventory
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Wardrobe managers can manage pearl inventory"
ON public.gw_pearl_inventory
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Insert some sample pearl sets
INSERT INTO public.gw_pearl_inventory (pearl_set_number, condition, notes, created_by) VALUES
('P001', 'excellent', 'Full pearl set with earrings', (SELECT user_id FROM public.gw_profiles WHERE is_super_admin = true LIMIT 1)),
('P002', 'good', 'Pearl necklace only', (SELECT user_id FROM public.gw_profiles WHERE is_super_admin = true LIMIT 1)),
('P003', 'excellent', 'Complete pearl set', (SELECT user_id FROM public.gw_profiles WHERE is_super_admin = true LIMIT 1)),
('P004', 'good', 'Pearl set with minor scratches', (SELECT user_id FROM public.gw_profiles WHERE is_super_admin = true LIMIT 1)),
('P005', 'excellent', 'New pearl set', (SELECT user_id FROM public.gw_profiles WHERE is_super_admin = true LIMIT 1)),
('P006', 'good', 'Standard pearl set', (SELECT user_id FROM public.gw_profiles WHERE is_super_admin = true LIMIT 1)),
('P007', 'fair', 'Older pearl set, needs cleaning', (SELECT user_id FROM public.gw_profiles WHERE is_super_admin = true LIMIT 1)),
('P008', 'excellent', 'Premium pearl set', (SELECT user_id FROM public.gw_profiles WHERE is_super_admin = true LIMIT 1)),
('P009', 'good', 'Standard pearl necklace', (SELECT user_id FROM public.gw_profiles WHERE is_super_admin = true LIMIT 1)),
('P010', 'excellent', 'Complete set with case', (SELECT user_id FROM public.gw_profiles WHERE is_super_admin = true LIMIT 1));

-- Update trigger for pearl inventory
CREATE TRIGGER update_gw_pearl_inventory_updated_at
  BEFORE UPDATE ON public.gw_pearl_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create pearl checkout tracking table
CREATE TABLE public.gw_pearl_checkouts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pearl_id uuid NOT NULL REFERENCES public.gw_pearl_inventory(id),
  member_id uuid NOT NULL,
  checked_out_by uuid NOT NULL REFERENCES auth.users(id),
  checked_out_at timestamp with time zone NOT NULL DEFAULT now(),
  due_date date,
  returned_at timestamp with time zone,
  returned_to uuid REFERENCES auth.users(id),
  condition_on_return text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for pearl checkouts
ALTER TABLE public.gw_pearl_checkouts ENABLE ROW LEVEL SECURITY;

-- RLS policies for pearl checkouts
CREATE POLICY "Wardrobe managers can view all pearl checkouts"
ON public.gw_pearl_checkouts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Wardrobe managers can manage pearl checkouts"
ON public.gw_pearl_checkouts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Update trigger for pearl checkouts
CREATE TRIGGER update_gw_pearl_checkouts_updated_at
  BEFORE UPDATE ON public.gw_pearl_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();