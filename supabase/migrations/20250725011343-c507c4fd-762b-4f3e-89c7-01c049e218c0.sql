-- Create excuse requests table
CREATE TABLE public.excuse_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID,
  event_date DATE NOT NULL,
  event_title TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'forwarded', 'approved', 'denied')),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  forwarded_by UUID,
  forwarded_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create excuse request status history table
CREATE TABLE public.excuse_request_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  excuse_request_id UUID NOT NULL,
  status TEXT NOT NULL,
  changed_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.excuse_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excuse_request_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for excuse_requests
CREATE POLICY "Users can view their own excuse requests" 
ON public.excuse_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own excuse requests" 
ON public.excuse_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their pending excuse requests" 
ON public.excuse_requests 
FOR UPDATE 
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Secretaries can view all excuse requests" 
ON public.excuse_requests 
FOR SELECT 
USING (EXISTS ( 
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (exec_board_role = 'secretary' OR (special_roles::jsonb ? 'secretary') OR is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Secretaries can update excuse requests to forward them" 
ON public.excuse_requests 
FOR UPDATE 
USING (EXISTS ( 
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (exec_board_role = 'secretary' OR (special_roles::jsonb ? 'secretary') OR is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Super admins can view and manage all excuse requests" 
ON public.excuse_requests 
FOR ALL 
USING (EXISTS ( 
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_super_admin = true OR is_admin = true)
));

-- RLS Policies for excuse_request_history
CREATE POLICY "Users can view history of their own excuse requests" 
ON public.excuse_request_history 
FOR SELECT 
USING (EXISTS ( 
  SELECT 1 FROM excuse_requests 
  WHERE id = excuse_request_history.excuse_request_id 
  AND user_id = auth.uid()
));

CREATE POLICY "Authorized users can view excuse request history" 
ON public.excuse_request_history 
FOR SELECT 
USING (EXISTS ( 
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (exec_board_role = 'secretary' OR (special_roles::jsonb ? 'secretary') OR is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Authorized users can create excuse request history" 
ON public.excuse_request_history 
FOR INSERT 
WITH CHECK (EXISTS ( 
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (exec_board_role = 'secretary' OR (special_roles::jsonb ? 'secretary') OR is_admin = true OR is_super_admin = true)
));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_excuse_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_excuse_requests_updated_at
BEFORE UPDATE ON public.excuse_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_excuse_requests_updated_at();

-- Create function to log status changes
CREATE OR REPLACE FUNCTION public.log_excuse_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status != NEW.status THEN
    INSERT INTO public.excuse_request_history (
      excuse_request_id,
      status,
      changed_by,
      notes
    ) VALUES (
      NEW.id,
      NEW.status,
      auth.uid(),
      CASE 
        WHEN NEW.status = 'forwarded' THEN 'Request forwarded to super admin'
        WHEN NEW.status = 'approved' THEN COALESCE(NEW.admin_notes, 'Request approved')
        WHEN NEW.status = 'denied' THEN COALESCE(NEW.admin_notes, 'Request denied')
        ELSE 'Status updated'
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status change logging
CREATE TRIGGER log_excuse_request_status_change
AFTER UPDATE ON public.excuse_requests
FOR EACH ROW
EXECUTE FUNCTION public.log_excuse_request_status_change();

-- Create indexes for better performance
CREATE INDEX idx_excuse_requests_user_id ON public.excuse_requests(user_id);
CREATE INDEX idx_excuse_requests_status ON public.excuse_requests(status);
CREATE INDEX idx_excuse_requests_event_date ON public.excuse_requests(event_date);
CREATE INDEX idx_excuse_request_history_request_id ON public.excuse_request_history(excuse_request_id);