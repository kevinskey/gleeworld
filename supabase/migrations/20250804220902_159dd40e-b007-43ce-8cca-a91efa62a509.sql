-- Add "auditioner" as a valid role in the system
-- First, let's check if there are any role constraints and update the audition application process

-- Update any existing role check constraints to include 'auditioner'
-- Since we don't have an enum, we'll add logic to handle the auditioner role

-- Create a function to automatically assign auditioner role when someone applies
CREATE OR REPLACE FUNCTION public.assign_auditioner_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user's profile to have auditioner role when they submit an audition application
  UPDATE public.gw_profiles 
  SET role = 'auditioner'
  WHERE user_id = NEW.user_id 
  AND role IN ('fan', 'user'); -- Only update if they're currently fan or user, preserve existing roles like admin
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically assign auditioner role when application is created
DROP TRIGGER IF EXISTS assign_auditioner_role_trigger ON public.gw_auditions;
CREATE TRIGGER assign_auditioner_role_trigger
  AFTER INSERT ON public.gw_auditions
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_auditioner_role();

-- Create a function to update role based on audition status
CREATE OR REPLACE FUNCTION public.update_role_on_audition_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If audition is accepted, change role to member
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    UPDATE public.gw_profiles 
    SET role = 'member'
    WHERE user_id = NEW.user_id;
  END IF;
  
  -- If audition is rejected, change role back to fan
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    UPDATE public.gw_profiles 
    SET role = 'fan'
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update role when audition status changes
DROP TRIGGER IF EXISTS update_role_on_status_change_trigger ON public.gw_auditions;
CREATE TRIGGER update_role_on_status_change_trigger
  AFTER UPDATE ON public.gw_auditions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.update_role_on_audition_status_change();