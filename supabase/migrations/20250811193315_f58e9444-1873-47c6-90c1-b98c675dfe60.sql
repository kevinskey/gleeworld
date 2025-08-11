-- Remove all existing appointment types
UPDATE public.gw_appointment_types 
SET is_active = false;

-- Check if Office Hour exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.gw_appointment_types WHERE name = 'Office Hour') THEN
    INSERT INTO public.gw_appointment_types (name, description, default_duration_minutes, color, is_active)
    VALUES ('Office Hour', 'One-on-one consultation session', 30, '#3B82F6', true);
  ELSE
    -- Update existing Office Hour to be active
    UPDATE public.gw_appointment_types 
    SET is_active = true,
        description = 'One-on-one consultation session',
        default_duration_minutes = 30,
        color = '#3B82F6'
    WHERE name = 'Office Hour';
  END IF;
END $$;