-- Create budget transaction trigger to automatically link payments to budgets
CREATE OR REPLACE FUNCTION public.create_budget_transaction_from_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create budget transaction if the payment is linked to a contract that has a budget
  IF NEW.contract_id IS NOT NULL THEN
    INSERT INTO public.budget_transactions (
      budget_id,
      payment_id,
      transaction_type,
      amount,
      description,
      transaction_date
    )
    SELECT 
      b.id,
      NEW.id,
      'payment',
      NEW.amount,
      CONCAT('Payment: ', NEW.notes),
      NEW.payment_date::date
    FROM public.budgets b
    WHERE b.contract_id::text = NEW.contract_id::text
    AND b.status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to link payments to budget system
DROP TRIGGER IF EXISTS trigger_payment_to_budget ON public.user_payments;
CREATE TRIGGER trigger_payment_to_budget
  AFTER INSERT ON public.user_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_budget_transaction_from_payment();

-- Update existing function to also handle payment updates
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
    ),
    remaining_amount = allocated_amount - (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.budget_transactions 
      WHERE budget_category_id = NEW.budget_category_id
    )
    WHERE id = NEW.budget_category_id;
  END IF;
  
  -- Update budget total spent amount and remaining amount
  UPDATE public.budgets 
  SET spent_amount = (
    SELECT COALESCE(SUM(amount), 0) 
    FROM public.budget_transactions 
    WHERE budget_id = NEW.budget_id
  ),
  remaining_amount = total_amount - (
    SELECT COALESCE(SUM(amount), 0) 
    FROM public.budget_transactions 
    WHERE budget_id = NEW.budget_id
  )
  WHERE id = NEW.budget_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;