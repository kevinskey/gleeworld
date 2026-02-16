
-- =====================================================
-- SECURITY FIX: Function Search Path (warn-level)
-- =====================================================
ALTER FUNCTION public.add_gw_group_leader_as_member() SET search_path = public;
ALTER FUNCTION public.assign_auditioner_role() SET search_path = public;
ALTER FUNCTION public.calculate_semester_grade(user_id_param uuid, semester_name_param text) SET search_path = public;
ALTER FUNCTION public.check_rate_limit(p_user_id uuid, p_action_type text, p_max_requests integer, p_window_minutes integer) SET search_path = public;
ALTER FUNCTION public.create_assignment_notifications() SET search_path = public;
ALTER FUNCTION public.create_host_from_booking_request() SET search_path = public;
ALTER FUNCTION public.debug_audition_permissions() SET search_path = public;
ALTER FUNCTION public.get_current_user_admin_status() SET search_path = public;
ALTER FUNCTION public.get_legacy_assignment_info(assignment_uuid uuid) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.is_current_user_gw_admin() SET search_path = public;
ALTER FUNCTION public.is_current_user_treasurer() SET search_path = public;
ALTER FUNCTION public.is_glee_admin() SET search_path = public;
ALTER FUNCTION public.is_instructor_or_admin(_uid uuid) SET search_path = public;
ALTER FUNCTION public.log_approval_action() SET search_path = public;
ALTER FUNCTION public.search_hosts(search_term text, filter_status host_status, filter_source host_source, filter_state text, limit_count integer) SET search_path = public;
ALTER FUNCTION public.sync_audition_to_management() SET search_path = public;
ALTER FUNCTION public.sync_exec_board_profile() SET search_path = public;
ALTER FUNCTION public.trigger_mus240_grade_recalc() SET search_path = public;
ALTER FUNCTION public.update_gw_group_stats() SET search_path = public;
ALTER FUNCTION public.verify_admin_access(user_id_param uuid) SET search_path = public;
ALTER FUNCTION public.user_has_module_assignment(p_user_id uuid, p_module_name text) SET search_path = public;

-- =====================================================
-- SECURITY FIX: Tighten overly permissive RLS policies
-- =====================================================

-- 1. contract_templates
DROP POLICY IF EXISTS "Allow anyone to delete templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Allow anyone to insert templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Allow anyone to update templates" ON public.contract_templates;
CREATE POLICY "Admins can delete templates" ON public.contract_templates FOR DELETE TO authenticated USING (is_current_user_admin_or_super_admin());
CREATE POLICY "Admins can insert templates" ON public.contract_templates FOR INSERT TO authenticated WITH CHECK (is_current_user_admin_or_super_admin());
CREATE POLICY "Admins can update templates" ON public.contract_templates FOR UPDATE TO authenticated USING (is_current_user_admin_or_super_admin());

-- 2. amazon_affiliate_products
DROP POLICY IF EXISTS "Authenticated users can delete Amazon products" ON public.amazon_affiliate_products;
DROP POLICY IF EXISTS "Authenticated users can insert Amazon products" ON public.amazon_affiliate_products;
DROP POLICY IF EXISTS "Authenticated users can update Amazon products" ON public.amazon_affiliate_products;
CREATE POLICY "Admins can delete Amazon products" ON public.amazon_affiliate_products FOR DELETE TO authenticated USING (is_current_user_admin_or_super_admin());
CREATE POLICY "Admins can insert Amazon products" ON public.amazon_affiliate_products FOR INSERT TO authenticated WITH CHECK (is_current_user_admin_or_super_admin());
CREATE POLICY "Admins can update Amazon products" ON public.amazon_affiliate_products FOR UPDATE TO authenticated USING (is_current_user_admin_or_super_admin());

-- 3. w9_forms
DROP POLICY IF EXISTS "allow_all_inserts_w9" ON public.w9_forms;
DROP POLICY IF EXISTS "allow_authenticated_deletes_w9" ON public.w9_forms;
DROP POLICY IF EXISTS "allow_authenticated_updates_w9" ON public.w9_forms;
CREATE POLICY "Authenticated users can insert w9 forms" ON public.w9_forms FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete w9 forms" ON public.w9_forms FOR DELETE TO authenticated USING (is_current_user_admin_or_super_admin());
CREATE POLICY "Users can update own w9 or admins any" ON public.w9_forms FOR UPDATE TO authenticated USING (auth.uid()::text = user_id::text OR is_current_user_admin_or_super_admin());

