-- Add approval workflow columns to budgets table
ALTER TABLE public.budgets 
ADD COLUMN approval_status text DEFAULT 'draft' CHECK (approval_status IN ('draft', 'pending_treasurer', 'treasurer_approved', 'pending_superadmin', 'fully_approved', 'rejected')),
ADD COLUMN treasurer_approved_by uuid,
ADD COLUMN treasurer_approved_at timestamp with time zone,
ADD COLUMN superadmin_approved_by uuid,
ADD COLUMN superadmin_approved_at timestamp with time zone,
ADD COLUMN rejection_reason text,
ADD COLUMN rejected_by uuid,
ADD COLUMN rejected_at timestamp with time zone;

-- Create function to handle budget approval workflow
CREATE OR REPLACE FUNCTION public.approve_budget_step(
  p_budget_id uuid,
  p_approver_role text,
  p_action text DEFAULT 'approve',
  p_rejection_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_budget RECORD;
  v_is_treasurer boolean := false;
  v_is_superadmin boolean := false;
  result jsonb;
BEGIN
  -- Check user roles
  SELECT 
    EXISTS (SELECT 1 FROM gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR role = 'treasurer')),
    EXISTS (SELECT 1 FROM gw_profiles WHERE user_id = auth.uid() AND is_super_admin = true)
  INTO v_is_treasurer, v_is_superadmin;
  
  -- Get current budget
  SELECT * INTO v_budget FROM public.budgets WHERE id = p_budget_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Budget not found');
  END IF;
  
  -- Handle rejection
  IF p_action = 'reject' THEN
    UPDATE public.budgets 
    SET 
      approval_status = 'rejected',
      rejected_by = auth.uid(),
      rejected_at = now(),
      rejection_reason = p_rejection_reason
    WHERE id = p_budget_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Budget rejected');
  END IF;
  
  -- Handle approval workflow
  IF p_approver_role = 'treasurer' AND v_is_treasurer THEN
    -- Treasurer approval (first step)
    IF v_budget.approval_status IN ('draft', 'pending_treasurer') THEN
      UPDATE public.budgets 
      SET 
        approval_status = 'pending_superadmin',
        treasurer_approved_by = auth.uid(),
        treasurer_approved_at = now()
      WHERE id = p_budget_id;
      
      RETURN jsonb_build_object('success', true, 'message', 'Budget approved by treasurer, now pending superadmin approval');
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Budget not in correct state for treasurer approval');
    END IF;
    
  ELSIF p_approver_role = 'superadmin' AND v_is_superadmin THEN
    -- Superadmin approval (final step)
    IF v_budget.approval_status = 'pending_superadmin' THEN
      UPDATE public.budgets 
      SET 
        approval_status = 'fully_approved',
        superadmin_approved_by = auth.uid(),
        superadmin_approved_at = now(),
        status = 'active' -- Activate the budget when fully approved
      WHERE id = p_budget_id;
      
      RETURN jsonb_build_object('success', true, 'message', 'Budget fully approved and activated');
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Budget must be approved by treasurer first');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
END;
$$;

-- Function to submit budget for approval
CREATE OR REPLACE FUNCTION public.submit_budget_for_approval(p_budget_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_budget RECORD;
BEGIN
  -- Get budget
  SELECT * INTO v_budget FROM public.budgets WHERE id = p_budget_id AND created_by = auth.uid();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Budget not found or access denied');
  END IF;
  
  -- Only allow submission if in draft status
  IF v_budget.approval_status != 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Budget already submitted for approval');
  END IF;
  
  -- Update status to pending treasurer approval
  UPDATE public.budgets 
  SET approval_status = 'pending_treasurer'
  WHERE id = p_budget_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Budget submitted for treasurer approval');
END;
$$;