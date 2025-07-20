
-- Add treasurer role to the permissions system
INSERT INTO public.profiles (role) 
SELECT 'treasurer' 
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'treasurer');

-- Create budget_approvals table for tracking individual sign-offs
CREATE TABLE public.budget_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approver_role TEXT NOT NULL CHECK (approver_role IN ('treasurer', 'super_admin')),
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approval_date TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, approver_role)
);

-- Add approval tracking fields to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS treasurer_approval_status TEXT DEFAULT 'pending' CHECK (treasurer_approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS super_admin_approval_status TEXT DEFAULT 'pending' CHECK (super_admin_approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS treasurer_approved_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS super_admin_approved_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS treasurer_approval_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS super_admin_approval_date TIMESTAMP WITH TIME ZONE;

-- Enable RLS on budget_approvals
ALTER TABLE public.budget_approvals ENABLE ROW LEVEL SECURITY;

-- RLS policies for budget_approvals
CREATE POLICY "Admins and approvers can view budget approvals" 
ON public.budget_approvals 
FOR SELECT 
USING (
  auth.uid() = approver_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin')) OR
  EXISTS (SELECT 1 FROM public.events WHERE id = budget_approvals.event_id AND created_by = auth.uid())
);

CREATE POLICY "Admins can create budget approvals" 
ON public.budget_approvals 
FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin'))
);

CREATE POLICY "Approvers can update their own approvals" 
ON public.budget_approvals 
FOR UPDATE 
USING (
  auth.uid() = approver_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin'))
);

-- Function to automatically create budget approval entries when budget status changes
CREATE OR REPLACE FUNCTION create_budget_approval_entries()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create approval entries when budget status changes to pending_approval
  IF NEW.budget_status = 'pending_approval' AND (OLD.budget_status IS NULL OR OLD.budget_status != 'pending_approval') THEN
    -- Create treasurer approval entry
    INSERT INTO public.budget_approvals (event_id, approver_role, approval_status)
    SELECT NEW.id, 'treasurer', 'pending'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.budget_approvals 
      WHERE event_id = NEW.id AND approver_role = 'treasurer'
    );
    
    -- Create super admin approval entry
    INSERT INTO public.budget_approvals (event_id, approver_role, approval_status)
    SELECT NEW.id, 'super_admin', 'pending'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.budget_approvals 
      WHERE event_id = NEW.id AND approver_role = 'super_admin'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic approval entry creation
CREATE TRIGGER create_budget_approval_entries_trigger
  AFTER UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION create_budget_approval_entries();

-- Function to update event approval status when individual approvals change
CREATE OR REPLACE FUNCTION update_event_approval_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the corresponding approval status on the events table
  IF NEW.approver_role = 'treasurer' THEN
    UPDATE public.events SET
      treasurer_approval_status = NEW.approval_status,
      treasurer_approved_by = CASE WHEN NEW.approval_status = 'approved' THEN NEW.approver_id ELSE NULL END,
      treasurer_approval_date = CASE WHEN NEW.approval_status = 'approved' THEN NEW.approval_date ELSE NULL END
    WHERE id = NEW.event_id;
  ELSIF NEW.approver_role = 'super_admin' THEN
    UPDATE public.events SET
      super_admin_approval_status = NEW.approval_status,
      super_admin_approved_by = CASE WHEN NEW.approval_status = 'approved' THEN NEW.approver_id ELSE NULL END,
      super_admin_approval_date = CASE WHEN NEW.approval_status = 'approved' THEN NEW.approval_date ELSE NULL END
    WHERE id = NEW.event_id;
  END IF;
  
  -- Check if both approvals are complete and update overall budget status
  UPDATE public.events SET
    budget_status = CASE 
      WHEN treasurer_approval_status = 'approved' AND super_admin_approval_status = 'approved' THEN 'approved'
      WHEN treasurer_approval_status = 'rejected' OR super_admin_approval_status = 'rejected' THEN 'rejected'
      ELSE budget_status
    END
  WHERE id = NEW.event_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating event approval status
CREATE TRIGGER update_event_approval_status_trigger
  AFTER UPDATE ON public.budget_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_event_approval_status();

-- Update updated_at trigger for budget_approvals
CREATE TRIGGER update_budget_approvals_updated_at
  BEFORE UPDATE ON public.budget_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
