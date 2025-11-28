-- Course Announcements Table
CREATE TABLE IF NOT EXISTS public.course_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_pinned BOOLEAN DEFAULT false
);

-- Course Discussions Table
CREATE TABLE IF NOT EXISTS public.course_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_locked BOOLEAN DEFAULT false,
  reply_count INTEGER DEFAULT 0
);

-- Discussion Replies Table
CREATE TABLE IF NOT EXISTS public.discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID REFERENCES public.course_discussions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Course Messages Table
CREATE TABLE IF NOT EXISTS public.course_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  sender_id UUID REFERENCES auth.users(id),
  recipient_id UUID REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Course Modules Table
CREATE TABLE IF NOT EXISTS public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Module Items Table
CREATE TABLE IF NOT EXISTS public.module_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  item_type TEXT NOT NULL, -- 'video', 'document', 'assignment', 'quiz', 'link'
  content_url TEXT,
  content_text TEXT,
  display_order INTEGER NOT NULL,
  points INTEGER,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Course Notes Table
CREATE TABLE IF NOT EXISTS public.course_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.course_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for course_announcements
CREATE POLICY "Users can view announcements" ON public.course_announcements
  FOR SELECT USING (true);

CREATE POLICY "Admins can create announcements" ON public.course_announcements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- RLS Policies for course_discussions
CREATE POLICY "Users can view discussions" ON public.course_discussions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create discussions" ON public.course_discussions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own discussions" ON public.course_discussions
  FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for discussion_replies
CREATE POLICY "Users can view replies" ON public.discussion_replies
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create replies" ON public.discussion_replies
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- RLS Policies for course_messages
CREATE POLICY "Users can view their messages" ON public.course_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" ON public.course_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update read status" ON public.course_messages
  FOR UPDATE USING (auth.uid() = recipient_id);

-- RLS Policies for course_modules
CREATE POLICY "Users can view published modules" ON public.course_modules
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage modules" ON public.course_modules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.app_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- RLS Policies for module_items
CREATE POLICY "Users can view items in published modules" ON public.module_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.course_modules 
      WHERE id = module_items.module_id 
      AND is_published = true
    )
  );

-- RLS Policies for course_notes
CREATE POLICY "Users can view own notes" ON public.course_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notes" ON public.course_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" ON public.course_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON public.course_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_announcements_course_id ON public.course_announcements(course_id);
CREATE INDEX IF NOT EXISTS idx_course_discussions_course_id ON public.course_discussions(course_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_discussion_id ON public.discussion_replies(discussion_id);
CREATE INDEX IF NOT EXISTS idx_course_messages_recipient ON public.course_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_course_messages_sender ON public.course_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON public.course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_module_items_module_id ON public.module_items(module_id);
CREATE INDEX IF NOT EXISTS idx_course_notes_user_id ON public.course_notes(user_id);