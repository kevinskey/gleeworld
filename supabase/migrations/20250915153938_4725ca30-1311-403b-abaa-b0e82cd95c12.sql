-- Create timesheet system for Glee World workers
CREATE TABLE public.gw_timesheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  weekly_goal TEXT,
  goal_met BOOLEAN,
  goal_evaluation TEXT,
  total_hours_worked NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'submitted', 'approved')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

-- Create time entries table for detailed check-in/check-out tracking
CREATE TABLE public.gw_time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  timesheet_id UUID NOT NULL REFERENCES public.gw_timesheets(id) ON DELETE CASCADE,
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out_time TIMESTAMP WITH TIME ZONE,
  break_duration_minutes INTEGER DEFAULT 0,
  notes TEXT,
  total_hours NUMERIC(4,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_time_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for timesheets
CREATE POLICY "Users can view their own timesheets"
ON public.gw_timesheets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own timesheets"
ON public.gw_timesheets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own active timesheets"
ON public.gw_timesheets
FOR UPDATE
USING (auth.uid() = user_id AND status = 'active');

CREATE POLICY "Admins can view all timesheets"
ON public.gw_timesheets
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles
  WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
));

-- RLS Policies for time entries
CREATE POLICY "Users can view their own time entries"
ON public.gw_time_entries
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own time entries"
ON public.gw_time_entries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time entries"
ON public.gw_time_entries
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all time entries"
ON public.gw_time_entries
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles
  WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
));

-- Create function to calculate total hours for a time entry
CREATE OR REPLACE FUNCTION calculate_time_entry_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.check_out_time IS NOT NULL THEN
    NEW.total_hours = EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600.0 - (COALESCE(NEW.break_duration_minutes, 0) / 60.0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic hours calculation
CREATE TRIGGER calculate_hours_trigger
BEFORE INSERT OR UPDATE ON public.gw_time_entries
FOR EACH ROW
EXECUTE FUNCTION calculate_time_entry_hours();

-- Create function to update timesheet total hours
CREATE OR REPLACE FUNCTION update_timesheet_total_hours()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.gw_timesheets
  SET total_hours_worked = (
    SELECT COALESCE(SUM(total_hours), 0)
    FROM public.gw_time_entries
    WHERE timesheet_id = COALESCE(NEW.timesheet_id, OLD.timesheet_id)
    AND check_out_time IS NOT NULL
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.timesheet_id, OLD.timesheet_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timesheet hours when time entries change
CREATE TRIGGER update_timesheet_hours_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.gw_time_entries
FOR EACH ROW
EXECUTE FUNCTION update_timesheet_total_hours();

-- Create function to get current week timesheet
CREATE OR REPLACE FUNCTION get_current_week_dates()
RETURNS TABLE(week_start DATE, week_end DATE) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::integer)::DATE as week_start,
    (CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::integer + 6)::DATE as week_end;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_timesheets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers
CREATE TRIGGER update_timesheets_updated_at_trigger
BEFORE UPDATE ON public.gw_timesheets
FOR EACH ROW
EXECUTE FUNCTION update_timesheets_updated_at();

CREATE TRIGGER update_time_entries_updated_at_trigger
BEFORE UPDATE ON public.gw_time_entries
FOR EACH ROW
EXECUTE FUNCTION update_timesheets_updated_at();