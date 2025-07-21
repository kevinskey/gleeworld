-- Add missing foreign key constraints for gw_member_communications table
ALTER TABLE public.gw_member_communications 
ADD CONSTRAINT gw_member_communications_recipient_id_fkey 
FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.gw_member_communications 
ADD CONSTRAINT gw_member_communications_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.gw_member_communications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for gw_member_communications
CREATE POLICY "Users can view communications they sent or received"
ON public.gw_member_communications
FOR SELECT
USING (
  auth.uid() = created_by 
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
CREATE INDEX IF NOT EXISTS idx_gw_member_communications_recipient_id ON public.gw_member_communications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_gw_member_communications_created_by ON public.gw_member_communications(created_by);
CREATE INDEX IF NOT EXISTS idx_gw_member_communications_created_at ON public.gw_member_communications(created_at DESC);