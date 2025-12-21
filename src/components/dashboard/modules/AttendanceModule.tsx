import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  UserCheck, CheckCircle, XCircle, Clock, AlertTriangle,
  CalendarIcon, Save, BookOpen, CheckCheck, Users
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export const AttendanceModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, { status: string; notes: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Check permissions
  useEffect(() => {
    if (!user) { setHasPermission(false); return; }
    supabase.from('gw_profiles').select('is_admin, is_super_admin, exec_board_role, special_roles')
      .eq('user_id', user.id).single().then(({ data }) => {
        const isAdmin = data?.is_admin || data?.is_super_admin;
        const isSecretary = data?.exec_board_role?.toLowerCase() === 'secretary';
        setHasPermission(isAdmin || isSecretary || data?.special_roles?.includes('secretary') || false);
      });
  }, [user]);

  // Load courses
  useEffect(() => {
    if (!hasPermission) return;
    supabase.from('gw_courses').select('id, title, course_code, semester').eq('is_active', true).order('title')
      .then(({ data }) => {
        setCourses(data || []);
        if (data?.length && !selectedCourseId) setSelectedCourseId(data[0].id);
        setLoading(false);
      });
  }, [hasPermission]);

  // Load students & attendance
  useEffect(() => {
    if (!selectedCourseId || !hasPermission) return;
    setLoading(true);
    
    const loadData = async () => {
      const enrollmentResult = await supabase
        .from('gw_course_enrollments')
        .select('user_id')
        .match({ course_id: selectedCourseId, status: 'enrolled' });
      
      const enrollments = enrollmentResult.data as { user_id: string }[] | null;
      const userIds = (enrollments || []).map(e => e.user_id);
      if (!userIds.length) { setStudents([]); setAttendance({}); setLoading(false); return; }

      const profileResult = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, voice_part, avatar_url')
        .in('user_id', userIds as string[])
        .order('full_name');
      
      const profiles = profileResult.data as any[] | null;
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const attResult = await supabase.from('gw_course_attendance')
        .select('student_id, status, notes')
        .match({ course_id: selectedCourseId, attendance_date: dateStr });
      const attData = attResult.data as any[] | null;
      
      const attMap = new Map((attData || []).map(a => [a.student_id, { status: a.status, notes: a.notes || '' }]));
      
      setStudents(profiles || []);
      const init: Record<string, { status: string; notes: string }> = {};
      (profiles || []).forEach(p => {
        init[p.user_id] = attMap.get(p.user_id) || { status: 'present', notes: '' };
      });
      setAttendance(init);
      setLoading(false);
    };
    loadData();
  }, [selectedCourseId, selectedDate, hasPermission]);

  const updateStatus = (userId: string, status: string) => {
    setAttendance(prev => ({ ...prev, [userId]: { ...prev[userId], status } }));
  };

  const handleSave = async () => {
    if (!selectedCourseId || !user) return;
    setSaving(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const records = Object.entries(attendance).map(([uid, d]) => ({
      course_id: selectedCourseId, student_id: uid, attendance_date: dateStr,
      status: d.status, notes: d.notes || null, recorded_by: user.id
    }));
    const { error } = await supabase.from('gw_course_attendance').upsert(records, { onConflict: 'course_id,student_id,attendance_date' });
    setSaving(false);
    toast({ title: error ? "Error" : "Attendance Saved", description: error ? "Failed to save attendance" : `Saved for ${records.length} students`, variant: error ? "destructive" : undefined });
  };

  const markAllAs = (status: string) => {
    setAttendance(prev => {
      const upd = { ...prev };
      Object.keys(upd).forEach(u => upd[u] = { ...upd[u], status });
      return upd;
    });
  };

  const counts = {
    total: Object.keys(attendance).length,
    present: Object.values(attendance).filter(a => a.status === 'present').length,
    absent: Object.values(attendance).filter(a => a.status === 'absent').length,
    late: Object.values(attendance).filter(a => a.status === 'late').length,
    excused: Object.values(attendance).filter(a => a.status === 'excused').length
  };

  if (hasPermission === null || (loading && !courses.length)) {
    return <div className="h-full flex items-center justify-center"><UserCheck className="w-10 h-10 animate-pulse text-muted-foreground" /></div>;
  }
  
  if (!hasPermission) {
    return (
      <div className="h-full flex items-center justify-center text-center p-4">
        <div>
          <XCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Secretary or Admin access required</p>
        </div>
      </div>
    );
  }
  
  if (!courses.length) {
    return (
      <div className="h-full flex items-center justify-center text-center p-4">
        <div>
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No active courses found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b bg-card/50">
        <div className="flex items-center gap-2 mb-3">
          <UserCheck className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Take Attendance</h2>
        </div>
        
        {/* Course & Date Selection */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="flex-1 bg-background">
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    {c.title}
                    {c.course_code && <Badge variant="secondary" className="text-[10px]">{c.course_code}</Badge>}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="bg-background">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={selectedDate} onSelect={d => d && setSelectedDate(d)} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Quick Stats Bar */}
      {students.length > 0 && (
        <div className="px-3 py-2 border-b bg-muted/30 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{counts.total}</span>
          </div>
          <div className="flex items-center gap-1.5 text-green-600">
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="font-medium">{counts.present}</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-600">
            <XCircle className="h-3.5 w-3.5" />
            <span className="font-medium">{counts.absent}</span>
          </div>
          <div className="flex items-center gap-1.5 text-yellow-600">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium">{counts.late}</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="font-medium">{counts.excused}</span>
          </div>
        </div>
      )}

      {/* Student List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <UserCheck className="w-8 h-8 animate-pulse text-muted-foreground" />
          </div>
        ) : !students.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="w-10 h-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No enrolled students</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {students.map((s: any) => (
              <AttendanceRow
                key={s.user_id}
                student={s}
                status={attendance[s.user_id]?.status || 'present'}
                onStatusChange={status => updateStatus(s.user_id, status)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer Actions */}
      {students.length > 0 && (
        <div className="p-3 border-t bg-card/50 flex justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => markAllAs('present')}>
            <CheckCheck className="h-4 w-4 mr-1.5" />
            All Present
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1.5" />
            {saving ? 'Saving...' : 'Save Attendance'}
          </Button>
        </div>
      )}
    </div>
  );
};

const AttendanceRow = ({ student, status, onStatusChange }: { student: any; status: string; onStatusChange: (s: string) => void }) => {
  const statusOptions = [
    { value: 'present', icon: CheckCircle, activeClass: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
    { value: 'absent', icon: XCircle, activeClass: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
    { value: 'late', icon: Clock, activeClass: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' },
    { value: 'excused', icon: AlertTriangle, activeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' }
  ];

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
      <Avatar className="h-9 w-9">
        <AvatarImage src={student.avatar_url} />
        <AvatarFallback className="text-xs">{student.full_name?.charAt(0) || '?'}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{student.full_name || 'Unknown'}</p>
        {student.voice_part && (
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{student.voice_part}</p>
        )}
      </div>
      
      <div className="flex gap-1">
        {statusOptions.map(opt => {
          const Icon = opt.icon;
          const isActive = status === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onStatusChange(opt.value)}
              className={cn(
                "p-2 rounded-md transition-all",
                isActive ? opt.activeClass : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
              title={opt.value.charAt(0).toUpperCase() + opt.value.slice(1)}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
