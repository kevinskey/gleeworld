-- Create storage bucket for ID documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('id-documents', 'id-documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

-- Create policies for ID documents bucket
CREATE POLICY "Allow members to upload their own ID documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'id-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('member', 'alumna', 'admin', 'super-admin')
  )
);

CREATE POLICY "Allow authorized staff to view ID documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'id-documents' 
  AND (
    -- Admins can see all
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
    OR
    -- Tour managers can see all
    EXISTS (
      SELECT 1 FROM public.gw_executive_board_members 
      WHERE user_id = auth.uid() 
      AND position::text = 'tour_manager'
      AND is_active = true
    )
    OR
    -- Chief of staff can see all
    EXISTS (
      SELECT 1 FROM public.gw_executive_board_members 
      WHERE user_id = auth.uid() 
      AND position::text = 'chief_of_staff'
      AND is_active = true
    )
    OR
    -- Users can see their own
    auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Allow authorized staff to delete ID documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'id-documents' 
  AND (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
    OR
    EXISTS (
      SELECT 1 FROM public.gw_executive_board_members 
      WHERE user_id = auth.uid() 
      AND position::text IN ('tour_manager', 'chief_of_staff')
      AND is_active = true
    )
  )
);

-- Create table to track ID document submissions
CREATE TABLE public.id_document_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  submission_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_notes TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on ID document submissions
ALTER TABLE public.id_document_submissions ENABLE ROW LEVEL SECURITY;

-- Policies for ID document submissions table
CREATE POLICY "Users can view their own ID submissions"
ON public.id_document_submissions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ID submissions"
ON public.id_document_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authorized staff can view all ID submissions"
ON public.id_document_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position::text IN ('tour_manager', 'chief_of_staff')
    AND is_active = true
  )
);

CREATE POLICY "Authorized staff can update ID submissions"
ON public.id_document_submissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position::text IN ('tour_manager', 'chief_of_staff')
    AND is_active = true
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_id_document_submissions_updated_at
  BEFORE UPDATE ON public.id_document_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();