-- Create dues records table
CREATE TABLE public.gw_dues_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'waived')),
  semester TEXT NOT NULL CHECK (semester IN ('fall', 'spring', 'summer')),
  academic_year TEXT NOT NULL,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create general transactions table
CREATE TABLE public.gw_general_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  category TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  payment_method TEXT NOT NULL,
  receipt_url TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stipend payments table
CREATE TABLE public.gw_stipend_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES auth.users(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('performance', 'monthly', 'bonus', 'travel', 'other')),
  description TEXT NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  reference_number TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create receipts table
CREATE TABLE public.gw_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.gw_general_transactions(id),
  vendor_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  transaction_date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  receipt_image_url TEXT,
  receipt_pdf_url TEXT,
  payment_method TEXT NOT NULL,
  tax_deductible BOOLEAN NOT NULL DEFAULT false,
  reimbursable BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.gw_dues_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_general_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_stipend_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_receipts ENABLE ROW LEVEL SECURITY;

-- Create policies for dues records
CREATE POLICY "Treasurer and admins can manage dues records" 
ON public.gw_dues_records 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND position = 'treasurer' AND is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Users can view their own dues records" 
ON public.gw_dues_records 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policies for general transactions
CREATE POLICY "Treasurer and admins can manage general transactions" 
ON public.gw_general_transactions 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND position = 'treasurer' AND is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create policies for stipend payments
CREATE POLICY "Treasurer and admins can manage stipend payments" 
ON public.gw_stipend_payments 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND position = 'treasurer' AND is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Users can view their own stipend payments" 
ON public.gw_stipend_payments 
FOR SELECT 
USING (auth.uid() = recipient_id);

-- Create policies for receipts
CREATE POLICY "Treasurer and admins can manage receipts" 
ON public.gw_receipts 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND position = 'treasurer' AND is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_gw_dues_records_updated_at
BEFORE UPDATE ON public.gw_dues_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_general_transactions_updated_at
BEFORE UPDATE ON public.gw_general_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_stipend_payments_updated_at
BEFORE UPDATE ON public.gw_stipend_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_receipts_updated_at
BEFORE UPDATE ON public.gw_receipts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();