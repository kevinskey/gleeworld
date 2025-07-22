-- Add calendar-related columns to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN calendar_controls_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN selected_calendars TEXT[] DEFAULT '{}';