import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, Search, Download, RefreshCw, Save, 
  Check, X, Clock, AlertCircle, Minus, Users,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SecretaryEventAttendanceGridProps {
  courseId: string;
  courseName?: string;
}

interface EnrolledStudent {
  user_id: string;
  full_name: string;
  email: string;
}

interface AttendanceSession {
  id: string;
  title: string;
  opens_at: string;
  event_type: string; // 'rehearsal' or 'performance'
}

interface AttendanceCell {
  session_id: string;
  student_id: string;
  status: 'present' | 'absent' | 'excused' | 'late' | 'left_early' | null;
  isDirty?: boolean;
}

interface StudentTotals {
  present: number;
  absent: number;
  excused: number;
  late: number;
  total_events: number;
  attendance_rate: number;
}

const STATUS_OPTIONS = [
  { value: 'present', label: 'P', icon: Check, color: 'text-green-600 bg-green-50' },
  { value: 'absent', label: 'A', icon: X, color: 'text-red-600 bg-red-50' },
  { value: 'excused', label: 'E', icon: AlertCircle, color: 'text-blue-600 bg-blue-50' },
  { value: 'late', label: 'L', icon: Clock, color: 'text-orange-600 bg-orange-50' },
  { value: null, label: '-', icon: Minus, color: 'text-muted-foreground bg-muted/30' },
];

const MUS070_COURSE_ID = 'a0000000-0000-0000-0000-000000000070';

