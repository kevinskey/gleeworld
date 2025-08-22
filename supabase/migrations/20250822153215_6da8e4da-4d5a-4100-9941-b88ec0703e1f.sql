-- Create journal entries table
CREATE TABLE public.mus240_journal_entries (
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
CREATE TABLE public.mus240_journal_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_id UUID NOT NULL REFERENCES public.mus240_journal_entries(id) ON DELETE CASCADE,
  commenter_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reading requirements tracking table
CREATE TABLE public.mus240_reading_requirements (
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
CREATE TABLE public.mus240_journal_reads (
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

-- RLS policies for journal entries
CREATE POLICY "Students can create their own journal entries" 
ON public.mus240_journal_entries 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own journal entries" 
ON public.mus240_journal_entries 
FOR UPDATE 
USING (auth.uid() = student_id);

CREATE POLICY "Students can view published journal entries" 
ON public.mus240_journal_entries 
FOR SELECT 
USING (is_published = true OR auth.uid() = student_id);

CREATE POLICY "Admins can manage all journal entries" 
ON public.mus240_journal_entries 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- RLS policies for journal comments
CREATE POLICY "Students can create comments on published journals" 
ON public.mus240_journal_comments 
FOR INSERT 
WITH CHECK (
  auth.uid() = commenter_id AND
  EXISTS (
    SELECT 1 FROM public.mus240_journal_entries 
    WHERE id = journal_id AND is_published = true
  )
);

CREATE POLICY "Students can update their own comments" 
ON public.mus240_journal_comments 
FOR UPDATE 
USING (auth.uid() = commenter_id);

CREATE POLICY "Students can view comments on published journals" 
ON public.mus240_journal_comments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.mus240_journal_entries 
  WHERE id = journal_id AND is_published = true
));

CREATE POLICY "Admins can manage all comments" 
ON public.mus240_journal_comments 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- RLS policies for reading requirements
CREATE POLICY "Students can view their own reading requirements" 
ON public.mus240_reading_requirements 
FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Students can update their own reading requirements" 
ON public.mus240_reading_requirements 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own reading requirements" 
ON public.mus240_reading_requirements 
FOR UPDATE 
USING (auth.uid() = student_id);

CREATE POLICY "Admins can manage all reading requirements" 
ON public.mus240_reading_requirements 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- RLS policies for journal reads
CREATE POLICY "Students can track their own reads" 
ON public.mus240_journal_reads 
FOR INSERT 
WITH CHECK (auth.uid() = reader_id);

CREATE POLICY "Students can view their own reads" 
ON public.mus240_journal_reads 
FOR SELECT 
USING (auth.uid() = reader_id);

CREATE POLICY "Admins can manage all reads" 
ON public.mus240_journal_reads 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION public.update_mus240_journal_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_mus240_journal_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_mus240_reading_requirements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mus240_journal_entries_updated_at
BEFORE UPDATE ON public.mus240_journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_mus240_journal_entries_updated_at();

CREATE TRIGGER update_mus240_journal_comments_updated_at
BEFORE UPDATE ON public.mus240_journal_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_mus240_journal_comments_updated_at();

CREATE TRIGGER update_mus240_reading_requirements_updated_at
BEFORE UPDATE ON public.mus240_reading_requirements
FOR EACH ROW
EXECUTE FUNCTION public.update_mus240_reading_requirements_updated_at();

-- Function to update reading requirements when someone reads a journal
CREATE OR REPLACE FUNCTION public.update_reading_progress()
RETURNS TRIGGER AS $$
DECLARE
  assignment_id_val TEXT;
  current_count INTEGER;
BEGIN
  -- Get the assignment_id from the journal entry
  SELECT assignment_id INTO assignment_id_val
  FROM public.mus240_journal_entries
  WHERE id = NEW.journal_id;
  
  -- Count current reads for this assignment by this reader
  SELECT COUNT(*) INTO current_count
  FROM public.mus240_journal_reads jr
  JOIN public.mus240_journal_entries je ON jr.journal_id = je.id
  WHERE jr.reader_id = NEW.reader_id 
  AND je.assignment_id = assignment_id_val;
  
  -- Insert or update reading requirements
  INSERT INTO public.mus240_reading_requirements (
    assignment_id, student_id, journals_read, completed_at
  ) VALUES (
    assignment_id_val, NEW.reader_id, current_count,
    CASE WHEN current_count >= 2 THEN now() ELSE NULL END
  )
  ON CONFLICT (assignment_id, student_id)
  DO UPDATE SET
    journals_read = current_count,
    completed_at = CASE WHEN current_count >= 2 THEN now() ELSE NULL END,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reading_progress_trigger
AFTER INSERT ON public.mus240_journal_reads
FOR EACH ROW
EXECUTE FUNCTION public.update_reading_progress();