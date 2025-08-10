-- Create table for per-user documents
CREATE TABLE IF NOT EXISTS public.gw_user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content_html TEXT,
  content_md TEXT,
  tags TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.gw_user_documents ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gw_user_documents_user_id ON public.gw_user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_gw_user_documents_created_at ON public.gw_user_documents(created_at DESC);

-- RLS Policies: users can CRUD only their own documents
CREATE POLICY "Users can view their own documents"
ON public.gw_user_documents
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents"
ON public.gw_user_documents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
ON public.gw_user_documents
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
ON public.gw_user_documents
FOR DELETE
USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_gw_user_documents_updated_at
BEFORE UPDATE ON public.gw_user_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();