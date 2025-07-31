-- Create payment plans table
CREATE TABLE public.gw_payment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_amount DECIMAL(10,2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment plan payments table
CREATE TABLE public.gw_payment_plan_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_plan_id UUID NOT NULL REFERENCES public.gw_payment_plans(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enhanced dues records table
CREATE TABLE public.gw_dues_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_by UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  semester TEXT NOT NULL,
  payment_plan_id UUID REFERENCES public.gw_payment_plans(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'payment_plan')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.gw_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_payment_plan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_dues_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payment plans
CREATE POLICY "Admins and treasurers can manage payment plans"
ON public.gw_payment_plans
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR exec_board_role = 'treasurer')
  )
);

CREATE POLICY "Users can view their own payment plans"
ON public.gw_payment_plans
FOR SELECT
USING (user_id = auth.uid());

-- Create RLS policies for payment plan payments
CREATE POLICY "Admins and treasurers can manage payment plan payments"
ON public.gw_payment_plan_payments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR exec_board_role = 'treasurer')
  )
);

CREATE POLICY "Users can view their own payment plan payments"
ON public.gw_payment_plan_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_payment_plans pp
    WHERE pp.id = gw_payment_plan_payments.payment_plan_id 
    AND pp.user_id = auth.uid()
  )
);

-- Create RLS policies for dues records
CREATE POLICY "Admins and treasurers can manage dues records"
ON public.gw_dues_records
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR exec_board_role = 'treasurer')
  )
);

CREATE POLICY "Users can view their own dues records"
ON public.gw_dues_records
FOR SELECT
USING (user_id = auth.uid());

-- Create function to generate payment schedule
CREATE OR REPLACE FUNCTION public.generate_payment_schedule(
  plan_id UUID,
  start_date_param DATE,
  frequency_param TEXT,
  payment_amount_param DECIMAL,
  total_amount_param DECIMAL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_date DATE := start_date_param;
  remaining_amount DECIMAL := total_amount_param;
  payment_count INTEGER := 0;
  max_payments INTEGER := 50; -- Safety limit
BEGIN
  WHILE remaining_amount > 0 AND payment_count < max_payments LOOP
    INSERT INTO public.gw_payment_plan_payments (
      payment_plan_id,
      due_date,
      amount
    ) VALUES (
      plan_id,
      current_date,
      LEAST(payment_amount_param, remaining_amount)
    );
    
    remaining_amount := remaining_amount - payment_amount_param;
    payment_count := payment_count + 1;
    
    -- Calculate next payment date based on frequency
    CASE frequency_param
      WHEN 'weekly' THEN
        current_date := current_date + INTERVAL '7 days';
      WHEN 'biweekly' THEN
        current_date := current_date + INTERVAL '14 days';
      WHEN 'monthly' THEN
        current_date := current_date + INTERVAL '1 month';
    END CASE;
  END LOOP;
END;
$$;

-- Create trigger to update updated_at columns
CREATE OR REPLACE FUNCTION public.update_payment_plans_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_payment_plans_updated_at
  BEFORE UPDATE ON public.gw_payment_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_plans_updated_at();

CREATE TRIGGER update_payment_plan_payments_updated_at
  BEFORE UPDATE ON public.gw_payment_plan_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_plans_updated_at();

CREATE TRIGGER update_dues_records_updated_at
  BEFORE UPDATE ON public.gw_dues_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_plans_updated_at();