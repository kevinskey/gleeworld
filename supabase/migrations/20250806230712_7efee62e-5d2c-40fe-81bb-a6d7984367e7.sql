-- Fix critical security issues in the new gw_document_shares table
-- Add missing RLS policies for INSERT, UPDATE, DELETE operations

-- Policy for inserting document shares (document owners/creators can share)
CREATE POLICY "Document owners can create shares" 
ON public.gw_document_shares 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_documents 
    WHERE id = document_id AND (owner_id = auth.uid() OR created_by = auth.uid())
  ) OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- Policy for updating document shares
CREATE POLICY "Document owners can update shares" 
ON public.gw_document_shares 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_documents 
    WHERE id = document_id AND (owner_id = auth.uid() OR created_by = auth.uid())
  ) OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- Policy for deleting document shares
CREATE POLICY "Document owners can delete shares" 
ON public.gw_document_shares 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_documents 
    WHERE id = document_id AND (owner_id = auth.uid() OR created_by = auth.uid())
  ) OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);