-- Enable users to delete their own notifications
-- Check if delete policy already exists for gw_notifications table
DO $$
BEGIN
  -- Only create the policy if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'gw_notifications' 
    AND policyname = 'Users can delete their own notifications'
  ) THEN
    -- Create policy to allow users to delete their own notifications
    CREATE POLICY "Users can delete their own notifications"
    ON public.gw_notifications
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;