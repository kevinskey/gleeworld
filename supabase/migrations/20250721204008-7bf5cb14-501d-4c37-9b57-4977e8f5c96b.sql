-- Create gw_member_communications table
CREATE TABLE public.gw_member_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  communication_type TEXT NOT NULL CHECK (communication_type IN ('excuse_letter', 'warning_letter', 'commendation', 'general_notice', 'attendance_notice', 'event_invitation', 'other')),
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'delivered', 'failed')),
  file_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.gw_member_communications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view communications they sent or received"
ON public.gw_member_communications
FOR SELECT
USING (
  auth.uid() = sender_id 
  OR auth.uid() = recipient_id 
  OR recipient_id IS NULL -- General notices can be viewed by all
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Only admins can create member communications"
ON public.gw_member_communications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Only admins can update member communications"
ON public.gw_member_communications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Only admins can delete member communications"
ON public.gw_member_communications
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

-- Create trigger to update updated_at column
CREATE TRIGGER update_gw_member_communications_updated_at
  BEFORE UPDATE ON public.gw_member_communications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_gw_member_communications_recipient_id ON public.gw_member_communications(recipient_id);
CREATE INDEX idx_gw_member_communications_sender_id ON public.gw_member_communications(sender_id);
CREATE INDEX idx_gw_member_communications_created_at ON public.gw_member_communications(created_at DESC);