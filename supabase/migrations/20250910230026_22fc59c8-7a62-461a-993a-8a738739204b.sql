-- Drop the restrictive insert policy and create a more permissive one
DROP POLICY "appointments_insert_control" ON public.gw_appointments;

-- Create a new policy that allows public booking
CREATE POLICY "appointments_insert_public_booking" ON public.gw_appointments
  FOR INSERT 
  WITH CHECK (
    -- Allow public bookings (when no user is authenticated)
    auth.uid() IS NULL OR 
    -- Allow authenticated users to create appointments
    created_by = auth.uid() OR 
    -- Allow null created_by for public bookings
    created_by IS NULL
  );

-- Also update the existing policies that were created earlier to avoid conflicts
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.gw_appointments;
DROP POLICY IF EXISTS "Users can view appointments they created" ON public.gw_appointments;
DROP POLICY IF EXISTS "Admins can manage all appointments" ON public.gw_appointments;
DROP POLICY IF EXISTS "Providers can view their appointments" ON public.gw_appointments;