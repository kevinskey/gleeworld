-- Update the status check constraint to include 'returned' status
ALTER TABLE excuse_requests 
DROP CONSTRAINT IF EXISTS excuse_requests_status_check;

ALTER TABLE excuse_requests 
ADD CONSTRAINT excuse_requests_status_check 
CHECK (status IN ('pending', 'returned', 'forwarded', 'approved', 'denied'));

-- Update the excuse request history trigger function to handle returned status
CREATE OR REPLACE FUNCTION public.log_excuse_request_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status != NEW.status THEN
    INSERT INTO public.excuse_request_history (
      excuse_request_id,
      status,
      changed_by,
      notes
    ) VALUES (
      NEW.id,
      NEW.status,
      auth.uid(),
      CASE 
        WHEN NEW.status = 'returned' THEN COALESCE(NEW.secretary_message, 'Request returned to student')
        WHEN NEW.status = 'forwarded' THEN 'Request forwarded to director'
        WHEN NEW.status = 'approved' THEN COALESCE(NEW.admin_notes, 'Request approved')
        WHEN NEW.status = 'denied' THEN COALESCE(NEW.admin_notes, 'Request denied')
        ELSE 'Status updated'
      END
    );
  END IF;
  RETURN NEW;
END;
$$;