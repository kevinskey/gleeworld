
-- Create activity logs table to track user actions
CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action_type ON public.activity_logs(action_type);
CREATE INDEX idx_activity_logs_resource_type ON public.activity_logs(resource_type);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for activity logs
CREATE POLICY "Admins can view all activity logs" 
  ON public.activity_logs 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
    )
  );

CREATE POLICY "Users can view their own activity logs" 
  ON public.activity_logs 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for inserting activity logs (system use)
CREATE POLICY "Allow inserting activity logs" 
  ON public.activity_logs 
  FOR INSERT 
  WITH CHECK (true);

-- Create function to log activity
CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id uuid,
  p_action_type text,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.activity_logs (
    user_id, action_type, resource_type, resource_id, 
    details, ip_address, user_agent
  )
  VALUES (
    p_user_id, p_action_type, p_resource_type, p_resource_id,
    p_details, p_ip_address, p_user_agent
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;
