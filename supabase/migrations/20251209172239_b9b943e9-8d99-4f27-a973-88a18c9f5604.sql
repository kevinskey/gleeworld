-- =============================================
-- GLEE LOUNGE MVP: Database Foundation
-- =============================================

-- 1. Social Posts Table
CREATE TABLE public.gw_social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  location_tag TEXT,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gw_social_posts_created_at ON public.gw_social_posts(created_at DESC);
CREATE INDEX idx_gw_social_posts_user_id ON public.gw_social_posts(user_id);

-- 2. Social Comments Table
CREATE TABLE public.gw_social_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.gw_social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gw_social_comments_post ON public.gw_social_comments(post_id, created_at ASC);
CREATE INDEX idx_gw_social_comments_user_id ON public.gw_social_comments(user_id);

-- 3. Social Reactions Table
CREATE TABLE public.gw_social_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.gw_social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('heart','music','fire','clap','laugh')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_gw_social_reactions_unique ON public.gw_social_reactions(post_id, user_id, reaction_type);

-- 4. Content Reports Table
CREATE TABLE public.gw_content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('post','comment')),
  content_id UUID NOT NULL,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gw_content_reports_status ON public.gw_content_reports(status);
CREATE INDEX idx_gw_content_reports_content ON public.gw_content_reports(content_type, content_id);

-- 5. Moderation Log Table
CREATE TABLE public.gw_moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL CHECK (action_type IN ('hide','unhide','warn','delete','restore','note')),
  content_type TEXT NOT NULL CHECK (content_type IN ('post','comment')),
  content_id UUID NOT NULL,
  moderator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gw_moderation_log_content ON public.gw_moderation_log(content_type, content_id);
CREATE INDEX idx_gw_moderation_log_moderator ON public.gw_moderation_log(moderator_id, created_at DESC);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.gw_social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_social_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_social_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_moderation_log ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_glee_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- POSTS POLICIES
CREATE POLICY "Members can view visible posts"
  ON public.gw_social_posts FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND (is_hidden = false OR user_id = auth.uid() OR public.is_glee_admin())
  );

CREATE POLICY "Members can create posts"
  ON public.gw_social_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can update own posts"
  ON public.gw_social_posts FOR UPDATE
  USING (auth.uid() = user_id OR public.is_glee_admin());

CREATE POLICY "Admins can delete posts"
  ON public.gw_social_posts FOR DELETE
  USING (auth.uid() = user_id OR public.is_glee_admin());

-- COMMENTS POLICIES
CREATE POLICY "Members can view visible comments"
  ON public.gw_social_comments FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND (is_hidden = false OR user_id = auth.uid() OR public.is_glee_admin())
  );

CREATE POLICY "Members can create comments"
  ON public.gw_social_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can update own comments"
  ON public.gw_social_comments FOR UPDATE
  USING (auth.uid() = user_id OR public.is_glee_admin());

CREATE POLICY "Members can delete own comments"
  ON public.gw_social_comments FOR DELETE
  USING (auth.uid() = user_id OR public.is_glee_admin());

-- REACTIONS POLICIES
CREATE POLICY "Members can view reactions"
  ON public.gw_social_reactions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Members can add reactions"
  ON public.gw_social_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can remove own reactions"
  ON public.gw_social_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- REPORTS POLICIES
CREATE POLICY "Members can create reports"
  ON public.gw_content_reports FOR INSERT
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Admins can view reports"
  ON public.gw_content_reports FOR SELECT
  USING (public.is_glee_admin() OR reported_by = auth.uid());

CREATE POLICY "Admins can update reports"
  ON public.gw_content_reports FOR UPDATE
  USING (public.is_glee_admin());

-- MODERATION LOG POLICIES
CREATE POLICY "Admins can view moderation log"
  ON public.gw_moderation_log FOR SELECT
  USING (public.is_glee_admin());

CREATE POLICY "Admins can create moderation log entries"
  ON public.gw_moderation_log FOR INSERT
  WITH CHECK (public.is_glee_admin());

-- Enable Realtime for posts and comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_social_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_social_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_social_reactions;

-- Updated_at trigger for posts
CREATE OR REPLACE FUNCTION public.update_gw_social_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_social_posts_updated_at
  BEFORE UPDATE ON public.gw_social_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gw_social_posts_updated_at();