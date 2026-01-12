-- Add calendar_id to gw_courses to link each course to its own calendar
ALTER TABLE public.gw_courses 
ADD COLUMN IF NOT EXISTS calendar_id uuid REFERENCES public.gw_calendars(id);

-- Create a function to auto-create a calendar for new courses
CREATE OR REPLACE FUNCTION public.create_course_calendar()
RETURNS TRIGGER AS $$
DECLARE
  new_calendar_id uuid;
  calendar_color text;
BEGIN
  -- Generate a color based on course code hash
  calendar_color := CASE (abs(hashtext(COALESCE(NEW.course_code, NEW.code))) % 8)
    WHEN 0 THEN '#3b82f6' -- blue
    WHEN 1 THEN '#10b981' -- green
    WHEN 2 THEN '#f59e0b' -- amber
    WHEN 3 THEN '#ef4444' -- red
    WHEN 4 THEN '#8b5cf6' -- violet
    WHEN 5 THEN '#ec4899' -- pink
    WHEN 6 THEN '#06b6d4' -- cyan
    WHEN 7 THEN '#84cc16' -- lime
    ELSE '#6b7280' -- gray
  END;

  -- Create a calendar for this course
  INSERT INTO public.gw_calendars (name, description, color, is_visible, is_default)
  VALUES (
    COALESCE(NEW.course_code, NEW.code) || ' - ' || NEW.title,
    'Calendar for ' || COALESCE(NEW.course_code, NEW.code) || ': ' || NEW.title,
    calendar_color,
    true,
    false
  )
  RETURNING id INTO new_calendar_id;

  -- Update the course with the calendar_id
  NEW.calendar_id := new_calendar_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new courses
DROP TRIGGER IF EXISTS create_course_calendar_trigger ON public.gw_courses;
CREATE TRIGGER create_course_calendar_trigger
  BEFORE INSERT ON public.gw_courses
  FOR EACH ROW
  WHEN (NEW.calendar_id IS NULL)
  EXECUTE FUNCTION public.create_course_calendar();

-- Create calendars for existing courses that don't have one
DO $$
DECLARE
  course_record RECORD;
  new_calendar_id uuid;
  calendar_color text;
BEGIN
  FOR course_record IN 
    SELECT id, code, course_code, title 
    FROM public.gw_courses 
    WHERE calendar_id IS NULL
  LOOP
    -- Generate color
    calendar_color := CASE (abs(hashtext(COALESCE(course_record.course_code, course_record.code))) % 8)
      WHEN 0 THEN '#3b82f6'
      WHEN 1 THEN '#10b981'
      WHEN 2 THEN '#f59e0b'
      WHEN 3 THEN '#ef4444'
      WHEN 4 THEN '#8b5cf6'
      WHEN 5 THEN '#ec4899'
      WHEN 6 THEN '#06b6d4'
      WHEN 7 THEN '#84cc16'
      ELSE '#6b7280'
    END;

    -- Create calendar
    INSERT INTO public.gw_calendars (name, description, color, is_visible, is_default)
    VALUES (
      COALESCE(course_record.course_code, course_record.code) || ' - ' || course_record.title,
      'Calendar for ' || COALESCE(course_record.course_code, course_record.code) || ': ' || course_record.title,
      calendar_color,
      true,
      false
    )
    RETURNING id INTO new_calendar_id;

    -- Update course
    UPDATE public.gw_courses SET calendar_id = new_calendar_id WHERE id = course_record.id;
  END LOOP;
END $$;

-- Add gw_event_id to course sessions to link them to main calendar events
ALTER TABLE public.gw_course_class_sessions 
ADD COLUMN IF NOT EXISTS gw_event_id uuid REFERENCES public.gw_events(id) ON DELETE SET NULL;