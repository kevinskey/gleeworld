import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StudentScheduleWithProfile {
  id: string;
  user_id: string;
  semester: string;
  course_name: string;
  course_code: string | null;
  days: string[];
  start_time: string;
  end_time: string;
  location: string | null;
  instructor_name: string | null;
  notes: string | null;
  has_conflict: boolean;
  conflict_details: string | null;
  created_at: string;
  updated_at: string;
  // Profile fields
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  voice_part: string | null;
  avatar_url: string | null;
  class_year: number | null;
}

export interface StudentSummary {
  user_id: string;
  full_name: string | null;
  email: string | null;
  voice_part: string | null;
  avatar_url: string | null;
  class_year: number | null;
  total_classes: number;
  conflict_count: number;
  schedules: StudentScheduleWithProfile[];
}

export const useAllStudentSchedules = (semester: string = 'Spring 2026') => {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<StudentScheduleWithProfile[]>([]);
  const [studentSummaries, setStudentSummaries] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalConflicts, setTotalConflicts] = useState(0);

  const fetchAllSchedules = async () => {
    try {
      setLoading(true);
      
      // Fetch schedules with profile data using a join
      const { data, error } = await supabase
        .from('student_class_schedules')
        .select(`
          *,
          gw_profiles!inner(
            full_name,
            first_name,
            last_name,
            email,
            voice_part,
            avatar_url,
            class_year
          )
        `)
        .eq('semester', semester)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data
      const transformedData: StudentScheduleWithProfile[] = (data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        semester: item.semester,
        course_name: item.course_name,
        course_code: item.course_code,
        days: item.days,
        start_time: item.start_time,
        end_time: item.end_time,
        location: item.location,
        instructor_name: item.instructor_name,
        notes: item.notes,
        has_conflict: item.has_conflict,
        conflict_details: item.conflict_details,
        created_at: item.created_at,
        updated_at: item.updated_at,
        full_name: item.gw_profiles?.full_name,
        first_name: item.gw_profiles?.first_name,
        last_name: item.gw_profiles?.last_name,
        email: item.gw_profiles?.email,
        voice_part: item.gw_profiles?.voice_part,
        avatar_url: item.gw_profiles?.avatar_url,
        class_year: item.gw_profiles?.class_year,
      }));

      setSchedules(transformedData);

      // Group by student
      const studentMap = new Map<string, StudentSummary>();
      transformedData.forEach((schedule) => {
        const existing = studentMap.get(schedule.user_id);
        if (existing) {
          existing.total_classes++;
          if (schedule.has_conflict) existing.conflict_count++;
          existing.schedules.push(schedule);
        } else {
          studentMap.set(schedule.user_id, {
            user_id: schedule.user_id,
            full_name: schedule.full_name,
            email: schedule.email,
            voice_part: schedule.voice_part,
            avatar_url: schedule.avatar_url,
            class_year: schedule.class_year,
            total_classes: 1,
            conflict_count: schedule.has_conflict ? 1 : 0,
            schedules: [schedule],
          });
        }
      });

      const summaries = Array.from(studentMap.values()).sort((a, b) => 
        // Sort by conflict count (descending), then by name
        b.conflict_count - a.conflict_count || 
        (a.full_name || '').localeCompare(b.full_name || '')
      );

      setStudentSummaries(summaries);
      setTotalConflicts(transformedData.filter(s => s.has_conflict).length);
    } catch (error) {
      console.error('Error fetching all student schedules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load student schedules',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSchedules();
  }, [semester]);

  return {
    schedules,
    studentSummaries,
    loading,
    totalConflicts,
    refetch: fetchAllSchedules,
    studentsWithConflicts: studentSummaries.filter(s => s.conflict_count > 0),
    studentsWithoutConflicts: studentSummaries.filter(s => s.conflict_count === 0),
  };
};
