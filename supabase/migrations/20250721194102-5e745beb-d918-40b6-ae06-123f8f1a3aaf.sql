-- Create a function to check for appointment conflicts
CREATE OR REPLACE FUNCTION check_appointment_conflict()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there are any overlapping appointments (excluding cancelled ones)
  IF EXISTS (
    SELECT 1 
    FROM gw_appointments 
    WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND status != 'cancelled'
    AND (
      -- Check for overlap: new appointment starts before existing ends AND new appointment ends after existing starts
      (NEW.appointment_date < (appointment_date + (duration_minutes || ' minutes')::interval) 
       AND (NEW.appointment_date + (NEW.duration_minutes || ' minutes')::interval) > appointment_date)
    )
  ) THEN
    RAISE EXCEPTION 'Appointment conflict: This time slot is already booked. Please select a different time.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent appointment conflicts on insert and update
CREATE TRIGGER prevent_appointment_conflicts
  BEFORE INSERT OR UPDATE ON gw_appointments
  FOR EACH ROW
  EXECUTE FUNCTION check_appointment_conflict();

-- Add comment explaining the trigger
COMMENT ON TRIGGER prevent_appointment_conflicts ON gw_appointments IS 'Prevents overbooking by checking for time conflicts between appointments';