-- Create class schedules table for storing user class information
CREATE TABLE public.gw_class_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_number TEXT NOT NULL,
  class_name TEXT NOT NULL,
  days_of_week TEXT[] NOT NULL, -- Array of day abbreviations like ['M', 'W', 'F']
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  semester TEXT NOT NULL DEFAULT 'current',
  academic_year TEXT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::TEXT,
  room_location TEXT,
  professor_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.gw_class_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own class schedules"
  ON public.gw_class_schedules
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own class schedules"
  ON public.gw_class_schedules
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own class schedules"
  ON public.gw_class_schedules
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own class schedules"
  ON public.gw_class_schedules
  FOR DELETE
  USING (auth.uid() = user_id);

-- Allow admins and section leaders to view all schedules for planning purposes
CREATE POLICY "Admins and section leaders can view all schedules"
  ON public.gw_class_schedules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true OR role IN ('executive', 'section_leader'))
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_gw_class_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_gw_class_schedules_updated_at
  BEFORE UPDATE ON public.gw_class_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gw_class_schedules_updated_at();

-- Create index for performance
CREATE INDEX idx_gw_class_schedules_user_id ON public.gw_class_schedules(user_id);
CREATE INDEX idx_gw_class_schedules_days ON public.gw_class_schedules USING GIN(days_of_week);
CREATE INDEX idx_gw_class_schedules_times ON public.gw_class_schedules(start_time, end_time);