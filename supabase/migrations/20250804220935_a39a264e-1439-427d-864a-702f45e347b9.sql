-- Fix security issues by updating functions with proper search path settings
CREATE OR REPLACE FUNCTION public.assign_auditioner_role()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  -- Update the user's profile to have auditioner role when they submit an audition application
  UPDATE public.gw_profiles 
  SET role = 'auditioner'
  WHERE user_id = NEW.user_id 
  AND role IN ('fan', 'user'); -- Only update if they're currently fan or user, preserve existing roles like admin
  
  RETURN NEW;
END;
$$;

-- Update the other function with proper search path
CREATE OR REPLACE FUNCTION public.update_role_on_audition_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
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
$$;