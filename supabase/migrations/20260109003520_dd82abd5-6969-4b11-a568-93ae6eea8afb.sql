-- Create tour documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tour_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name TEXT NOT NULL,
  document_type TEXT DEFAULT 'pdf',
  file_url TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tour_documents ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view tour documents
CREATE POLICY "Anyone can view tour documents"
ON public.tour_documents FOR SELECT
USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Authenticated users can insert tour documents"
ON public.tour_documents FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow uploaders to delete their own documents
CREATE POLICY "Users can delete their own tour documents"
ON public.tour_documents FOR DELETE
USING (auth.uid() = uploaded_by);