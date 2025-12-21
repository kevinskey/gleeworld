import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  UserCheck, CheckCircle, XCircle, Clock, AlertTriangle,
  CalendarIcon, Save, RefreshCw, Users, TrendingDown, BookOpen, CheckCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const ATTENDANCE_THRESHOLD = 80;

export const AttendanceModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, { status: string; notes: string }>>({});
  const [studentStats, setStudentStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'take' | 'stats'>('take');

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
      // Fetch enrollments for course using match to avoid type instantiation issues
      const enrollmentResult = await supabase
        .from('gw_course_enrollments')
        .select('user_id')
        .match({ course_id: selectedCourseId, status: 'enrolled' });
      
      const enrollments = enrollmentResult.data as { user_id: string }[] | null;
      const userIds = (enrollments || []).map(e => e.user_id);
      if (!userIds.length) { setStudents([]); setAttendance({}); setLoading(false); return; }

      // Fetch profiles for enrolled users
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

      // Load stats
      const statsResult = await supabase.from('gw_course_attendance')
        .select('student_id, status').eq('course_id', selectedCourseId);
      const allRecords = statsResult.data as any[] | null;
      
      const statsMap = new Map<string, any>();
      (allRecords || []).forEach(r => {
        const s = statsMap.get(r.student_id) || { present: 0, absent: 0, late: 0, excused: 0 };
        if (r.status === 'present') s.present++;
        else if (r.status === 'absent') s.absent++;
        else if (r.status === 'late') s.late++;
        else if (r.status === 'excused') s.excused++;
        statsMap.set(r.student_id, s);
      });

      const stats = (profiles || []).map(p => {
        const s = statsMap.get(p.user_id) || { present: 0, absent: 0, late: 0, excused: 0 };
        const total = s.present + s.absent + s.late + s.excused;
        const attended = s.present + s.late + s.excused;
        return { userId: p.user_id, fullName: p.full_name, totalClasses: total, ...s, 
          attendanceRate: total > 0 ? Math.round((attended / total) * 100) : 100 };
      });
      setStudentStats(stats);
      setLoading(false);
    };
    loadData();
  }, [selectedCourseId, selectedDate, hasPermission]);

  const updateAtt = (userId: string, field: 'status' | 'notes', value: string) => {
    setAttendance(prev => ({ ...prev, [userId]: { ...prev[userId], [field]: value } }));
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
    toast({ title: error ? "Error" : "Saved", description: error ? "Failed to save" : `Saved for ${records.length} students`, variant: error ? "destructive" : undefined });
  };

  const markAllAs = (status: string) => setAttendance(prev => {
    const upd = { ...prev }; Object.keys(upd).forEach(u => upd[u] = { ...upd[u], status }); return upd;
  });

  const stats = { total: Object.keys(attendance).length, present: Object.values(attendance).filter(a => a.status === 'present').length,
    absent: Object.values(attendance).filter(a => a.status === 'absent').length, late: Object.values(attendance).filter(a => a.status === 'late').length };
  const lowStudents = studentStats.filter(s => s.totalClasses > 0 && s.attendanceRate < ATTENDANCE_THRESHOLD);

  if (hasPermission === null || loading) return <div className="h-full flex items-center justify-center"><UserCheck className="w-12 h-12 animate-pulse text-muted-foreground" /></div>;
  if (!hasPermission) return <div className="h-full flex items-center justify-center text-center"><XCircle className="w-12 h-12 text-destructive mx-auto mb-2" /><p className="text-sm">Only Secretary/Admin can manage attendance</p></div>;
  if (!courses.length) return <div className="h-full flex items-center justify-center text-center"><BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-2" /><p className="text-sm">No active courses</p></div>;

  return (
    <div className="h-full flex flex-col gap-3 p-1">
      {lowStudents.length > 0 && <Card className="border-destructive/50 bg-destructive/5"><CardContent className="p-3 flex gap-2"><TrendingDown className="h-5 w-5 text-destructive" /><div><p className="text-sm font-medium text-destructive">Low Attendance Alert</p><p className="text-xs text-muted-foreground">{lowStudents.length} student(s) below {ATTENDANCE_THRESHOLD}%</p></div></CardContent></Card>}
      
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={selectedCourseId} onValueChange={setSelectedCourseId}><SelectTrigger className="flex-1"><SelectValue /></SelectTrigger><SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title} {c.course_code && <Badge variant="outline" className="ml-2 text-xs">{c.course_code}</Badge>}</SelectItem>)}</SelectContent></Select>
        <Popover><PopoverTrigger asChild><Button variant="outline"><CalendarIcon className="mr-2 h-4 w-4" />{format(selectedDate, 'MMM d, yyyy')}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selectedDate} onSelect={d => d && setSelectedDate(d)} /></PopoverContent></Popover>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full grid grid-cols-2"><TabsTrigger value="take"><UserCheck className="h-4 w-4 mr-1" />Take</TabsTrigger><TabsTrigger value="stats"><Users className="h-4 w-4 mr-1" />Stats</TabsTrigger></TabsList>
        
        <TabsContent value="take" className="flex-1 flex flex-col gap-2 mt-2 min-h-0">
          {!students.length ? <div className="text-center py-8 text-muted-foreground text-sm">No students enrolled</div> : <>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-muted/30 rounded p-2"><Users className="h-3.5 w-3.5 mx-auto" /><span className="font-bold">{stats.total}</span></div>
              <div className="bg-muted/30 rounded p-2 text-green-600"><CheckCircle className="h-3.5 w-3.5 mx-auto" /><span className="font-bold">{stats.present}</span></div>
              <div className="bg-muted/30 rounded p-2 text-red-600"><XCircle className="h-3.5 w-3.5 mx-auto" /><span className="font-bold">{stats.absent}</span></div>
              <div className="bg-muted/30 rounded p-2 text-yellow-600"><Clock className="h-3.5 w-3.5 mx-auto" /><span className="font-bold">{stats.late}</span></div>
            </div>
            <div className="flex justify-between"><Button size="sm" variant="outline" onClick={() => markAllAs('present')} className="text-xs h-7"><CheckCheck className="h-3 w-3 mr-1" />All Present</Button><Button size="sm" onClick={handleSave} disabled={saving} className="h-7"><Save className="h-3.5 w-3.5 mr-1" />{saving ? '...' : 'Save'}</Button></div>
            <ScrollArea className="flex-1"><div className="space-y-2 pr-2">{students.map((s: any) => <StudentRow key={s.user_id} student={s} status={attendance[s.user_id]?.status || 'present'} onStatusChange={st => updateAtt(s.user_id, 'status', st)} />)}</div></ScrollArea>
          </>}
        </TabsContent>
        
        <TabsContent value="stats" className="flex-1 mt-2 min-h-0"><ScrollArea className="h-full"><div className="space-y-2 pr-2">{studentStats.sort((a,b) => a.attendanceRate - b.attendanceRate).map(s => <StatsRow key={s.userId} student={s} />)}</div></ScrollArea></TabsContent>
      </Tabs>
    </div>
  );
};

