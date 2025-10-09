
-- Create a policy to allow students to self-register with the student role
-- This is safe because we only allow the 'student' role to be self-assigned
CREATE POLICY "Users can self-register as students"
ON public.user_roles_multi
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND role = 'student'
);

-- Alternatively, create a trigger to automatically assign student role on signup
-- (This is commented out as the policy above is sufficient, but kept for reference)
-- CREATE OR REPLACE FUNCTION public.auto_assign_student_role()
-- RETURNS TRIGGER
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- BEGIN
--   -- Only auto-assign if user doesn't already have roles
--   IF NOT EXISTS (
--     SELECT 1 FROM public.user_roles_multi WHERE user_id = NEW.id
--   ) THEN
--     INSERT INTO public.user_roles_multi (user_id, role)
--     VALUES (NEW.id, 'student');
--   END IF;
--   RETURN NEW;
-- END;
-- $$;

-- CREATE TRIGGER on_auth_user_created_assign_student
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.auto_assign_student_role();
