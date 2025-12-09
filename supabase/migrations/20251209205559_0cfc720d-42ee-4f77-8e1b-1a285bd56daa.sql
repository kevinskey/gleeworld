-- Create stipend payments table with full accounting
CREATE TABLE public.stipend_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL,
  student_email TEXT,
  student_phone TEXT,
  student_cashtag TEXT,
  
  -- Event/Source information
  event_name TEXT NOT NULL,
  event_date DATE,
  source_type TEXT NOT NULL DEFAULT 'manual', -- 'survey', 'event', 'manual'
  source_id TEXT, -- ID of survey response, event, etc.
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash_app', -- 'cash_app', 'venmo', 'check', 'direct_deposit'
  
  -- Budget/Accounting
  budget_source TEXT, -- e.g., "Concert Fund", "Student Activities"
  budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL,
  receipt_url TEXT,
  notes TEXT,
  
  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'paid', 'cancelled'
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id),
  paid_at TIMESTAMPTZ,
  payment_reference TEXT, -- Cash App transaction ID, check number, etc.
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.stipend_payments ENABLE ROW LEVEL SECURITY;

-- Admins and exec board can view all payments
CREATE POLICY "Admins can view all stipend payments"
ON public.stipend_payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  )
);

-- Admins can manage payments
CREATE POLICY "Admins can manage stipend payments"
ON public.stipend_payments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Students can view their own payments
CREATE POLICY "Students can view own stipend payments"
ON public.stipend_payments FOR SELECT
USING (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_stipend_payments_status ON public.stipend_payments(status);
CREATE INDEX idx_stipend_payments_user_id ON public.stipend_payments(user_id);
CREATE INDEX idx_stipend_payments_event_name ON public.stipend_payments(event_name);

-- Trigger for updated_at
CREATE TRIGGER update_stipend_payments_updated_at
  BEFORE UPDATE ON public.stipend_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();