-- Create budgets table for managing project/event budgets
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  allocated_amount NUMERIC NOT NULL DEFAULT 0,
  spent_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC GENERATED ALWAYS AS (total_amount - spent_amount) STORED,
  budget_type TEXT NOT NULL DEFAULT 'project' CHECK (budget_type IN ('project', 'event', 'contract', 'annual')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold')),
  start_date DATE NOT NULL,
  end_date DATE,
  created_by UUID NOT NULL,
  contract_id UUID,
  event_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create budget_categories table for organizing budget line items
CREATE TABLE public.budget_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  allocated_amount NUMERIC NOT NULL DEFAULT 0,
  spent_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC GENERATED ALWAYS AS (allocated_amount - spent_amount) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create budget_permissions table for user access control
CREATE TABLE public.budget_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  permission_type TEXT NOT NULL CHECK (permission_type IN ('view', 'edit', 'manage')),
  granted_by UUID NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(budget_id, user_id, permission_type)
);

-- Create budget_transactions table to link financial records to budgets
CREATE TABLE public.budget_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  budget_category_id UUID REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  finance_record_id UUID REFERENCES public.finance_records(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.user_payments(id) ON DELETE CASCADE,
  receipt_id UUID REFERENCES public.receipts(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('expense', 'payment', 'receipt', 'stipend', 'allocation')),
  amount NUMERIC NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all budget tables
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for budgets table
CREATE POLICY "Admins can manage all budgets" 
ON public.budgets 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Users can view budgets they have permission for" 
ON public.budgets 
FOR SELECT 
USING (
  created_by = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.budget_permissions 
    WHERE budget_id = budgets.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update budgets they have edit permission for" 
ON public.budgets 
FOR UPDATE 
USING (
  created_by = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.budget_permissions 
    WHERE budget_id = budgets.id AND user_id = auth.uid() 
    AND permission_type IN ('edit', 'manage')
  )
);

CREATE POLICY "Users can create their own budgets" 
ON public.budgets 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

-- RLS Policies for budget_categories table
CREATE POLICY "Users can manage categories for budgets they have access to" 
ON public.budget_categories 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.budgets b 
    WHERE b.id = budget_categories.budget_id 
    AND (
      b.created_by = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM public.budget_permissions bp 
        WHERE bp.budget_id = b.id AND bp.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
      )
    )
  )
);

-- RLS Policies for budget_permissions table
CREATE POLICY "Admins and budget managers can manage permissions" 
ON public.budget_permissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
  OR EXISTS (
    SELECT 1 FROM public.budgets b 
    WHERE b.id = budget_permissions.budget_id AND b.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.budget_permissions bp 
    WHERE bp.budget_id = budget_permissions.budget_id 
    AND bp.user_id = auth.uid() AND bp.permission_type = 'manage'
  )
);

-- RLS Policies for budget_transactions table
CREATE POLICY "Users can view transactions for budgets they have access to" 
ON public.budget_transactions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.budgets b 
    WHERE b.id = budget_transactions.budget_id 
    AND (
      b.created_by = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM public.budget_permissions bp 
        WHERE bp.budget_id = b.id AND bp.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
      )
    )
  )
);

CREATE POLICY "Admins and authorized users can manage budget transactions" 
ON public.budget_transactions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
  OR EXISTS (
    SELECT 1 FROM public.budgets b 
    WHERE b.id = budget_transactions.budget_id 
    AND (
      b.created_by = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM public.budget_permissions bp 
        WHERE bp.budget_id = b.id AND bp.user_id = auth.uid() 
        AND bp.permission_type IN ('edit', 'manage')
      )
    )
  )
);

-- Create indexes for better performance
CREATE INDEX idx_budgets_created_by ON public.budgets(created_by);
CREATE INDEX idx_budgets_contract_id ON public.budgets(contract_id);
CREATE INDEX idx_budgets_event_id ON public.budgets(event_id);
CREATE INDEX idx_budgets_status ON public.budgets(status);
CREATE INDEX idx_budget_categories_budget_id ON public.budget_categories(budget_id);
CREATE INDEX idx_budget_permissions_budget_id ON public.budget_permissions(budget_id);
CREATE INDEX idx_budget_permissions_user_id ON public.budget_permissions(user_id);
CREATE INDEX idx_budget_transactions_budget_id ON public.budget_transactions(budget_id);
CREATE INDEX idx_budget_transactions_finance_record_id ON public.budget_transactions(finance_record_id);
CREATE INDEX idx_budget_transactions_payment_id ON public.budget_transactions(payment_id);

-- Create triggers for updated_at columns
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budget_categories_updated_at
  BEFORE UPDATE ON public.budget_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically update spent amounts when transactions are added
CREATE OR REPLACE FUNCTION public.update_budget_spent_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update budget category spent amount
  IF NEW.budget_category_id IS NOT NULL THEN
    UPDATE public.budget_categories 
    SET spent_amount = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.budget_transactions 
      WHERE budget_category_id = NEW.budget_category_id
    )
    WHERE id = NEW.budget_category_id;
  END IF;
  
  -- Update budget total spent amount
  UPDATE public.budgets 
  SET spent_amount = (
    SELECT COALESCE(SUM(amount), 0) 
    FROM public.budget_transactions 
    WHERE budget_id = NEW.budget_id
  )
  WHERE id = NEW.budget_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic spent amount updates
CREATE TRIGGER update_budget_spent_amounts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.budget_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_spent_amounts();

-- Function to create budget transactions from finance records
CREATE OR REPLACE FUNCTION public.create_budget_transaction_from_finance_record()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create budget transaction if the finance record is linked to a contract with a budget
  IF NEW.reference IS NOT NULL THEN
    INSERT INTO public.budget_transactions (
      budget_id,
      finance_record_id,
      transaction_type,
      amount,
      description,
      transaction_date
    )
    SELECT 
      b.id,
      NEW.id,
      CASE 
        WHEN NEW.type = 'debit' THEN 'expense'
        WHEN NEW.type = 'credit' THEN 'payment'
        ELSE NEW.type
      END,
      ABS(NEW.amount),
      NEW.description,
      NEW.date
    FROM public.budgets b
    WHERE b.contract_id::text = NEW.reference
    AND b.status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically link finance records to budgets
CREATE TRIGGER link_finance_record_to_budget
  AFTER INSERT ON public.finance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.create_budget_transaction_from_finance_record();