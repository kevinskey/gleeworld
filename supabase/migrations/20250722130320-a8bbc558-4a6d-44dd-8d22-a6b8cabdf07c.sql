-- Add RLS policy to allow admins and super-admins to update all events
CREATE POLICY "Admins can update all events" 
ON public.events 
FOR UPDATE 
USING (EXISTS ( 
  SELECT 1
  FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super-admin'::text])))
));