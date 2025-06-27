
-- Create a table to track user payments
CREATE TABLE public.user_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contract_id UUID REFERENCES public.contracts_v2(id) ON DELETE CASCADE,
  amount NUMERIC,
  payment_date DATE,
  payment_method TEXT DEFAULT 'check',
  notes TEXT,
  paid_by UUID REFERENCES auth.users(id), -- admin who marked as paid
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create a table for user notifications
CREATE TABLE public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, error
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_contract_id UUID REFERENCES public.contracts_v2(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id), -- admin who created notification
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.user_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_payments
CREATE POLICY "Users can view their own payments" 
  ON public.user_payments 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments" 
  ON public.user_payments 
  FOR SELECT 
  USING (public.current_user_is_admin());

CREATE POLICY "Admins can create payments" 
  ON public.user_payments 
  FOR INSERT 
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "Admins can update payments" 
  ON public.user_payments 
  FOR UPDATE 
  USING (public.current_user_is_admin());

-- RLS policies for user_notifications
CREATE POLICY "Users can view their own notifications" 
  ON public.user_notifications 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
  ON public.user_notifications 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications" 
  ON public.user_notifications 
  FOR ALL 
  USING (public.current_user_is_admin());

-- Create triggers for updated_at
CREATE TRIGGER update_user_payments_updated_at
  BEFORE UPDATE ON public.user_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column_v2();

-- Create a view for user dashboard data
CREATE OR REPLACE VIEW public.user_dashboard_data AS
SELECT 
  p.id as user_id,
  p.email,
  p.full_name,
  -- Contract stats
  (SELECT COUNT(*) FROM public.contract_signatures_v2 cs 
   JOIN public.contracts_v2 c ON c.id = cs.contract_id 
   WHERE c.created_by = p.id OR cs.artist_signature_data IS NOT NULL) as total_contracts,
  (SELECT COUNT(*) FROM public.contract_signatures_v2 cs 
   JOIN public.contracts_v2 c ON c.id = cs.contract_id 
   WHERE (c.created_by = p.id OR cs.artist_signature_data IS NOT NULL) 
   AND cs.status = 'completed') as signed_contracts,
  -- W9 stats
  (SELECT COUNT(*) FROM public.w9_forms WHERE user_id = p.id) as w9_forms_count,
  -- Payment stats
  (SELECT COUNT(*) FROM public.user_payments WHERE user_id = p.id) as payments_received,
  (SELECT COALESCE(SUM(amount), 0) FROM public.user_payments WHERE user_id = p.id) as total_amount_received,
  -- Notification stats
  (SELECT COUNT(*) FROM public.user_notifications WHERE user_id = p.id AND is_read = false) as unread_notifications
FROM public.profiles p;

-- Grant access to the view
GRANT SELECT ON public.user_dashboard_data TO authenticated;
