-- Create the KPI helper functions for First-Year reporting
-- These functions provide aggregated statistics for cohort reporting

CREATE OR REPLACE FUNCTION public.kpi_first_year_weekly(
  cohort_param UUID, 
  week_start_param TIMESTAMPTZ, 
  week_end_param TIMESTAMPTZ
)
RETURNS TABLE(
  total integer, 
  present integer, 
  late integer, 
  excused integer, 
  absent integer, 
  attendance_pct numeric
) 
LANGUAGE sql 
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COUNT(*)::integer AS total,
    COUNT(*) FILTER (WHERE status='present')::integer AS present,
    COUNT(*) FILTER (WHERE status='late')::integer AS late,
    COUNT(*) FILTER (WHERE status='excused')::integer AS excused,
    COUNT(*) FILTER (WHERE status='absent')::integer AS absent,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE status IN ('present','late')) / 
      NULLIF(COUNT(*),0), 1
    ) AS attendance_pct
  FROM public.v_cohort_attendance
  WHERE cohort_id = cohort_param 
    AND starts_at >= week_start_param 
    AND starts_at < week_end_param;
$$;

CREATE OR REPLACE FUNCTION public.kpi_first_year_vs_overall(
  cohort_param UUID, 
  range_start_param TIMESTAMPTZ, 
  range_end_param TIMESTAMPTZ
)
RETURNS TABLE(
  cohort_pct numeric, 
  overall_pct numeric
) 
LANGUAGE sql 
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH cohort_stats AS (
    SELECT ROUND(
      100.0 * COUNT(*) FILTER (WHERE status IN ('present','late')) / 
      NULLIF(COUNT(*),0), 1
    ) AS pct
    FROM public.v_cohort_attendance
    WHERE cohort_id = cohort_param 
      AND starts_at >= range_start_param 
      AND starts_at < range_end_param
  ),
  overall_stats AS (
    SELECT ROUND(
      100.0 * COUNT(*) FILTER (WHERE status IN ('present','late')) / 
      NULLIF(COUNT(*),0), 1
    ) AS pct
    FROM public.attendance a 
    JOIN public.events e ON e.id = a.event_id
    WHERE e.start_date >= range_start_param 
      AND e.start_date < range_end_param
  )
  SELECT 
    (SELECT pct FROM cohort_stats) AS cohort_pct, 
    (SELECT pct FROM overall_stats) AS overall_pct;
$$;

-- Create indexes for better performance on reporting queries
CREATE INDEX IF NOT EXISTS idx_v_cohort_attendance_cohort_date 
ON public.v_cohort_attendance(cohort_id, starts_at);

-- Add indexes to the real tables for the view performance
CREATE INDEX IF NOT EXISTS idx_events_start_date_cohort 
ON public.events(start_date, cohort_id) WHERE cohort_id IS NOT NULL;

-- Create a function to get cohort summary statistics
CREATE OR REPLACE FUNCTION public.get_cohort_summary_stats(cohort_param UUID)
RETURNS TABLE(
  total_students integer,
  total_events integer,
  avg_attendance_rate numeric,
  last_event_date timestamptz,
  active_voice_parts text[]
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    (SELECT COUNT(*)::integer FROM public.cohort_members WHERE cohort_id = cohort_param AND status = 'active') as total_students,
    (SELECT COUNT(*)::integer FROM public.events WHERE cohort_id = cohort_param) as total_events,
    (SELECT ROUND(AVG(
      CASE WHEN total_attendance > 0 
      THEN (present_count + late_count) * 100.0 / total_attendance 
      ELSE 0 END
    ), 1) FROM (
      SELECT 
        COUNT(*) as total_attendance,
        COUNT(*) FILTER (WHERE status = 'present') as present_count,
        COUNT(*) FILTER (WHERE status = 'late') as late_count
      FROM public.v_cohort_attendance 
      WHERE cohort_id = cohort_param
      GROUP BY event_id
    ) event_stats) as avg_attendance_rate,
    (SELECT MAX(start_date) FROM public.events WHERE cohort_id = cohort_param) as last_event_date,
    (SELECT ARRAY_AGG(DISTINCT voice_part) FROM public.cohort_members 
     WHERE cohort_id = cohort_param AND voice_part IS NOT NULL AND status = 'active') as active_voice_parts;
$$;