-- Add DELETE policy for gw_audition_logs table
-- Executive board members and admins should be able to delete audition logs

CREATE POLICY "Executive board members can delete audition logs" 
ON public.gw_audition_logs 
FOR DELETE 
USING (is_executive_board_member_or_admin());