-- Discussion Prompts (course_id as UUID to match enrollments)
CREATE TABLE public.discussion_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL,
  title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  stimulus_type TEXT DEFAULT 'none' CHECK (stimulus_type IN ('video', 'audio', 'pdf', 'link', 'none')),
  stimulus_url TEXT,
  individual_due_at TIMESTAMPTZ NOT NULL,
  peer_due_at TIMESTAMPTZ NOT NULL,
  synthesis_due_at TIMESTAMPTZ NOT NULL,
  word_min INT DEFAULT 200,
  word_max INT DEFAULT 300,
  current_phase TEXT DEFAULT 'draft' CHECK (current_phase IN ('draft', 'individual_open', 'individual_locked', 'peer_open', 'peer_locked', 'synthesis_open', 'closed')),
  is_locked BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Discussion Groups
CREATE TABLE public.discussion_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES public.discussion_prompts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INT DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Discussion Group Members
CREATE TABLE public.discussion_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_group_id UUID NOT NULL REFERENCES public.discussion_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'leader')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(discussion_group_id, user_id)
);

-- Discussion Posts
CREATE TABLE public.discussion_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES public.discussion_prompts(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.discussion_groups(id) ON DELETE SET NULL,
  author_id UUID NOT NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('individual', 'peer_response', 'synthesis')),
  parent_post_id UUID REFERENCES public.discussion_posts(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  word_count INT DEFAULT 0,
  response_tag TEXT CHECK (response_tag IN ('challenge', 'extend', 'connect', 'question', NULL)),
  submitted_at TIMESTAMPTZ,
  is_draft BOOLEAN DEFAULT true,
  locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Discussion Rubric
CREATE TABLE public.discussion_rubric (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES public.discussion_prompts(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  max_points INT NOT NULL,
  criteria TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Discussion Grades
CREATE TABLE public.discussion_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES public.discussion_prompts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  individual_score NUMERIC,
  peer_score NUMERIC,
  synthesis_score NUMERIC,
  professionalism_score NUMERIC,
  total_score NUMERIC,
  instructor_feedback TEXT,
  ai_pre_score JSONB,
  graded_by UUID,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(discussion_id, student_id)
);

-- Discussion Analytics
CREATE TABLE public.discussion_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES public.discussion_prompts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  time_on_task_seconds INT DEFAULT 0,
  last_active_at TIMESTAMPTZ,
  posts_count INT DEFAULT 0,
  responses_received INT DEFAULT 0,
  avg_word_count NUMERIC,
  engagement_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(discussion_id, user_id)
);

-- Indexes
CREATE INDEX idx_disc_prompts_course ON public.discussion_prompts(course_id);
CREATE INDEX idx_disc_groups_discussion ON public.discussion_groups(discussion_id);
CREATE INDEX idx_disc_posts_discussion ON public.discussion_posts(discussion_id);
CREATE INDEX idx_disc_posts_author ON public.discussion_posts(author_id);
CREATE INDEX idx_disc_posts_group ON public.discussion_posts(group_id);
CREATE INDEX idx_disc_grades_student ON public.discussion_grades(student_id);

-- Enable RLS
ALTER TABLE public.discussion_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_rubric ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_analytics ENABLE ROW LEVEL SECURITY;