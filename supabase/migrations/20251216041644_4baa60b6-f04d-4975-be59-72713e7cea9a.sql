-- Add location_tag and is_hidden if not exists
ALTER TABLE gw_course_lounge_posts 
ADD COLUMN IF NOT EXISTS location_tag text,
ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;

-- Create course lounge comments table
CREATE TABLE IF NOT EXISTS gw_course_lounge_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES gw_course_lounge_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  is_hidden boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create course lounge reactions table
CREATE TABLE IF NOT EXISTS gw_course_lounge_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES gw_course_lounge_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  reaction_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, author_id, reaction_type)
);

-- Enable RLS
ALTER TABLE gw_course_lounge_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_course_lounge_reactions ENABLE ROW LEVEL SECURITY;

-- RLS for comments
CREATE POLICY "Users with course access can view comments"
ON gw_course_lounge_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM gw_course_lounge_posts p
    WHERE p.id = post_id AND public.has_course_lounge_access(p.course_id)
  )
);

CREATE POLICY "Users with course access can create comments"
ON gw_course_lounge_comments FOR INSERT
WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM gw_course_lounge_posts p
    WHERE p.id = post_id AND public.has_course_lounge_access(p.course_id)
  )
);

CREATE POLICY "Users can delete own comments"
ON gw_course_lounge_comments FOR DELETE
USING (auth.uid() = author_id);

-- RLS for reactions
CREATE POLICY "Users with course access can view reactions"
ON gw_course_lounge_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM gw_course_lounge_posts p
    WHERE p.id = post_id AND public.has_course_lounge_access(p.course_id)
  )
);

CREATE POLICY "Users with course access can create reactions"
ON gw_course_lounge_reactions FOR INSERT
WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM gw_course_lounge_posts p
    WHERE p.id = post_id AND public.has_course_lounge_access(p.course_id)
  )
);

CREATE POLICY "Users can delete own reactions"
ON gw_course_lounge_reactions FOR DELETE
USING (auth.uid() = author_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE gw_course_lounge_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE gw_course_lounge_reactions;