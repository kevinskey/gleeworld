-- Create gw_stipend_payments table
CREATE TABLE public.gw_stipend_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
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
CREATE TABLE public.gw_dues_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT DEFAULT 'pending',
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

-- Simple RLS policies that allow all access for now
CREATE POLICY "Allow all access to gw_stipend_payments"
ON public.gw_stipend_payments FOR ALL
USING (true);

CREATE POLICY "Allow all access to gw_dues_records"
ON public.gw_dues_records FOR ALL
USING (true);