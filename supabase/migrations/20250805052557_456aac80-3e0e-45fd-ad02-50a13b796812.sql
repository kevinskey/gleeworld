-- Create reimbursement requests table
CREATE TABLE public.gw_reimbursement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  receipt_url TEXT,
  receipt_filename TEXT,
  purchase_date DATE NOT NULL,
  vendor_name TEXT NOT NULL,
  business_purpose TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  
  -- Workflow status
  status TEXT NOT NULL DEFAULT 'pending_treasurer' CHECK (status IN (
    'pending_treasurer', 
    'treasurer_approved', 
    'pending_super_admin', 
    'super_admin_approved', 
    'ready_for_payment', 
    'paid', 
    'rejected'
  )),
  
  -- Approval tracking
  treasurer_id UUID REFERENCES auth.users(id),
  treasurer_approved_at TIMESTAMP WITH TIME ZONE,
  treasurer_notes TEXT,
  
  super_admin_id UUID REFERENCES auth.users(id),
  super_admin_approved_at TIMESTAMP WITH TIME ZONE,
  super_admin_notes TEXT,
  
  -- Payment tracking
  payment_method TEXT,
  check_number TEXT,
  payment_date DATE,
  paid_by UUID REFERENCES auth.users(id),
  payment_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reimbursement approvals audit table
CREATE TABLE public.gw_reimbursement_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reimbursement_id UUID NOT NULL REFERENCES public.gw_reimbursement_requests(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'paid')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_reimbursement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_reimbursement_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reimbursement requests
CREATE POLICY "Users can view their own reimbursement requests" 
ON public.gw_reimbursement_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reimbursement requests" 
ON public.gw_reimbursement_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending requests" 
ON public.gw_reimbursement_requests 
FOR UPDATE 
USING (auth.uid() = user_id AND status = 'pending_treasurer');

CREATE POLICY "Treasurers and admins can view all requests" 
ON public.gw_reimbursement_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) OR
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position::text = 'treasurer' 
    AND is_active = true
  )
);

CREATE POLICY "Treasurers and admins can update requests" 
ON public.gw_reimbursement_requests 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) OR
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position::text = 'treasurer' 
    AND is_active = true
  )
);

-- RLS Policies for approvals audit
CREATE POLICY "Admins and treasurers can view all approvals" 
ON public.gw_reimbursement_approvals 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) OR
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position::text = 'treasurer' 
    AND is_active = true
  )
);

CREATE POLICY "Admins and treasurers can create approvals" 
ON public.gw_reimbursement_approvals 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) OR
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position::text = 'treasurer' 
    AND is_active = true
  )
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_reimbursement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reimbursement_updated_at
BEFORE UPDATE ON public.gw_reimbursement_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_reimbursement_updated_at();