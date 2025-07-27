-- First, let's check the current events structure and add privacy controls

-- Add is_private column to events table if it doesn't exist
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Add is_private column to gw_events table if it doesn't exist  
ALTER TABLE public.gw_events 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Update all existing Spelman events to be private
UPDATE public.events 
SET is_private = true 
WHERE title ILIKE '%spelman%' 
   OR title ILIKE '%glee club%'
   OR title ILIKE '%rehearsal%'
   OR description ILIKE '%spelman%'
   OR description ILIKE '%glee club%';

UPDATE public.gw_events 
SET is_private = true 
WHERE title ILIKE '%spelman%' 
   OR title ILIKE '%glee club%'
   OR title ILIKE '%rehearsal%'
   OR description ILIKE '%spelman%'
   OR description ILIKE '%glee club%';

-- Enable RLS on events table if not already enabled
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Enable RLS on gw_events table if not already enabled  
ALTER TABLE public.gw_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON public.events;
DROP POLICY IF EXISTS "Private events viewable by members and admins" ON public.events;
DROP POLICY IF EXISTS "Members and admins can view all events" ON public.events;
DROP POLICY IF EXISTS "Event creators can manage events" ON public.events;
DROP POLICY IF EXISTS "Admins can manage all events" ON public.events;

-- Create RLS policies for events table
CREATE POLICY "Public events are viewable by everyone" 
ON public.events 
FOR SELECT 
USING (is_private = false OR is_private IS NULL);

CREATE POLICY "Private events viewable by members and admins" 
ON public.events 
FOR SELECT 
USING (
  is_private = true 
  AND (
    -- Allow admins and super admins
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
    OR
    -- Allow members (including alumnae, executives, etc.)
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('member', 'alumna', 'executive', 'admin', 'super-admin')
    )
  )
);

CREATE POLICY "Event creators can manage their events" 
ON public.events 
FOR ALL 
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can manage all events" 
ON public.events 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Drop existing policies for gw_events to recreate them
DROP POLICY IF EXISTS "Public gw_events are viewable by everyone" ON public.gw_events;
DROP POLICY IF EXISTS "Private gw_events viewable by members and admins" ON public.gw_events;
DROP POLICY IF EXISTS "Members and admins can view all gw_events" ON public.gw_events;
DROP POLICY IF EXISTS "Event creators can manage gw_events" ON public.gw_events;
DROP POLICY IF EXISTS "Admins can manage all gw_events" ON public.gw_events;

-- Create RLS policies for gw_events table
CREATE POLICY "Public gw_events are viewable by everyone" 
ON public.gw_events 
FOR SELECT 
USING (is_private = false OR is_private IS NULL);

CREATE POLICY "Private gw_events viewable by members and admins" 
ON public.gw_events 
FOR SELECT 
USING (
  is_private = true 
  AND (
    -- Allow admins and super admins
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
    OR
    -- Allow members (including alumnae, executives, etc.)
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('member', 'alumna', 'executive', 'admin', 'super-admin')
    )
  )
);

CREATE POLICY "Event creators can manage their gw_events" 
ON public.gw_events 
FOR ALL 
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can manage all gw_events" 
ON public.gw_events 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Update the sync function to handle the is_private field
CREATE OR REPLACE FUNCTION public.sync_gw_event_to_events()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- When a gw_event is created or updated, sync to events table
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO events (
      id,
      title,
      description,
      event_type,
      start_date,
      end_date,
      location,
      created_by,
      created_at,
      updated_at,
      send_contracts,
      event_name,
      expected_headcount,
      approval_needed,
      approved,
      image_url,
      is_private
    ) VALUES (
      NEW.id,
      NEW.title,
      NEW.description,
      COALESCE(NEW.event_type, 'other'),
      NEW.start_date,
      NEW.end_date,
      COALESCE(NEW.location, NEW.venue_name),
      NEW.created_by,
      NEW.created_at,
      NEW.updated_at,
      false,
      NEW.venue_name,
      NEW.max_attendees,
      COALESCE(NEW.registration_required, false),
      CASE WHEN NEW.status = 'confirmed' THEN true ELSE false END,
      NEW.image_url,
      COALESCE(NEW.is_private, false)
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      event_type = EXCLUDED.event_type,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      location = EXCLUDED.location,
      updated_at = EXCLUDED.updated_at,
      event_name = EXCLUDED.event_name,
      expected_headcount = EXCLUDED.expected_headcount,
      approval_needed = EXCLUDED.approval_needed,
      approved = EXCLUDED.approved,
      image_url = EXCLUDED.image_url,
      is_private = EXCLUDED.is_private;
    RETURN NEW;
  END IF;
  
  -- When a gw_event is deleted, also delete from events table
  IF TG_OP = 'DELETE' THEN
    DELETE FROM events WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;