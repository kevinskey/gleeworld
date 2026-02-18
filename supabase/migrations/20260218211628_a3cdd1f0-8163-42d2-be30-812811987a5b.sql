-- Grant update permission on gw_course_attendance_summary so we can reset attendance
-- Then reset all students to perfect attendance
UPDATE public.gw_course_attendance_summary 
SET unexcused_rehearsal_absences = 0, 
    unexcused_performance_absences = 0, 
    tardies = 0, 
    is_dropped = false 
WHERE course_id = 'a0000000-0000-0000-0000-000000000070';
