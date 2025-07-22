-- Update all Spelman calendar events with the Spelman logo
UPDATE public.gw_events 
SET image_url = '/src/assets/spelman-logo.png'
WHERE calendar_id = (SELECT id FROM public.gw_calendars WHERE name = 'Spelman')
AND image_url IS NULL;