-- Create excuse_requests table to track submissions
CREATE TABLE public.gw_excuse_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL,
  event_ids TEXT[] NOT NULL,
  excuse_type TEXT NOT NULL,
  clarification TEXT,
  document_url TEXT,
  document_filename TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  response_message TEXT,
  responded_by UUID REFERENCES auth.users(id),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_excuse_requests ENABLE ROW LEVEL SECURITY;

-- Students can view their own requests
CREATE POLICY "Students can view own excuse requests"
ON public.gw_excuse_requests
FOR SELECT
USING (auth.uid() = student_id);

-- Students can create their own requests
CREATE POLICY "Students can create own excuse requests"
ON public.gw_excuse_requests
FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Admins, super_admins, and secretaries can view all requests
CREATE POLICY "Admins and secretaries can view all excuse requests"
ON public.gw_excuse_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.app_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin', 'secretary', 'executive')
    AND is_active = true
  )
);

-- Admins and secretaries can update requests (approve/deny)
CREATE POLICY "Admins and secretaries can update excuse requests"
ON public.gw_excuse_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.app_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin', 'secretary', 'executive')
    AND is_active = true
  )
);

-- Create storage bucket for excuse documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'excuse-documents',
  'excuse-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Storage policy: Students can upload to their own folder
CREATE POLICY "Students can upload excuse documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'excuse-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policy: Students can view their own documents
CREATE POLICY "Students can view own excuse documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'excuse-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policy: Admins and secretaries can view all documents
CREATE POLICY "Admins and secretaries can view all excuse documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'excuse-documents'
  AND EXISTS (
    SELECT 1 FROM public.app_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin', 'secretary', 'executive')
    AND is_active = true
  )
);

-- Add index for faster queries
CREATE INDEX idx_gw_excuse_requests_student_id ON public.gw_excuse_requests(student_id);
CREATE INDEX idx_gw_excuse_requests_status ON public.gw_excuse_requests(status);
CREATE INDEX idx_gw_excuse_requests_course_id ON public.gw_excuse_requests(course_id);

-- Update timestamp trigger
CREATE TRIGGER update_gw_excuse_requests_updated_at
BEFORE UPDATE ON public.gw_excuse_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();