export const SecretaryEventAttendanceGrid: React.FC<SecretaryEventAttendanceGridProps> = ({ 
  courseId, 
  courseName = 'Glee Club' 
}) => {
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [attendance, setAttendance] = useState<Map<string, AttendanceCell>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [semester, setSemester] = useState('Spring 2026');
  const [eventFilter, setEventFilter] = useState<'all' | 'rehearsal' | 'performance'>('all');

  // Calculate date range for semester
  const getSemesterDateRange = (sem: string) => {
    if (sem === 'Spring 2026') {
      return { start: '2026-01-01', end: '2026-05-31' };
    } else if (sem === 'FALL 2025') {
      return { start: '2025-08-01', end: '2025-12-31' };
    } else if (sem === 'SPRING 2025') {
      return { start: '2025-01-01', end: '2025-05-31' };
    } else if (sem === 'FALL 2024') {
      return { start: '2024-08-01', end: '2024-12-31' };
    }
    return { start: '2026-01-01', end: '2026-05-31' };
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch enrolled students using user_id and gw_profiles
      const { data: enrollments, error: enrollError } = await supabase
        .from('gw_course_enrollments')
        .select('user_id')
        .eq('course_id', courseId)
        .eq('semester', semester)
        .eq('enrollment_status', 'enrolled');

      if (enrollError) throw enrollError;

      const userIds = (enrollments || []).map(e => e.user_id).filter(Boolean);

      // Fetch profiles for enrolled users
      let studentList: EnrolledStudent[] = [];
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds)
          .order('full_name');

        if (profileError) throw profileError;

        studentList = (profiles || []).map(p => ({
          user_id: p.user_id,
          full_name: p.full_name || 'Unknown',
          email: p.email || ''
        }));
      }

      setStudents(studentList);

      // Fetch attendance sessions for the course
      const { start, end } = getSemesterDateRange(semester);
      const { data: sessionData, error: sessionError } = await supabase
        .from('gw_attendance_sessions')
        .select('id, title, opens_at')
        .eq('course_id', courseId)
        .gte('opens_at', start)
        .lte('opens_at', end)
        .order('opens_at', { ascending: true });

      if (sessionError) throw sessionError;

      // Map sessions
      const sessionList: AttendanceSession[] = (sessionData || []).map(s => ({
        id: s.id,
        title: s.title || 'Rehearsal',
        opens_at: s.opens_at,
        event_type: (s.title?.toLowerCase().includes('performance') || 
                    s.title?.toLowerCase().includes('concert'))
                   ? 'performance' : 'rehearsal'
      }));

      setSessions(sessionList);

      // Fetch all attendance records for these sessions
      if (sessionList.length > 0) {
        const sessionIds = sessionList.map(s => s.id);
        const { data: attendanceData, error: attError } = await supabase
          .from('gw_attendance_records')
          .select('attendance_session_id, student_profile_id, status')
          .in('attendance_session_id', sessionIds);

        if (attError) throw attError;

        // Build attendance map (student_profile_id = user_id)
        const attMap = new Map<string, AttendanceCell>();
        (attendanceData || []).forEach(a => {
          const key = `${a.attendance_session_id}:${a.student_profile_id}`;
          attMap.set(key, {
            session_id: a.attendance_session_id,
            student_id: a.student_profile_id,
            status: a.status as any,
            isDirty: false
          });
        });
        setAttendance(attMap);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [courseId, semester]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getAttendanceKey = (sessionId: string, studentId: string) => `${sessionId}:${studentId}`;

  const getAttendanceStatus = (sessionId: string, studentId: string): AttendanceCell['status'] => {
    const key = getAttendanceKey(sessionId, studentId);
    return attendance.get(key)?.status ?? null;
  };

  const updateAttendance = (sessionId: string, studentId: string, status: AttendanceCell['status']) => {
    const key = getAttendanceKey(sessionId, studentId);
    setAttendance(prev => {
      const newMap = new Map(prev);
      newMap.set(key, {
        session_id: sessionId,
        student_id: studentId,
        status,
        isDirty: true
      });
      return newMap;
    });
  };

  const cycleStatus = (sessionId: string, studentId: string) => {
    const current = getAttendanceStatus(sessionId, studentId);
    const statusCycle: AttendanceCell['status'][] = ['present', 'absent', 'excused', 'late', null];
    const currentIndex = statusCycle.indexOf(current);
    const nextIndex = (currentIndex + 1) % statusCycle.length;
    updateAttendance(sessionId, studentId, statusCycle[nextIndex]);
  };

  const calculateStudentTotals = (studentId: string): StudentTotals => {
    const filtered = getFilteredSessions();
    let present = 0, absent = 0, excused = 0, late = 0;
    
    filtered.forEach(session => {
      const status = getAttendanceStatus(session.id, studentId);
      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else if (status === 'excused') excused++;
      else if (status === 'late') late++;
    });

    const total_events = filtered.length;
    const attended = present + late;
    const attendance_rate = total_events > 0 ? Math.round((attended / total_events) * 100) : 0;

    return { present, absent, excused, late, total_events, attendance_rate };
  };

  const saveAllChanges = async () => {
    const dirtyRecords = Array.from(attendance.values()).filter(a => a.isDirty);
    if (dirtyRecords.length === 0) {
      toast.info('No changes to save');
      return;
    }

    setSaving(true);
    try {
      for (const record of dirtyRecords) {
        if (record.status === null) {
          // Delete the record
          await supabase
            .from('gw_attendance_records')
            .delete()
            .eq('attendance_session_id', record.session_id)
            .eq('student_profile_id', record.student_id);
        } else {
          // Upsert the record
          await supabase
            .from('gw_attendance_records')
            .upsert({
              attendance_session_id: record.session_id,
              student_profile_id: record.student_id,
              status: record.status,
              marked_at: new Date().toISOString()
            }, { onConflict: 'attendance_session_id,student_profile_id' });
        }
      }

      toast.success(`Saved ${dirtyRecords.length} attendance record(s)`);
      
      // Clear dirty flags
      setAttendance(prev => {
        const newMap = new Map(prev);
        newMap.forEach((value, key) => {
          if (value.isDirty) {
            newMap.set(key, { ...value, isDirty: false });
          }
        });
        return newMap;
      });
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const exportToCSV = () => {
    const filtered = getFilteredSessions();
    const headers = ['Student Name', ...filtered.map(s => format(parseISO(s.opens_at), 'M/d')), 'Present', 'Absent', 'Excused', 'Late', 'Rate'];
    
    const rows = filteredStudents.map(student => {
      const totals = calculateStudentTotals(student.user_id);
      const sessionStatuses = filtered.map(session => {
        const status = getAttendanceStatus(session.id, student.user_id);
        return status?.charAt(0).toUpperCase() || '-';
      });
      return [
        student.full_name,
        ...sessionStatuses,
        totals.present,
        totals.absent,
        totals.excused,
        totals.late,
        `${totals.attendance_rate}%`
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_grid_${courseName.replace(/\s/g, '_')}_${semester}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  const getFilteredSessions = () => {
    if (eventFilter === 'all') return sessions;
    return sessions.filter(s => s.event_type === eventFilter);
  };

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSessions = getFilteredSessions();
  const hasUnsavedChanges = Array.from(attendance.values()).some(a => a.isDirty);

  const StatusCell = ({ eventId, studentId }: { eventId: string; studentId: string }) => {
    const status = getAttendanceStatus(eventId, studentId);
    const cell = attendance.get(getAttendanceKey(eventId, studentId));
    const isDirty = cell?.isDirty || false;
    
    const statusConfig = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[4];
    const Icon = statusConfig.icon;

    return (
      <button
        onClick={() => cycleStatus(eventId, studentId)}
        className={`
          w-8 h-8 flex items-center justify-center rounded text-xs font-medium transition-all
          ${statusConfig.color}
          ${isDirty ? 'ring-2 ring-yellow-400' : ''}
          hover:ring-2 hover:ring-primary/50
        `}
        title={`Click to cycle: ${status || 'Not recorded'}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {/* Controls - Stack on mobile */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger className="w-[110px] sm:w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Spring 2026">Spring 2026</SelectItem>
              <SelectItem value="FALL 2025">Fall 2025</SelectItem>
              <SelectItem value="SPRING 2025">Spring 2025</SelectItem>
              <SelectItem value="FALL 2024">Fall 2024</SelectItem>
            </SelectContent>
          </Select>
          <Select value={eventFilter} onValueChange={(v: any) => setEventFilter(v)}>
            <SelectTrigger className="w-[100px] sm:w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="rehearsal">Rehearsals</SelectItem>
              <SelectItem value="performance">Performances</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 ml-auto">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-8 px-2">
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV} className="h-8 px-2">
              <Download className="h-3 w-3" />
            </Button>
            <Button 
              size="sm" 
              onClick={saveAllChanges} 
              disabled={!hasUnsavedChanges || saving}
              className={`h-8 px-2 sm:px-3 ${hasUnsavedChanges ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              <Save className="h-3 w-3" />
              <span className="hidden sm:inline ml-1">{saving ? 'Saving...' : 'Save'}</span>
            </Button>
          </div>
        </div>
        
        {/* Search - full width on mobile */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Quick Stats - 2x2 on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="p-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-lg font-bold">{students.length}</div>
              <p className="text-[10px] text-muted-foreground truncate">Students</p>
            </div>
          </div>
        </Card>
        <Card className="p-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-lg font-bold">{filteredSessions.length}</div>
              <p className="text-[10px] text-muted-foreground truncate">Sessions</p>
            </div>
          </div>
        </Card>
        <Card className="p-2">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-lg font-bold">
                {sessions.filter(s => s.event_type === 'rehearsal').length}
              </div>
              <p className="text-[10px] text-muted-foreground truncate">Rehearsals</p>
            </div>
          </div>
        </Card>
        <Card className="p-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-purple-500 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-lg font-bold">
                {sessions.filter(s => s.event_type === 'performance').length}
              </div>
              <p className="text-[10px] text-muted-foreground truncate">Performances</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredStudents.length === 0 || filteredSessions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {students.length === 0 
                ? 'No students enrolled in this course yet.' 
                : filteredSessions.length === 0
                  ? 'No sessions found for this semester.'
                  : 'No matching students found.'}
            </div>
          ) : (
            <TooltipProvider>
              <ScrollArea className="w-full h-[55vh] sm:h-[60vh]">
                <div className="min-w-max">
                  {/* Header Row */}
                  <div 
                    className="flex gap-0 bg-muted/50 border-b font-medium text-xs sticky top-0 z-20"
                    style={{ minWidth: `${140 + filteredSessions.length * 36 + 180}px` }}
                  >
                    {/* Sticky Student Name Column - narrower on mobile */}
                    <div className="w-[120px] sm:w-[160px] min-w-[120px] sm:min-w-[160px] p-2 border-r bg-muted/50 sticky left-0 z-30 text-[11px] sm:text-xs">
                      Student
                    </div>
                    
                    {/* Session Date Columns */}
                    {filteredSessions.map((session, idx) => (
                      <Tooltip key={session.id}>
                        <TooltipTrigger asChild>
                          <div 
                            className={`w-9 min-w-9 p-1 text-center border-r text-[10px] cursor-help
                              ${session.event_type === 'performance' ? 'bg-purple-100 dark:bg-purple-900/30' : ''}
                            `}
                          >
                            <div className="font-bold">
                              {format(parseISO(session.opens_at), 'M/d')}
                            </div>
                            <div className="text-[8px] text-muted-foreground truncate">
                              {session.event_type === 'performance' ? 'P' : 'R'}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="font-medium">{session.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(session.opens_at), 'EEEE, MMMM d, yyyy')}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ))}

                    {/* Totals Header - smaller on mobile */}
                    <div className="flex bg-muted sticky right-0 z-30 border-l-2 border-primary/20">
                      <div className="w-8 sm:w-10 p-1 text-center text-[9px] sm:text-[10px] border-r" title="Present">P</div>
                      <div className="w-8 sm:w-10 p-1 text-center text-[9px] sm:text-[10px] border-r" title="Absent">A</div>
                      <div className="w-8 sm:w-10 p-1 text-center text-[9px] sm:text-[10px] border-r" title="Excused">E</div>
                      <div className="w-8 sm:w-10 p-1 text-center text-[9px] sm:text-[10px] border-r" title="Late">L</div>
                      <div className="w-10 sm:w-12 p-1 text-center text-[9px] sm:text-[10px]" title="Attendance Rate">Rate</div>
                    </div>
                  </div>

                  {/* Data Rows */}
                  {filteredStudents.map((student, idx) => {
                    const totals = calculateStudentTotals(student.user_id);
                    return (
                      <div 
                        key={student.user_id}
                        className={`flex gap-0 border-b items-center text-xs
                          ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}
                        `}
                        style={{ minWidth: `${140 + filteredSessions.length * 36 + 180}px` }}
                      >
                        {/* Sticky Student Name - narrower on mobile */}
                        <div className={`w-[120px] sm:w-[160px] min-w-[120px] sm:min-w-[160px] p-1.5 sm:p-2 border-r font-medium truncate sticky left-0 z-10 text-[11px] sm:text-xs
                          ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}
                        `}>
                          {student.full_name}
                        </div>

                        {/* Attendance Cells */}
                        {filteredSessions.map(session => (
                          <div 
                            key={session.id} 
                            className={`w-9 min-w-9 p-0.5 flex justify-center border-r
                              ${session.event_type === 'performance' ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''}
                            `}
                          >
                            <StatusCell 
                              eventId={session.id} 
                              studentId={student.user_id} 
                            />
                          </div>
                        ))}

                        {/* Totals - smaller on mobile */}
                        <div className={`flex sticky right-0 z-10 border-l-2 border-primary/20
                          ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}
                        `}>
                          <div className="w-8 sm:w-10 p-1 text-center font-medium text-green-600 border-r text-[10px] sm:text-xs">
                            {totals.present}
                          </div>
                          <div className="w-8 sm:w-10 p-1 text-center font-medium text-red-600 border-r text-[10px] sm:text-xs">
                            {totals.absent}
                          </div>
                          <div className="w-8 sm:w-10 p-1 text-center font-medium text-blue-600 border-r text-[10px] sm:text-xs">
                            {totals.excused}
                          </div>
                          <div className="w-8 sm:w-10 p-1 text-center font-medium text-orange-600 border-r text-[10px] sm:text-xs">
                            {totals.late}
                          </div>
                          <div className={`w-10 sm:w-12 p-1 text-center font-bold text-[10px] sm:text-xs
                            ${totals.attendance_rate >= 90 ? 'text-green-600' : 
                              totals.attendance_rate >= 75 ? 'text-yellow-600' : 'text-red-600'}
                          `}>
                            {totals.attendance_rate}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <ScrollBar orientation="vertical" />
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      {/* Legend - Wraps on mobile */}
      <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
        <span className="font-medium w-full sm:w-auto">Legend:</span>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          {STATUS_OPTIONS.slice(0, 4).map(opt => (
            <span key={opt.value} className="flex items-center gap-1">
              <div className={`w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded ${opt.color}`}>
                <opt.icon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </div>
              <span className="hidden sm:inline">
                {opt.value === 'present' ? 'Present' : 
                 opt.value === 'absent' ? 'Absent' : 
                 opt.value === 'excused' ? 'Excused' : 'Late'}
              </span>
              <span className="sm:hidden">
                {opt.value === 'present' ? 'P' : 
                 opt.value === 'absent' ? 'A' : 
                 opt.value === 'excused' ? 'E' : 'L'}
              </span>
            </span>
          ))}
          <span className="flex items-center gap-1">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-100 dark:bg-purple-900/30 rounded flex items-center justify-center text-[8px] sm:text-[10px] font-bold">P</div>
            <span className="hidden sm:inline">Performance</span>
            <span className="sm:hidden">Perf</span>
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-50 ring-2 ring-yellow-400 rounded" />
            <span className="hidden sm:inline">Unsaved</span>
          </span>
        </div>
      </div>
    </div>
  );
};
