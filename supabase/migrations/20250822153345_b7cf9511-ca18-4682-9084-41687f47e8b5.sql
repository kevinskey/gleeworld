-- Create journal entries table
CREATE TABLE IF NOT EXISTS public.mus240_journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  student_id UUID NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE
);

-- Create journal comments table
CREATE TABLE IF NOT EXISTS public.mus240_journal_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_id UUID NOT NULL REFERENCES public.mus240_journal_entries(id) ON DELETE CASCADE,
  commenter_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reading requirements tracking table
CREATE TABLE IF NOT EXISTS public.mus240_reading_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  student_id UUID NOT NULL,
  journals_read INTEGER NOT NULL DEFAULT 0,
  required_reads INTEGER NOT NULL DEFAULT 2,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

-- Create journal reads tracking table
CREATE TABLE IF NOT EXISTS public.mus240_journal_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_id UUID NOT NULL REFERENCES public.mus240_journal_entries(id) ON DELETE CASCADE,
  reader_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(journal_id, reader_id)
);

-- Enable RLS on all tables
ALTER TABLE public.mus240_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mus240_journal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mus240_reading_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mus240_journal_reads ENABLE ROW LEVEL SECURITY;