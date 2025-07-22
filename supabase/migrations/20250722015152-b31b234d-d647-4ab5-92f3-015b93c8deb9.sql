-- Create user preferences table for calendar controls
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  calendar_controls_enabled BOOLEAN NOT NULL DEFAULT true,
  selected_calendars TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own preferences" 
ON public.user_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences" 
ON public.user_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON public.user_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all preferences" 
ON public.user_preferences 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = ANY(ARRAY['admin', 'super-admin'])
));

CREATE POLICY "Super admins can update calendar controls" 
ON public.user_preferences 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'super-admin'
));

-- Create trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();