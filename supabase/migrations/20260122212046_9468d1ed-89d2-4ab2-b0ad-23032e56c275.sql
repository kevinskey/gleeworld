-- RLS Policies: Prompts
CREATE POLICY "disc_prompts_instructor_all" ON public.discussion_prompts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true OR role = 'instructor'))
  );

CREATE POLICY "disc_prompts_student_select" ON public.discussion_prompts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.gw_course_enrollments WHERE user_id = auth.uid() AND course_id = discussion_prompts.course_id)
  );

-- RLS Policies: Groups
CREATE POLICY "disc_groups_instructor_all" ON public.discussion_groups
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true OR role = 'instructor'))
  );

CREATE POLICY "disc_groups_member_select" ON public.discussion_groups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.discussion_group_members WHERE discussion_group_id = id AND user_id = auth.uid())
  );

-- RLS Policies: Group Members
CREATE POLICY "disc_members_instructor_all" ON public.discussion_group_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true OR role = 'instructor'))
  );

CREATE POLICY "disc_members_student_select" ON public.discussion_group_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.discussion_group_members dgm WHERE dgm.discussion_group_id = discussion_group_members.discussion_group_id AND dgm.user_id = auth.uid())
  );

-- RLS Policies: Posts
CREATE POLICY "disc_posts_author_all" ON public.discussion_posts
  FOR ALL USING (author_id = auth.uid() AND locked = false);

CREATE POLICY "disc_posts_group_select" ON public.discussion_posts
  FOR SELECT USING (
    group_id IS NULL OR
    EXISTS (SELECT 1 FROM public.discussion_group_members WHERE discussion_group_id = discussion_posts.group_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true OR role = 'instructor'))
  );

CREATE POLICY "disc_posts_instructor_all" ON public.discussion_posts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true OR role = 'instructor'))
  );

-- RLS Policies: Rubric
CREATE POLICY "disc_rubric_select_all" ON public.discussion_rubric
  FOR SELECT USING (true);

CREATE POLICY "disc_rubric_instructor_all" ON public.discussion_rubric
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true OR role = 'instructor'))
  );

-- RLS Policies: Grades
CREATE POLICY "disc_grades_student_select" ON public.discussion_grades
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "disc_grades_instructor_all" ON public.discussion_grades
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true OR role = 'instructor'))
  );

-- RLS Policies: Analytics
CREATE POLICY "disc_analytics_user_select" ON public.discussion_analytics
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "disc_analytics_instructor_all" ON public.discussion_analytics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true OR role = 'instructor'))
  );

-- Function to calculate word count
CREATE OR REPLACE FUNCTION public.calculate_discussion_word_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.word_count := array_length(regexp_split_to_array(trim(COALESCE(NEW.content, '')), '\s+'), 1);
  IF NEW.word_count IS NULL THEN NEW.word_count := 0; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_disc_word_count
  BEFORE INSERT OR UPDATE OF content ON public.discussion_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_discussion_word_count();

-- Updated at triggers
CREATE TRIGGER update_disc_prompts_updated_at
  BEFORE UPDATE ON public.discussion_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disc_posts_updated_at
  BEFORE UPDATE ON public.discussion_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disc_grades_updated_at
  BEFORE UPDATE ON public.discussion_grades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disc_analytics_updated_at
  BEFORE UPDATE ON public.discussion_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();