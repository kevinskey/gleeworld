-- Create concert ticket requests table
CREATE TABLE public.concert_ticket_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  num_tickets INTEGER NOT NULL CHECK (num_tickets >= 1 AND num_tickets <= 10),
  special_requests TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'fulfilled', 'cancelled')),
  assigned_to UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.concert_ticket_requests ENABLE ROW LEVEL SECURITY;

-- Create policy: Anyone can insert (public form)
CREATE POLICY "Anyone can submit ticket requests"
ON public.concert_ticket_requests
FOR INSERT
WITH CHECK (true);

-- Create policy: Only admins can view all requests
CREATE POLICY "Admins can view all ticket requests"
ON public.concert_ticket_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);

-- Create policy: Only admins can update requests
CREATE POLICY "Admins can update ticket requests"
ON public.concert_ticket_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_concert_ticket_requests_updated_at
BEFORE UPDATE ON public.concert_ticket_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_concert_ticket_requests_status ON public.concert_ticket_requests(status);
CREATE INDEX idx_concert_ticket_requests_created_at ON public.concert_ticket_requests(created_at DESC);
