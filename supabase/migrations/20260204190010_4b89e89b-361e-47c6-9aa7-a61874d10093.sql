-- Create registration_requests table for fan and alumna approval workflow
CREATE TABLE IF NOT EXISTS public.registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    requested_role TEXT NOT NULL CHECK (requested_role IN ('fan', 'alumna')),
    graduation_year INTEGER,
    voice_part TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for registration_requests

-- Users can view their own registration request
CREATE POLICY "Users can view own registration request"
ON public.registration_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own registration request
CREATE POLICY "Users can create own registration request"
ON public.registration_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all registration requests
CREATE POLICY "Admins can view all registration requests"
ON public.registration_requests
FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- Admins can update registration requests (approve/deny)
CREATE POLICY "Admins can update registration requests"
ON public.registration_requests
FOR UPDATE
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_registration_requests_status ON public.registration_requests(status);
CREATE INDEX idx_registration_requests_user_id ON public.registration_requests(user_id);
CREATE INDEX idx_registration_requests_requested_role ON public.registration_requests(requested_role);

-- Create trigger for updated_at
CREATE TRIGGER update_registration_requests_updated_at
BEFORE UPDATE ON public.registration_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();