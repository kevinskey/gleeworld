-- Create user_signatures table for storing user signatures
CREATE TABLE IF NOT EXISTS public.user_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signature_data TEXT NOT NULL,
  signature_type TEXT NOT NULL DEFAULT 'drawn',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_signatures ENABLE ROW LEVEL SECURITY;

-- Users can view their own signatures
CREATE POLICY "Users can view their own signatures"
ON public.user_signatures
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own signatures
CREATE POLICY "Users can insert their own signatures"
ON public.user_signatures
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own signatures
CREATE POLICY "Users can update their own signatures"
ON public.user_signatures
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own signatures
CREATE POLICY "Users can delete their own signatures"
ON public.user_signatures
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_signatures_user_id ON public.user_signatures(user_id);
CREATE INDEX idx_user_signatures_active ON public.user_signatures(user_id, is_active);

-- Create trigger for updated_at
CREATE TRIGGER update_user_signatures_updated_at
BEFORE UPDATE ON public.user_signatures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();