-- 4. gw_course_class_sessions
DROP POLICY IF EXISTS "Authenticated users can create class sessions" ON public.gw_course_class_sessions;
DROP POLICY IF EXISTS "Authenticated users can delete class sessions" ON public.gw_course_class_sessions;
DROP POLICY IF EXISTS "Authenticated users can update class sessions" ON public.gw_course_class_sessions;
CREATE POLICY "Instructors and admins can create class sessions" ON public.gw_course_class_sessions FOR INSERT TO authenticated WITH CHECK (is_instructor_or_admin(auth.uid()) OR is_current_user_admin_or_super_admin());
CREATE POLICY "Instructors and admins can delete class sessions" ON public.gw_course_class_sessions FOR DELETE TO authenticated USING (is_instructor_or_admin(auth.uid()) OR is_current_user_admin_or_super_admin());
CREATE POLICY "Instructors and admins can update class sessions" ON public.gw_course_class_sessions FOR UPDATE TO authenticated USING (is_instructor_or_admin(auth.uid()) OR is_current_user_admin_or_super_admin());

-- 5. lh100_modules
DROP POLICY IF EXISTS "Authenticated users can insert lh100 modules" ON public.lh100_modules;
DROP POLICY IF EXISTS "Authenticated users can update lh100 modules" ON public.lh100_modules;
DROP POLICY IF EXISTS "Authenticated users can delete lh100 modules" ON public.lh100_modules;
CREATE POLICY "Instructors and admins can insert lh100 modules" ON public.lh100_modules FOR INSERT TO authenticated WITH CHECK (is_instructor_or_admin(auth.uid()) OR is_current_user_admin_or_super_admin());
CREATE POLICY "Instructors and admins can update lh100 modules" ON public.lh100_modules FOR UPDATE TO authenticated USING (is_instructor_or_admin(auth.uid()) OR is_current_user_admin_or_super_admin());
CREATE POLICY "Instructors and admins can delete lh100 modules" ON public.lh100_modules FOR DELETE TO authenticated USING (is_instructor_or_admin(auth.uid()) OR is_current_user_admin_or_super_admin());

-- 6. lh100_module_resources
DROP POLICY IF EXISTS "Authenticated users can update module resources" ON public.lh100_module_resources;
CREATE POLICY "Instructors and admins can update module resources" ON public.lh100_module_resources FOR UPDATE TO authenticated USING (is_instructor_or_admin(auth.uid()) OR is_current_user_admin_or_super_admin());

-- 7. tour_budget_items
DROP POLICY IF EXISTS "Authenticated users can delete tour budget items" ON public.tour_budget_items;
DROP POLICY IF EXISTS "Authenticated users can insert tour budget items" ON public.tour_budget_items;
DROP POLICY IF EXISTS "Authenticated users can update tour budget items" ON public.tour_budget_items;
CREATE POLICY "Admins and exec can insert tour budget items" ON public.tour_budget_items FOR INSERT TO authenticated WITH CHECK (is_current_user_admin_or_super_admin() OR is_executive_board_member_or_admin());
CREATE POLICY "Admins and exec can update tour budget items" ON public.tour_budget_items FOR UPDATE TO authenticated USING (is_current_user_admin_or_super_admin() OR is_executive_board_member_or_admin());
CREATE POLICY "Admins and exec can delete tour budget items" ON public.tour_budget_items FOR DELETE TO authenticated USING (is_current_user_admin_or_super_admin() OR is_executive_board_member_or_admin());

-- 8. tour_budget_revenues
DROP POLICY IF EXISTS "Authenticated users can delete tour budget revenues" ON public.tour_budget_revenues;
DROP POLICY IF EXISTS "Authenticated users can insert tour budget revenues" ON public.tour_budget_revenues;
DROP POLICY IF EXISTS "Authenticated users can update tour budget revenues" ON public.tour_budget_revenues;
CREATE POLICY "Admins and exec can insert tour budget revenues" ON public.tour_budget_revenues FOR INSERT TO authenticated WITH CHECK (is_current_user_admin_or_super_admin() OR is_executive_board_member_or_admin());
CREATE POLICY "Admins and exec can update tour budget revenues" ON public.tour_budget_revenues FOR UPDATE TO authenticated USING (is_current_user_admin_or_super_admin() OR is_executive_board_member_or_admin());
CREATE POLICY "Admins and exec can delete tour budget revenues" ON public.tour_budget_revenues FOR DELETE TO authenticated USING (is_current_user_admin_or_super_admin() OR is_executive_board_member_or_admin());

