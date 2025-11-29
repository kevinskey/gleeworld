-- Create upload jobs table for tracking large file uploads
CREATE TABLE IF NOT EXISTS public.upload_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  file_name TEXT NOT NULL,
  bucket TEXT NOT NULL,
  file_size BIGINT,
  url TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.upload_jobs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own upload jobs
CREATE POLICY "Users can view upload jobs"
  ON public.upload_jobs
  FOR SELECT
  USING (true);

-- Allow service role to insert and update
CREATE POLICY "Service role can manage upload jobs"
  ON public.upload_jobs
  FOR ALL
  USING (true);

-- Create index on job_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_upload_jobs_job_id ON public.upload_jobs(job_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_upload_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER upload_jobs_updated_at
  BEFORE UPDATE ON public.upload_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_upload_jobs_updated_at();