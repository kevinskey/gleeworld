-- Create gw_stipend_payments table
CREATE TABLE IF NOT EXISTS public.gw_stipend_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT DEFAULT 'check',
  notes TEXT,
  contract_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create gw_dues_records table
CREATE TABLE IF NOT EXISTS public.gw_dues_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'waived')),
  semester TEXT,
  academic_year TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_stipend_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_dues_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for gw_stipend_payments
CREATE POLICY "Users can view their own stipend payments"
ON public.gw_stipend_payments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all stipend payments"
ON public.gw_stipend_payments FOR ALL
USING (is_current_user_gw_admin());

CREATE POLICY "Treasurers can manage stipend payments"
ON public.gw_stipend_payments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position = 'treasurer' 
    AND is_active = true
  )
);

-- Create RLS policies for gw_dues_records
CREATE POLICY "Users can view their own dues records"
ON public.gw_dues_records FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all dues records"
ON public.gw_dues_records FOR ALL
USING (is_current_user_gw_admin());

CREATE POLICY "Treasurers can manage dues records"
ON public.gw_dues_records FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position = 'treasurer' 
    AND is_active = true
  )
);

-- Add update triggers
CREATE TRIGGER update_gw_stipend_payments_updated_at
  BEFORE UPDATE ON public.gw_stipend_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_dues_records_updated_at
  BEFORE UPDATE ON public.gw_dues_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();