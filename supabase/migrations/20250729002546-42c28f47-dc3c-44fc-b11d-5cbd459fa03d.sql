-- Create running ledger table
CREATE TABLE public.gw_running_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('debit', 'credit', 'beginning_balance')),
  amount DECIMAL(10,2) NOT NULL,
  running_balance DECIMAL(10,2) NOT NULL,
  reference_number TEXT,
  category TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.gw_running_ledger ENABLE ROW LEVEL SECURITY;

-- Create policies for running ledger
CREATE POLICY "Treasurer and admins can view all ledger entries" 
ON public.gw_running_ledger 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND position = 'treasurer' AND is_active = true
  ) OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Treasurer and admins can create ledger entries" 
ON public.gw_running_ledger 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND
  (EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND position = 'treasurer' AND is_active = true
  ) OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  ))
);

CREATE POLICY "Treasurer and admins can update ledger entries" 
ON public.gw_running_ledger 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND position = 'treasurer' AND is_active = true
  ) OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Treasurer and admins can delete ledger entries" 
ON public.gw_running_ledger 
FOR DELETE 
USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_gw_running_ledger_updated_at
  BEFORE UPDATE ON public.gw_running_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column_v2();

-- Create function to calculate running balance
CREATE OR REPLACE FUNCTION public.calculate_running_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  previous_balance DECIMAL(10,2) := 0;
BEGIN
  -- Get the most recent balance before this entry's date
  SELECT COALESCE(running_balance, 0) INTO previous_balance
  FROM public.gw_running_ledger
  WHERE entry_date <= NEW.entry_date AND id != COALESCE(NEW.id, gen_random_uuid())
  ORDER BY entry_date DESC, created_at DESC
  LIMIT 1;
  
  -- Calculate new running balance
  IF NEW.transaction_type = 'beginning_balance' THEN
    NEW.running_balance = NEW.amount;
  ELSIF NEW.transaction_type = 'credit' THEN
    NEW.running_balance = previous_balance + NEW.amount;
  ELSIF NEW.transaction_type = 'debit' THEN
    NEW.running_balance = previous_balance - NEW.amount;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically calculate running balance
CREATE TRIGGER calculate_running_balance_trigger
  BEFORE INSERT OR UPDATE ON public.gw_running_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_running_balance();