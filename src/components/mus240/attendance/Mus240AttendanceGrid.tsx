import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Search, Download, RefreshCw, Save, 
  Check, X, Clock, AlertCircle, Minus, Users, Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, startOfWeek, differenceInWeeks, addWeeks } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useMus240SemesterSafe } from '@/contexts/Mus240SemesterContext';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { AttendanceMobileCards } from '@/components/course/AttendanceMobileCards';

const MUS240_COURSE_ID = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37';

// Spring 2026 semester start (first day of classes)
const SEMESTER_START = new Date('2026-01-14');

interface StudentAttendance {
  student_id: string;
  student_name: string;
  records: Map<string, 'present' | 'absent' | 'excused' | 'late' | null>;
  totals: {
    present: number;
    absent: number;
    excused: number;
    late: number;
    rate: number;
  };
}

interface ClassSession {
  id: string;
  date: string;
  title: string;
  week_number: number;
}

interface Mus240AttendanceGridProps {
  isInstructor?: boolean;
  studentId?: string; // If provided, only show this student's attendance
}

const STATUS_OPTIONS = [
  { value: 'present', label: 'P', icon: Check, color: 'bg-green-200 text-green-900 border border-green-400 dark:bg-green-900/50 dark:text-green-200 dark:border-green-600' },
  { value: 'absent', label: 'A', icon: X, color: 'bg-red-200 text-red-900 border border-red-400 dark:bg-red-900/50 dark:text-red-200 dark:border-red-600' },
  { value: 'excused', label: 'E', icon: AlertCircle, color: 'bg-blue-200 text-blue-900 border border-blue-400 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-600' },
  { value: 'late', label: 'L', icon: Clock, color: 'bg-amber-200 text-amber-900 border border-amber-400 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-600' },
  { value: null, label: '-', icon: Minus, color: 'bg-slate-100 text-slate-500 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600' },
] as const;