const StudentRow = ({ student, status, onStatusChange }: any) => {
  const opts = [{ v: 'present', c: 'bg-green-100 text-green-700', i: <CheckCircle className="h-4 w-4" /> },
    { v: 'absent', c: 'bg-red-100 text-red-700', i: <XCircle className="h-4 w-4" /> },
    { v: 'late', c: 'bg-yellow-100 text-yellow-700', i: <Clock className="h-4 w-4" /> },
    { v: 'excused', c: 'bg-blue-100 text-blue-700', i: <AlertTriangle className="h-4 w-4" /> }];
  return (
    <div className="bg-muted/30 rounded-lg p-2.5 flex items-center gap-2">
      <Avatar className="h-8 w-8"><AvatarImage src={student.avatar_url} /><AvatarFallback>{student.full_name?.charAt(0)}</AvatarFallback></Avatar>
      <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{student.full_name}</p>{student.voice_part && <p className="text-[10px] text-muted-foreground">{student.voice_part}</p>}</div>
      <div className="flex gap-1">{opts.map(o => <button key={o.v} onClick={() => onStatusChange(o.v)} className={cn("p-1.5 rounded-md", status === o.v ? o.c : "bg-muted/50 text-muted-foreground")}>{o.i}</button>)}</div>
    </div>
  );
};

const StatsRow = ({ student }: any) => {
  const isLow = student.attendanceRate < ATTENDANCE_THRESHOLD;
  return (
    <div className={cn("bg-muted/30 rounded-lg p-3", isLow && "border border-destructive/30 bg-destructive/5")}>
      <div className="flex justify-between mb-1"><span className="text-sm font-medium">{student.fullName}{isLow && <Badge variant="destructive" className="ml-2 text-[10px] h-4">Low</Badge>}</span><span className={cn("text-lg font-bold", isLow ? "text-destructive" : "text-green-600")}>{student.attendanceRate}%</span></div>
      <div className="flex gap-3 text-xs text-muted-foreground"><span><span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-1" />{student.present}</span><span><span className="w-2 h-2 rounded-full bg-red-500 inline-block mr-1" />{student.absent}</span><span><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block mr-1" />{student.late}</span></div>
      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden"><div className={cn("h-full", isLow ? "bg-destructive" : "bg-green-500")} style={{ width: `${student.attendanceRate}%` }} /></div>
    </div>
  );
};
