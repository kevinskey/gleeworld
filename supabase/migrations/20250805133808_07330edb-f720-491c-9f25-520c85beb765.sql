-- Create approval requests table
CREATE TABLE public.approval_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_type TEXT NOT NULL CHECK (request_type IN ('budget_request', 'expense_report', 'purchase_order', 'stipend_payment', 'contract_payment')),
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  requestor_id UUID NOT NULL,
  requestor_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'review')),
  budget_category TEXT,
  receipt_urls TEXT[],
  supporting_documents TEXT[],
  notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own approval requests"
ON public.approval_requests
FOR SELECT
USING (requestor_id = auth.uid());

CREATE POLICY "Users can create their own approval requests"
ON public.approval_requests
FOR INSERT
WITH CHECK (requestor_id = auth.uid());

CREATE POLICY "Users can update their own pending requests"
ON public.approval_requests
FOR UPDATE
USING (requestor_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can view all approval requests"
ON public.approval_requests
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Admins can update all approval requests"
ON public.approval_requests
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- Create approval workflow history table
CREATE TABLE public.approval_workflow_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  approval_request_id UUID NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('submitted', 'approved', 'rejected', 'requested_changes', 'updated')),
  performed_by UUID NOT NULL,
  performer_name TEXT NOT NULL,
  notes TEXT,
  old_status TEXT,
  new_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on history table
ALTER TABLE public.approval_workflow_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history for their requests"
ON public.approval_workflow_history
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.approval_requests ar
  WHERE ar.id = approval_workflow_history.approval_request_id
  AND ar.requestor_id = auth.uid()
));

CREATE POLICY "Admins can view all approval history"
ON public.approval_workflow_history
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "System can insert approval history"
ON public.approval_workflow_history
FOR INSERT
WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_approval_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_approval_requests_updated_at
  BEFORE UPDATE ON public.approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_approval_requests_updated_at();

-- Create function to log approval actions
CREATE OR REPLACE FUNCTION public.log_approval_action()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.approval_workflow_history (
      approval_request_id,
      action_type,
      performed_by,
      performer_name,
      old_status,
      new_status,
      notes
    ) VALUES (
      NEW.id,
      CASE 
        WHEN NEW.status = 'approved' THEN 'approved'
        WHEN NEW.status = 'rejected' THEN 'rejected'
        WHEN NEW.status = 'review' THEN 'requested_changes'
        ELSE 'updated'
      END,
      COALESCE(NEW.approved_by, NEW.rejected_by, auth.uid()),
      COALESCE(
        (SELECT full_name FROM public.gw_profiles WHERE user_id = COALESCE(NEW.approved_by, NEW.rejected_by, auth.uid())),
        'System'
      ),
      OLD.status,
      NEW.status,
      CASE 
        WHEN NEW.status = 'rejected' THEN NEW.rejection_reason
        ELSE NEW.notes
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_approval_status_changes
  AFTER UPDATE ON public.approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_approval_action();