export const Mus240AttendanceGrid: React.FC<Mus240AttendanceGridProps> = ({ 
  isInstructor = false,
  studentId 
}) => {
  const { user } = useAuth();
  const { currentSemester } = useMus240SemesterSafe();
  const isMobile = useIsMobile();
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dirtyRecords, setDirtyRecords] = useState<Map<string, string>>(new Map());

  const targetStudentId = studentId || user?.id;

  const getWeekNumber = (dateStr: string): number => {
    const date = parseISO(dateStr);
    return differenceInWeeks(date, SEMESTER_START) + 1;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch class sessions (gw_attendance_sessions for MUS240)
      const { data: sessionData, error: sessionError } = await supabase
        .from('gw_attendance_sessions')
        .select('id, title, opens_at')
        .eq('course_id', MUS240_COURSE_ID)
        .order('opens_at', { ascending: true });

      if (sessionError) throw sessionError;

      const sessionList: ClassSession[] = (sessionData || []).map(s => ({
        id: s.id,
        date: s.opens_at,
        title: s.title || 'Class',
        week_number: getWeekNumber(s.opens_at)
      }));
      setSessions(sessionList);

      // Fetch enrolled students from gw_course_enrollments (unified source of truth)
      let studentQuery = supabase
        .from('gw_course_enrollments')
        .select('user_id')
        .eq('course_id', MUS240_COURSE_ID)
        .eq('semester', currentSemester)
        .eq('enrollment_status', 'enrolled');

      // If not instructor, only fetch current user
      if (!isInstructor && targetStudentId) {
        studentQuery = studentQuery.eq('user_id', targetStudentId);
      }

      const { data: enrollments, error: enrollError } = await studentQuery;
      if (enrollError) throw enrollError;

      const studentIds = [...new Set((enrollments || []).map(e => e.user_id).filter(Boolean))];
      
      if (studentIds.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Fetch student profiles
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name')
        .in('user_id', studentIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name || 'Unknown']));

      // Fetch attendance records from the general attendance table
      const { data: attendanceData, error: attError } = await supabase
        .from('attendance')
        .select('user_id, event_id, status, recorded_at')
        .in('user_id', studentIds);

      if (attError) throw attError;

      // Also fetch from gw_attendance_records if sessions exist
      let gwAttendanceData: any[] = [];
      if (sessionList.length > 0) {
        const sessionIds = sessionList.map(s => s.id);
        const { data: gwRecords } = await supabase
          .from('gw_attendance_records')
          .select('student_profile_id, attendance_session_id, status')
          .in('attendance_session_id', sessionIds);
        gwAttendanceData = gwRecords || [];
      }

      // Build student attendance data
      const studentAttendance: StudentAttendance[] = studentIds.map(sid => {
        const records = new Map<string, 'present' | 'absent' | 'excused' | 'late' | null>();
        
        // Add records from gw_attendance_records
        gwAttendanceData.forEach(r => {
          if (r.student_profile_id === sid) {
            records.set(r.attendance_session_id, r.status);
          }
        });

        // Calculate totals
        let present = 0, absent = 0, excused = 0, late = 0;
        records.forEach(status => {
          if (status === 'present') present++;
          else if (status === 'absent') absent++;
          else if (status === 'excused') excused++;
          else if (status === 'late') late++;
        });

        const totalMarked = present + absent + excused + late;
        const rate = totalMarked > 0 ? Math.round(((present + excused) / totalMarked) * 100) : 0;

        return {
          student_id: sid,
          student_name: profileMap.get(sid) || 'Unknown',
          records,
          totals: { present, absent, excused, late, rate }
        };
      });

      // Sort by last name
      studentAttendance.sort((a, b) => {
        const aLast = a.student_name.split(' ').pop() || '';
        const bLast = b.student_name.split(' ').pop() || '';
        return aLast.localeCompare(bLast);
      });

      setStudents(studentAttendance);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [currentSemester, isInstructor, targetStudentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = (studentId: string, sessionId: string, newStatus: string | null) => {
    if (!isInstructor) return;

    setStudents(prev => prev.map(s => {
      if (s.student_id !== studentId) return s;
      
      const newRecords = new Map(s.records);
      newRecords.set(sessionId, newStatus as any);
      
      // Recalculate totals
      let present = 0, absent = 0, excused = 0, late = 0;
      newRecords.forEach(status => {
        if (status === 'present') present++;
        else if (status === 'absent') absent++;
        else if (status === 'excused') excused++;
        else if (status === 'late') late++;
      });
      const totalMarked = present + absent + excused + late;
      const rate = totalMarked > 0 ? Math.round(((present + excused) / totalMarked) * 100) : 0;

      return {
        ...s,
        records: newRecords,
        totals: { present, absent, excused, late, rate }
      };
    }));

    // Track dirty records
    setDirtyRecords(prev => {
      const newMap = new Map(prev);
      newMap.set(`${studentId}::${sessionId}`, newStatus || 'null');
      return newMap;
    });
  };

  const cycleStatus = (studentId: string, sessionId: string, currentStatus: string | null) => {
    const statusOrder = ['present', 'absent', 'excused', 'late', null];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    handleStatusChange(studentId, sessionId, statusOrder[nextIndex]);
  };

  const saveChanges = async () => {
    if (dirtyRecords.size === 0) return;

    setSaving(true);
    try {
      const updates: { student_profile_id: string; attendance_session_id: string; status: string }[] = [];
      
      dirtyRecords.forEach((status, key) => {
        const [studentId, sessionId] = key.split('::');
        if (status !== 'null') {
          updates.push({
            student_profile_id: studentId,
            attendance_session_id: sessionId,
            status
          });
        }
      });

      // Upsert records
      for (const update of updates) {
        const { error } = await supabase
          .from('gw_attendance_records')
          .upsert({
            student_profile_id: update.student_profile_id,
            attendance_session_id: update.attendance_session_id,
            status: update.status,
            marked_by: user?.id,
            marked_at: new Date().toISOString(),
            check_in_method: 'manual'
          }, {
            onConflict: 'attendance_session_id,student_profile_id'
          });

        if (error) throw error;
      }

      toast.success('Attendance saved');
      setDirtyRecords(new Map());
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Student', ...sessions.map(s => format(parseISO(s.date), 'M/d')), 'Present', 'Absent', 'Excused', 'Late', 'Rate'];
    const rows = filteredStudents.map(s => [
      s.student_name,
      ...sessions.map(sess => s.records.get(sess.id) || '-'),
      s.totals.present,
      s.totals.absent,
      s.totals.excused,
      s.totals.late,
      `${s.totals.rate}%`
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mus240_attendance.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Attendance exported');
  };

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    return students.filter(s => 
      s.student_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  const getStatusStyle = (status: string | null) => {
    const option = STATUS_OPTIONS.find(o => o.value === status);
    return option?.color || 'bg-muted text-muted-foreground';
  };

  const getStatusLabel = (status: string | null) => {
    const option = STATUS_OPTIONS.find(o => o.value === status);
    return option?.label || '-';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          Loading attendance...
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              {isInstructor ? 'Class Attendance Grid' : 'My Attendance Record'}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {isInstructor && !isMobile && (
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-8 w-40 h-9" 
                  />
                </div>
              )}
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              {isInstructor && (
                <>
                  <Button variant="outline" size="sm" onClick={exportToCSV}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={saveChanges} 
                    disabled={saving || dirtyRecords.size === 0}
                    className="gap-1"
                  >
                    <Save className="h-4 w-4" />
                    Save {dirtyRecords.size > 0 && `(${dirtyRecords.size})`}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile search */}
          {isInstructor && isMobile && (
            <div className="relative mt-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-10 text-base"
              />
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-3 mt-3 text-xs flex-wrap">
            {STATUS_OPTIONS.slice(0, 4).map(opt => (
              <div key={opt.value} className="flex items-center gap-1">
                <span className={cn("w-5 h-5 rounded flex items-center justify-center font-semibold", opt.color)}>
                  {opt.label}
                </span>
                <span className="text-muted-foreground capitalize">{opt.value}</span>
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {sessions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No class sessions recorded yet</p>
              <p className="text-sm">Attendance will appear here once sessions are created</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No students found</p>
            </div>
          ) : isMobile ? (
            <AttendanceMobileCards
              students={filteredStudents}
              sessions={sessions}
              isInstructor={isInstructor}
              onCycleStatus={cycleStatus}
              dirtyRecords={dirtyRecords}
              formatDate={(d) => parseISO(d)}
            />
          ) : (
            <ScrollArea className="w-full">
              <div className="min-w-max">
                {/* Header Row */}
                <div className="flex border-b bg-muted/50 sticky top-0 z-10">
                  <div className="w-48 min-w-48 p-2 font-semibold text-xs border-r sticky left-0 bg-muted/50 z-20">
                    Student
                  </div>
                  
                  {sessions.map((session) => (
                    <Tooltip key={session.id}>
                      <TooltipTrigger asChild>
                        <div className="w-9 min-w-9 p-1 text-center border-r text-[10px] cursor-help">
                          <div className="font-bold">{format(parseISO(session.date), 'M/d')}</div>
                          <div className="text-muted-foreground">W{session.week_number}</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="font-medium">{session.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(session.date), 'EEEE, MMMM d, yyyy')}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ))}

                  {/* Totals columns */}
                  <div className="flex bg-muted/70 sticky right-0 z-10 border-l-2 border-primary/20">
                    <div className="w-8 p-1 text-center text-[9px] font-semibold border-r" title="Present">P</div>
                    <div className="w-8 p-1 text-center text-[9px] font-semibold border-r" title="Absent">A</div>
                    <div className="w-8 p-1 text-center text-[9px] font-semibold border-r" title="Excused">E</div>
                    <div className="w-8 p-1 text-center text-[9px] font-semibold border-r" title="Late">L</div>
                    <div className="w-12 p-1 text-center text-[9px] font-semibold" title="Attendance Rate">Rate</div>
                  </div>
                </div>

                {/* Student Rows */}
                {filteredStudents.map((student, rowIdx) => (
                  <div 
                    key={student.student_id} 
                    className={cn(
                      "flex border-b hover:bg-muted/30 transition-colors",
                      rowIdx % 2 === 0 ? "bg-background" : "bg-muted/10"
                    )}
                  >
                    <div className="w-48 min-w-48 p-2 border-r sticky left-0 bg-inherit z-10">
                      <div className="font-medium text-sm truncate">{student.student_name}</div>
                    </div>

                    {sessions.map(session => {
                      const status = student.records.get(session.id) || null;
                      const isDirty = dirtyRecords.has(`${student.student_id}::${session.id}`);
                      
                      return (
                        <div 
                          key={session.id}
                          className={cn(
                            "w-9 min-w-9 p-0.5 border-r flex items-center justify-center",
                            isInstructor && "cursor-pointer hover:bg-muted/50"
                          )}
                          onClick={() => isInstructor && cycleStatus(student.student_id, session.id, status)}
                        >
                          <span className={cn(
                            "w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-all",
                            getStatusStyle(status),
                            isDirty && "ring-2 ring-primary ring-offset-1"
                          )}>
                            {getStatusLabel(status)}
                          </span>
                        </div>
                      );
                    })}

                    {/* Totals */}
                    <div className="flex bg-muted/20 sticky right-0 z-10 border-l-2 border-primary/20">
                      <div className="w-8 p-1 text-center text-xs font-medium text-green-600">{student.totals.present}</div>
                      <div className="w-8 p-1 text-center text-xs font-medium text-red-600">{student.totals.absent}</div>
                      <div className="w-8 p-1 text-center text-xs font-medium text-blue-600">{student.totals.excused}</div>
                      <div className="w-8 p-1 text-center text-xs font-medium text-amber-600">{student.totals.late}</div>
                      <div className={cn(
                        "w-12 p-1 text-center text-xs font-bold",
                        student.totals.rate >= 90 ? "text-green-600" :
                        student.totals.rate >= 80 ? "text-blue-600" :
                        student.totals.rate >= 70 ? "text-amber-600" : "text-red-600"
                      )}>
                        {student.totals.rate}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