-- 9. tour_milestones
DROP POLICY IF EXISTS "Authenticated users can delete milestones" ON public.tour_milestones;
DROP POLICY IF EXISTS "Authenticated users can insert milestones" ON public.tour_milestones;
DROP POLICY IF EXISTS "Authenticated users can update milestones" ON public.tour_milestones;
CREATE POLICY "Admins and exec can insert milestones" ON public.tour_milestones FOR INSERT TO authenticated WITH CHECK (is_current_user_admin_or_super_admin() OR is_executive_board_member_or_admin());
CREATE POLICY "Admins and exec can update milestones" ON public.tour_milestones FOR UPDATE TO authenticated USING (is_current_user_admin_or_super_admin() OR is_executive_board_member_or_admin());
CREATE POLICY "Admins and exec can delete milestones" ON public.tour_milestones FOR DELETE TO authenticated USING (is_current_user_admin_or_super_admin() OR is_executive_board_member_or_admin());

-- 10. youtube
DROP POLICY IF EXISTS "Authenticated users can insert youtube channels" ON public.youtube_channels;
DROP POLICY IF EXISTS "Authenticated users can update youtube channels" ON public.youtube_channels;
DROP POLICY IF EXISTS "Youtube channels access" ON public.youtube_channels;
CREATE POLICY "Admins can manage youtube channels" ON public.youtube_channels FOR ALL TO authenticated USING (is_current_user_admin_or_super_admin()) WITH CHECK (is_current_user_admin_or_super_admin());

DROP POLICY IF EXISTS "Authenticated users can delete youtube videos" ON public.youtube_videos;
DROP POLICY IF EXISTS "Authenticated users can insert youtube videos" ON public.youtube_videos;
DROP POLICY IF EXISTS "Authenticated users can update youtube videos" ON public.youtube_videos;
CREATE POLICY "Admins can manage youtube videos" ON public.youtube_videos FOR ALL TO authenticated USING (is_current_user_admin_or_super_admin()) WITH CHECK (is_current_user_admin_or_super_admin());

-- 11. gw_student_profiles
DROP POLICY IF EXISTS "Admins can insert student profiles" ON public.gw_student_profiles;
DROP POLICY IF EXISTS "Admins can update student profiles" ON public.gw_student_profiles;
CREATE POLICY "Admins or self can insert student profiles" ON public.gw_student_profiles FOR INSERT TO authenticated WITH CHECK (is_current_user_admin_or_super_admin() OR auth.uid()::text = user_id::text);
CREATE POLICY "Admins or self can update student profiles" ON public.gw_student_profiles FOR UPDATE TO authenticated USING (is_current_user_admin_or_super_admin() OR auth.uid()::text = user_id::text);

-- 12. meeting_notes
DROP POLICY IF EXISTS "Authenticated users can update meeting notes" ON public.meeting_notes;
CREATE POLICY "Admins and exec can update meeting notes" ON public.meeting_notes FOR UPDATE TO authenticated USING (is_current_user_admin_or_super_admin() OR is_executive_board_member_or_admin());

-- 13. gw_profiles: remove dangerous "Service role bypass"
DROP POLICY IF EXISTS "Service role bypass" ON public.gw_profiles;

-- 14. products
DROP POLICY IF EXISTS "Products access" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products FOR ALL TO authenticated USING (is_current_user_admin_or_super_admin()) WITH CHECK (is_current_user_admin_or_super_admin());
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);

-- 15. gw_tour_risers
DROP POLICY IF EXISTS "Admins and exec can manage risers" ON public.gw_tour_risers;
CREATE POLICY "Admins and exec can manage risers" ON public.gw_tour_risers FOR ALL TO authenticated USING (is_current_user_admin_or_super_admin() OR is_executive_board_member_or_admin()) WITH CHECK (is_current_user_admin_or_super_admin() OR is_executive_board_member_or_admin());
