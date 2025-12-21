import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ACADEMY_COURSES } from '@/config/academyCourses';

export interface CourseAttendanceRecord {
  id: string;
  course_id: string;
  attendance_date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

export interface CourseAttendanceStats {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
  records: CourseAttendanceRecord[];
}

export interface EnrolledCourse {
  id: string;
  courseCode: string;
  title: string;
}

const ATTENDANCE_THRESHOLD = 80; // Percentage threshold for low attendance alert

export const useAcademyAttendance = () => {
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [courseStats, setCourseStats] = useState<Map<string, CourseAttendanceStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchEnrolledCourses = async () => {
    if (!user) return [];

    try {
      // Check profile for role-based enrollment (MUS 070 - Glee Club)
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('role, is_admin, is_super_admin')
        .eq('user_id', user.id)
        .single();

      const courses: EnrolledCourse[] = [];

      // Auto-enroll members in MUS 070
      if (profile?.role === 'member' || profile?.is_admin || profile?.is_super_admin) {
        const mus070 = ACADEMY_COURSES.find(c => c.courseCode === 'MUS 070');
        if (mus070) {
          courses.push({
            id: mus070.id,
            courseCode: mus070.courseCode,
            title: mus070.title
          });
        }
      }

      // Get explicit enrollments from gw_course_enrollments
      const { data: enrollments } = await supabase
        .from('gw_course_enrollments')
        .select('course_id')
        .eq('user_id', user.id)
        .eq('enrollment_status', 'enrolled');

      if (enrollments) {
        for (const enrollment of enrollments) {
          const course = ACADEMY_COURSES.find(c => c.id === enrollment.course_id);
          if (course && !courses.find(c => c.id === course.id)) {
            courses.push({
              id: course.id,
              courseCode: course.courseCode,
              title: course.title
            });
          }
        }
      }

      // Check MUS 240 special enrollment
      const { data: mus240Enrollment } = await supabase
        .from('mus240_enrollments')
        .select('*')
        .eq('student_id', user.id)
        .eq('enrollment_status', 'enrolled')
        .maybeSingle();

      if (mus240Enrollment) {
        const mus240 = ACADEMY_COURSES.find(c => c.courseCode === 'MUS 240');
        if (mus240 && !courses.find(c => c.id === mus240.id)) {
          courses.push({
            id: mus240.id,
            courseCode: mus240.courseCode,
            title: mus240.title
          });
        }
      }

      return courses;
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      return [];
    }
  };

  const fetchAttendanceForCourse = async (courseId: string): Promise<CourseAttendanceRecord[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('gw_course_attendance')
        .select('id, course_id, attendance_date, status, notes')
        .eq('course_id', courseId)
        .eq('student_id', user.id)
        .order('attendance_date', { ascending: false });

      if (error) throw error;
      return (data || []) as CourseAttendanceRecord[];
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return [];
    }
  };

  const calculateStats = (records: CourseAttendanceRecord[], course: EnrolledCourse): CourseAttendanceStats => {
    const stats = { present: 0, absent: 0, late: 0, excused: 0 };
    
    records.forEach(record => {
      if (record.status in stats) {
        stats[record.status as keyof typeof stats]++;
      }
    });

    const total = stats.present + stats.absent + stats.late + stats.excused;
    const attendanceRate = total > 0 ? Math.round(((stats.present + stats.late) / total) * 100) : 100;

    return {
      courseId: course.id,
      courseCode: course.courseCode,
      courseTitle: course.title,
      total,
      ...stats,
      attendanceRate,
      records
    };
  };

  const fetchAllAttendance = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const courses = await fetchEnrolledCourses();
      setEnrolledCourses(courses);

      if (courses.length > 0 && !selectedCourseId) {
        setSelectedCourseId(courses[0].id);
      }

      const statsMap = new Map<string, CourseAttendanceStats>();

      for (const course of courses) {
        const records = await fetchAttendanceForCourse(course.id);
        const stats = calculateStats(records, course);
        statsMap.set(course.id, stats);
      }

      setCourseStats(statsMap);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast({
        title: "Error",
        description: "Failed to load attendance records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getOverallStats = () => {
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalExcused = 0;
    let totalRecords = 0;

    courseStats.forEach(stats => {
      totalPresent += stats.present;
      totalAbsent += stats.absent;
      totalLate += stats.late;
      totalExcused += stats.excused;
      totalRecords += stats.total;
    });

    const overallRate = totalRecords > 0 
      ? Math.round(((totalPresent + totalLate) / totalRecords) * 100) 
      : 100;

    return {
      totalPresent,
      totalAbsent,
      totalLate,
      totalExcused,
      totalRecords,
      overallRate
    };
  };

  const getLowAttendanceCourses = () => {
    const lowCourses: CourseAttendanceStats[] = [];
    courseStats.forEach(stats => {
      if (stats.total > 0 && stats.attendanceRate < ATTENDANCE_THRESHOLD) {
        lowCourses.push(stats);
      }
    });
    return lowCourses;
  };

  const getAttendanceByDate = (): Map<string, { status: string; courseCode: string }[]> => {
    const dateMap = new Map<string, { status: string; courseCode: string }[]>();
    
    courseStats.forEach(stats => {
      stats.records.forEach(record => {
        const dateKey = record.attendance_date;
        const existing = dateMap.get(dateKey) || [];
        existing.push({ status: record.status, courseCode: stats.courseCode });
        dateMap.set(dateKey, existing);
      });
    });

    return dateMap;
  };

  useEffect(() => {
    fetchAllAttendance();
  }, [user]);

  return {
    enrolledCourses,
    courseStats,
    loading,
    selectedCourseId,
    setSelectedCourseId,
    getOverallStats,
    getLowAttendanceCourses,
    getAttendanceByDate,
    refetch: fetchAllAttendance,
    ATTENDANCE_THRESHOLD
  };
};
