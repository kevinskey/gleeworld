-- Allow users to check in to events (insert their own attendance)
CREATE POLICY "Users can check in to events"
ON public.attendance
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own attendance (e.g., change notes)
CREATE POLICY "Users can update own attendance"
ON public.attendance
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);