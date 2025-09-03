-- Check if RLS is enabled and create policies for sight reading assignments
DO $$
BEGIN
    -- Enable RLS if not already enabled
    ALTER TABLE public.gw_sight_reading_assignments ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN others THEN
        NULL; -- Table might already have RLS enabled
END $$;

-- Create policies for sight reading assignments
CREATE POLICY "Admins can manage all sight reading assignments"
ON public.gw_sight_reading_assignments
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
    )
);

CREATE POLICY "Student conductors can manage assignments"
ON public.gw_sight_reading_assignments
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (exec_board_role = 'student_conductor' OR is_section_leader = true)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (exec_board_role = 'student_conductor' OR is_section_leader = true)
    )
);

CREATE POLICY "Members can view active assignments"
ON public.gw_sight_reading_assignments
FOR SELECT
TO authenticated
USING (
    is_active = true 
    AND (
        target_type = 'all_members' 
        OR (
            target_type = 'voice_part' 
            AND target_value = (
                SELECT voice_part FROM public.gw_profiles 
                WHERE user_id = auth.uid()
            )
        )
    )
);

CREATE POLICY "Users can view assignments they created"
ON public.gw_sight_reading_assignments
FOR SELECT
TO authenticated
USING (assigned_by = auth.uid());