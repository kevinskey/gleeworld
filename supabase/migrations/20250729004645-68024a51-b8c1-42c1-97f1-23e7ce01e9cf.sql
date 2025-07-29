-- Fix meeting minutes RLS policies to ensure they work properly
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Executive board members can view all meeting minutes" ON public.gw_meeting_minutes;
DROP POLICY IF EXISTS "Executive board members can view meeting minutes" ON public.gw_meeting_minutes;
DROP POLICY IF EXISTS "Executive board members can create meeting minutes" ON public.gw_meeting_minutes;
DROP POLICY IF EXISTS "Executive board members can update meeting minutes" ON public.gw_meeting_minutes;
DROP POLICY IF EXISTS "Executive board members can delete meeting minutes" ON public.gw_meeting_minutes;

-- Create simple, non-recursive policies for gw_meeting_minutes
CREATE POLICY "meeting_minutes_select" ON public.gw_meeting_minutes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_executive_board_members 
      WHERE user_id = auth.uid() AND is_active = true
    ) OR
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "meeting_minutes_insert" ON public.gw_meeting_minutes
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND (
      EXISTS (
        SELECT 1 FROM public.gw_executive_board_members 
        WHERE user_id = auth.uid() AND is_active = true
      ) OR
      EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
      )
    )
  );

CREATE POLICY "meeting_minutes_update" ON public.gw_meeting_minutes
  FOR UPDATE USING (
    (created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
      )
    ) AND (
      EXISTS (
        SELECT 1 FROM public.gw_executive_board_members 
        WHERE user_id = auth.uid() AND is_active = true
      ) OR
      EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
      )
    )
  );

CREATE POLICY "meeting_minutes_delete" ON public.gw_meeting_minutes
  FOR DELETE USING (
    (created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
      )
    ) AND (
      EXISTS (
        SELECT 1 FROM public.gw_executive_board_members 
        WHERE user_id = auth.uid() AND is_active = true
      ) OR
      EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
      )
    )
  );