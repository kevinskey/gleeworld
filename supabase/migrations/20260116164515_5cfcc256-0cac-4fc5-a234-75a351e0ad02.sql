-- Add due_date and grading columns to course_discussions
ALTER TABLE public.course_discussions 
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS max_points INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS is_graded BOOLEAN DEFAULT false;

-- Add grade column to discussion_replies for grading student participation
ALTER TABLE public.discussion_replies
ADD COLUMN IF NOT EXISTS grade INTEGER,
ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS feedback TEXT;