-- Create documents table for Google Docs integration
CREATE TABLE IF NOT EXISTS public.gw_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  google_doc_id TEXT UNIQUE,
  google_doc_url TEXT,
  document_type TEXT DEFAULT 'general', -- general, meeting_minutes, contract, report, etc.
  content_preview TEXT, -- Cached content preview
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shared_with UUID[], -- Array of user IDs who have access
  permissions JSONB DEFAULT '{"public_read": false, "public_write": false}'::jsonb,
  tags TEXT[],
  status TEXT DEFAULT 'active', -- active, archived, deleted
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.gw_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for document access
CREATE POLICY "Users can view documents they own or are shared with" 
ON public.gw_documents 
FOR SELECT 
USING (
  owner_id = auth.uid() OR 
  created_by = auth.uid() OR
  auth.uid() = ANY(shared_with) OR
  (permissions->>'public_read')::boolean = true OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Users can create documents" 
ON public.gw_documents 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own documents" 
ON public.gw_documents 
FOR UPDATE 
USING (
  owner_id = auth.uid() OR 
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Users can delete their own documents" 
ON public.gw_documents 
FOR DELETE 
USING (
  owner_id = auth.uid() OR 
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create document sharing table
CREATE TABLE IF NOT EXISTS public.gw_document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.gw_documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL DEFAULT 'read', -- read, write, admin
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(document_id, user_id)
);

-- Enable RLS for document shares
ALTER TABLE public.gw_document_shares ENABLE ROW LEVEL SECURITY;

-- Policies for document shares
CREATE POLICY "Users can view shares for their documents" 
ON public.gw_document_shares 
FOR SELECT 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.gw_documents 
    WHERE id = document_id AND (owner_id = auth.uid() OR created_by = auth.uid())
  ) OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_gw_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_documents_updated_at
  BEFORE UPDATE ON public.gw_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gw_documents_updated_at();

-- Create indexes for performance
CREATE INDEX idx_gw_documents_owner_id ON public.gw_documents(owner_id);
CREATE INDEX idx_gw_documents_google_doc_id ON public.gw_documents(google_doc_id);
CREATE INDEX idx_gw_documents_document_type ON public.gw_documents(document_type);
CREATE INDEX idx_gw_documents_status ON public.gw_documents(status);
CREATE INDEX idx_gw_document_shares_document_id ON public.gw_document_shares(document_id);
CREATE INDEX idx_gw_document_shares_user_id ON public.gw_document_shares(user_id);