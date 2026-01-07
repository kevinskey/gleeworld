import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGleeWorldEvents } from '@/hooks/useGleeWorldEvents';
import QRCode from 'qrcode';
import { Calendar as CalendarIcon, Plus, QrCode, Users, Clock, MapPin, ChevronLeft, ChevronRight, Loader2, Download, RefreshCw, BookOpen, Music, Trash2, CheckCircle, Sparkles, GraduationCap, AlertCircle, Repeat } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO, addHours, addDays, subDays, addWeeks, subWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import conductingImage from '@/assets/conducting-class-event.jpg';
interface ClassSession {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  session_type: string;
  image_url: string | null;
  qr_code_id: string | null;
  attendance_required: boolean;
  created_by: string | null;
  created_at: string;
}
interface Semester {
  id: string;
  name: string;
  term: string;
  year: number;
  start_date: string;
  end_date: string;
  classes_end_date: string | null;
  exception_dates: string[];
  academic_events: Array<{
    title: string;
    date?: string;
    start_date?: string;
    end_date?: string;
    type: string;
  }>;
  is_active: boolean;
}
interface CourseInfo {
  id: string;
  meeting_patterns: {
    days: number[];
    startTime: string;
    endTime: string;
  } | null;
  classroom: string | null;
}
interface QRCodeData {
  id: string;
  qr_token: string;
  generated_at: string;
  expires_at: string;
  scan_count: number;
  is_active: boolean;
}
interface CourseClassCalendarProps {
  courseId: string;
  courseCode?: string;
  isInstructor?: boolean;
}
const SESSION_TYPES = [{
  value: 'class',
  label: 'Class',
  icon: BookOpen
}, {
  value: 'rehearsal',
  label: 'Rehearsal',
  icon: Music
}, {
  value: 'lab',
  label: 'Lab',
  icon: BookOpen
}, {
  value: 'workshop',
  label: 'Workshop',
  icon: Users
}, {
  value: 'lecture',
  label: 'Lecture',
  icon: BookOpen
}];
export const CourseClassCalendar: React.FC<CourseClassCalendarProps> = ({
  courseId,
  courseCode = 'MUS-210',
  isInstructor = false
}) => {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const {
    events: spelmanEvents,
    loading: spelmanLoading
  } = useGleeWorldEvents();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [activeTab, setActiveTab] = useState<'class' | 'spelman'>('class');
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('week');

  // Semester state
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);
  const [generatingSessions, setGeneratingSessions] = useState(false);

  // Create session dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    session_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '10:30',
    location: '',
    session_type: 'class',
    attendance_required: true,
    is_recurring: false,
    recurring_frequency: 'weekly',
    recurring_days: [] as string[],
    recurring_end_date: ''
  });
  const [creating, setCreating] = useState(false);

  // QR Code state
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrImageData, setQrImageData] = useState<string>('');
  const [qrCode, setQrCode] = useState<QRCodeData | null>(null);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [attendanceCount, setAttendanceCount] = useState(0);

  // Fetch sessions, semester, and course info
  useEffect(() => {
    fetchSessions();
    fetchActiveSemester();
    fetchCourseInfo();
  }, [courseId]);
  const fetchSessions = async () => {
    try {
      setLoading(true);
      const {
        data,
        error
      } = await supabase.from('gw_course_class_sessions').select('*').eq('course_id', courseId).order('session_date', {
        ascending: true
      });
      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load class sessions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const fetchActiveSemester = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('gw_semesters').select('*').eq('is_active', true).single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        const exceptionDates = Array.isArray(data.exception_dates) ? data.exception_dates as unknown as string[] : [];
        const academicEvents = Array.isArray(data.academic_events) ? data.academic_events as unknown as Semester['academic_events'] : [];
        setActiveSemester({
          ...data,
          exception_dates: exceptionDates,
          academic_events: academicEvents
        });
      }
    } catch (error) {
      console.error('Error fetching semester:', error);
    }
  };
  const fetchCourseInfo = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('gw_courses').select('id, meeting_patterns').eq('id', courseId).single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setCourseInfo({
          id: data.id,
          meeting_patterns: data.meeting_patterns as CourseInfo['meeting_patterns'],
          classroom: null
        });
      }
    } catch (error) {
      console.error('Error fetching course info:', error);
    }
  };

  // Generate semester class sessions automatically
  const generateSemesterSessions = async () => {
    if (!activeSemester || !courseInfo?.meeting_patterns || !user) {
      toast({
        title: 'Cannot Generate',
        description: 'No active semester or course meeting pattern configured',
        variant: 'destructive'
      });
      return;
    }
    const {
      days,
      startTime,
      endTime
    } = courseInfo.meeting_patterns;
    if (!days || days.length === 0) {
      toast({
        title: 'No Schedule',
        description: 'Course has no meeting days configured',
        variant: 'destructive'
      });
      return;
    }
    try {
      setGeneratingSessions(true);

      // Generate all dates for the semester based on meeting pattern
      const start = new Date(activeSemester.start_date);
      const end = new Date(activeSemester.classes_end_date || activeSemester.end_date);
      const exceptionSet = new Set(activeSemester.exception_dates);
      const sessionDates: Date[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        const dateStr = d.toISOString().split('T')[0];
        if (days.includes(dayOfWeek) && !exceptionSet.has(dateStr)) {
          sessionDates.push(new Date(d));
        }
      }
      if (sessionDates.length === 0) {
        toast({
          title: 'No Dates',
          description: 'No valid class dates found for this semester',
          variant: 'destructive'
        });
        return;
      }

      // Check for existing sessions
      const {
        count
      } = await supabase.from('gw_course_class_sessions').select('*', {
        count: 'exact',
        head: true
      }).eq('course_id', courseId);
      if ((count || 0) > 0) {
        const confirmed = window.confirm(`This course already has ${count} sessions. This will add ${sessionDates.length} new sessions. Continue?`);
        if (!confirmed) {
          setGeneratingSessions(false);
          return;
        }
      }

      // Create sessions
      const sessionsToCreate = sessionDates.map((date, index) => ({
        course_id: courseId,
        title: `${courseCode} - Class ${index + 1}`,
        description: `Week ${Math.floor(index / days.length) + 1} session`,
        session_date: date.toISOString().split('T')[0],
        start_time: startTime,
        end_time: endTime,
        location: courseInfo.classroom,
        session_type: 'class',
        image_url: conductingImage,
        attendance_required: true,
        created_by: user.id
      }));
      const {
        error
      } = await supabase.from('gw_course_class_sessions').insert(sessionsToCreate);
      if (error) throw error;
      toast({
        title: 'Sessions Generated',
        description: `Created ${sessionDates.length} class sessions for ${activeSemester.name}`
      });
      fetchSessions();
    } catch (error) {
      console.error('Error generating sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate sessions',
        variant: 'destructive'
      });
    } finally {
      setGeneratingSessions(false);
    }
  };

  // Calendar helpers
  const getSessionsForDate = (date: Date) => {
    return sessions.filter(session => {
      const sessionDate = parseISO(session.session_date);
      return isSameDay(sessionDate, date);
    });
  };
  const selectedDateSessions = useMemo(() => {
    if (!selectedDate) return [];
    return getSessionsForDate(selectedDate);
  }, [selectedDate, sessions]);

  // Create session (with optional recurrence)
  const handleCreateSession = async () => {
    if (!newSession.title || !newSession.session_date) {
      toast({
        title: 'Error',
        description: 'Please fill in required fields',
        variant: 'destructive'
      });
      return;
    }

    // Validate recurring settings
    if (newSession.is_recurring) {
      if (newSession.recurring_frequency === 'weekly' && newSession.recurring_days.length === 0) {
        toast({
          title: 'Error',
          description: 'Please select at least one day for weekly recurrence',
          variant: 'destructive'
        });
        return;
      }
      if (!newSession.recurring_end_date) {
        toast({
          title: 'Error',
          description: 'Please set an end date for recurring sessions',
          variant: 'destructive'
        });
        return;
      }
    }

    try {
      setCreating(true);

      if (newSession.is_recurring) {
        // Generate recurring sessions
        const sessionsToCreate = generateRecurringSessions();
        if (sessionsToCreate.length === 0) {
          toast({
            title: 'No Sessions',
            description: 'No sessions could be generated with the specified pattern',
            variant: 'destructive'
          });
          setCreating(false);
          return;
        }

        const { error } = await supabase.from('gw_course_class_sessions').insert(sessionsToCreate);
        if (error) throw error;

        toast({
          title: 'Success',
          description: `Created ${sessionsToCreate.length} recurring sessions`
        });
      } else {
        // Single session
        const { error } = await supabase.from('gw_course_class_sessions').insert({
          course_id: courseId,
          title: newSession.title,
          description: newSession.description || null,
          session_date: newSession.session_date,
          start_time: newSession.start_time,
          end_time: newSession.end_time,
          location: newSession.location || null,
          session_type: newSession.session_type,
          image_url: conductingImage,
          attendance_required: newSession.attendance_required,
          created_by: user?.id
        });
        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Class session created'
        });
      }

      setCreateDialogOpen(false);
      resetNewSession();
      fetchSessions();
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: 'Error',
        description: 'Failed to create session',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const resetNewSession = () => {
    setNewSession({
      title: '',
      description: '',
      session_date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: '10:30',
      location: '',
      session_type: 'class',
      attendance_required: true,
      is_recurring: false,
      recurring_frequency: 'weekly',
      recurring_days: [],
      recurring_end_date: ''
    });
  };

  // Generate recurring sessions based on pattern
  const generateRecurringSessions = () => {
    const sessions: any[] = [];
    const startDate = new Date(newSession.session_date);
    const endDate = new Date(newSession.recurring_end_date);
    const exceptionSet = new Set(activeSemester?.exception_dates || []);
    
    const daysMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6
    };
    
    let currentDate = new Date(startDate);
    let sessionCount = 0;
    const maxSessions = 100; // Safety limit

    while (currentDate <= endDate && sessionCount < maxSessions) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayOfWeek = currentDate.getDay();
      
      let shouldCreate = false;
      
      if (newSession.recurring_frequency === 'daily') {
        shouldCreate = true;
      } else if (newSession.recurring_frequency === 'weekly') {
        const dayName = Object.keys(daysMap).find(key => daysMap[key] === dayOfWeek);
        shouldCreate = dayName ? newSession.recurring_days.includes(dayName) : false;
      } else if (newSession.recurring_frequency === 'monthly') {
        shouldCreate = currentDate.getDate() === startDate.getDate();
      }
      
      // Skip exception dates (holidays, breaks)
      if (shouldCreate && !exceptionSet.has(dateStr)) {
        sessions.push({
          course_id: courseId,
          title: newSession.title,
          description: newSession.description || null,
          session_date: dateStr,
          start_time: newSession.start_time,
          end_time: newSession.end_time,
          location: newSession.location || null,
          session_type: newSession.session_type,
          image_url: conductingImage,
          attendance_required: newSession.attendance_required,
          created_by: user?.id
        });
        sessionCount++;
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return sessions;
  };

  // Calendar navigation helpers based on view
  const navigatePrev = () => {
    if (calendarView === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (calendarView === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subDays(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (calendarView === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (calendarView === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const getCalendarTitle = () => {
    if (calendarView === 'month') {
      return format(currentDate, 'MMMM yyyy');
    } else if (calendarView === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    }
  };

  // Get days for current view
  const getViewDays = () => {
    if (calendarView === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart);
      const calendarEnd = endOfWeek(monthEnd);
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else if (calendarView === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      return [currentDate];
    }
  };

  const viewDays = getViewDays();

  // Generate QR Code for session
  const generateQRCode = async (session: ClassSession) => {
    if (!user) return;
    try {
      setGeneratingQR(true);
      setSelectedSession(session);
      setQrDialogOpen(true);

      // Check for existing active QR code
      const {
        data: existingQR
      } = await supabase.from('gw_attendance_qr_codes').select('*').eq('course_id', courseId).eq('context_type', 'course_session').eq('custom_data->>session_id', session.id).eq('is_active', true).gt('expires_at', new Date().toISOString()).maybeSingle();
      if (existingQR) {
        setQrCode(existingQR as QRCodeData);
        await generateQRImage(existingQR.qr_token);
        await fetchAttendanceCount(session.id);
        setGeneratingQR(false);
        return;
      }

      // Generate new QR code - use session.id as event_id since it's required
      const token = crypto.randomUUID();
      const expiresAt = addHours(new Date(), 4);
      const {
        data: newQR,
        error
      } = await supabase.from('gw_attendance_qr_codes').insert({
        event_id: session.id,
        // Use session ID as event reference
        qr_token: token,
        generated_by: user.id,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        course_id: courseId,
        course_code: courseCode,
        context_type: 'course_session',
        custom_data: {
          session_id: session.id,
          session_title: session.title
        }
      }).select().single();
      if (error) throw error;

      // Update session with QR code ID
      await supabase.from('gw_course_class_sessions').update({
        qr_code_id: newQR.id
      }).eq('id', session.id);
      setQrCode(newQR as QRCodeData);
      await generateQRImage(token);
    } catch (error) {
      console.error('Error generating QR:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate QR code',
        variant: 'destructive'
      });
    } finally {
      setGeneratingQR(false);
    }
  };
  const generateQRImage = async (token: string) => {
    const baseUrl = window.location.hostname.includes('lovable') ? 'https://gleeworld.org' : window.location.origin;
    const attendanceUrl = `${baseUrl}/attendance/scan?token=${encodeURIComponent(token)}`;
    const qrDataURL = await QRCode.toDataURL(attendanceUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    setQrImageData(qrDataURL);
  };
  const fetchAttendanceCount = async (sessionId: string) => {
    const {
      count
    } = await supabase.from('gw_course_attendance').select('*', {
      count: 'exact',
      head: true
    }).eq('course_id', courseId);
    setAttendanceCount(count || 0);
  };
  const downloadQR = () => {
    if (!qrImageData || !selectedSession) return;
    const link = document.createElement('a');
    link.download = `${selectedSession.title.replace(/\s+/g, '-')}-qr.png`;
    link.href = qrImageData;
    link.click();
  };

  // Delete session
  const deleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this class session?')) return;
    try {
      const {
        error
      } = await supabase.from('gw_course_class_sessions').delete().eq('id', sessionId);
      if (error) throw error;
      toast({
        title: 'Deleted',
        description: 'Class session removed'
      });
      fetchSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete session',
        variant: 'destructive'
      });
    }
  };
  const getSessionTypeConfig = (type: string) => {
    const config = SESSION_TYPES.find(t => t.value === type);
    return config || SESSION_TYPES[0];
  };
  if (loading) {
    return <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>;
  }
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Class Calendar</h2>
          <p className="text-muted-foreground">
            {activeSemester ? `${activeSemester.name} • ` : ''}Manage class sessions with attendance tracking
          </p>
        </div>
        {isInstructor && <div className="flex items-center gap-2">
            {activeSemester && courseInfo?.meeting_patterns && <Button variant="outline" onClick={generateSemesterSessions} disabled={generatingSessions}>
                {generatingSessions ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate Semester
              </Button>}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#003666]">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Session
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Class Session</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Title *</Label>
                    <Input value={newSession.title} onChange={e => setNewSession(prev => ({
                  ...prev,
                  title: e.target.value
                }))} placeholder="e.g., Conducting Fundamentals" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={newSession.description} onChange={e => setNewSession(prev => ({
                  ...prev,
                  description: e.target.value
                }))} placeholder="Class topics and objectives..." rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Date *</Label>
                      <Input type="date" value={newSession.session_date} onChange={e => setNewSession(prev => ({
                    ...prev,
                    session_date: e.target.value
                  }))} />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={newSession.session_type} onValueChange={value => setNewSession(prev => ({
                    ...prev,
                    session_type: value
                  }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SESSION_TYPES.map(type => <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time</Label>
                      <Input type="time" value={newSession.start_time} onChange={e => setNewSession(prev => ({
                    ...prev,
                    start_time: e.target.value
                  }))} />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input type="time" value={newSession.end_time} onChange={e => setNewSession(prev => ({
                    ...prev,
                    end_time: e.target.value
                  }))} />
                    </div>
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input value={newSession.location} onChange={e => setNewSession(prev => ({
                  ...prev,
                  location: e.target.value
                }))} placeholder="e.g., Music Building Room 101" />
                  </div>

                  {/* Recurrence Options */}
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Repeat className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">Repeat Session</p>
                        <p className="text-xs text-muted-foreground">Create recurring sessions</p>
                      </div>
                    </div>
                    <Switch
                      checked={newSession.is_recurring}
                      onCheckedChange={(checked) => setNewSession(prev => ({ ...prev, is_recurring: checked }))}
                    />
                  </div>

                  {newSession.is_recurring && (
                    <div className="space-y-4 p-3 rounded-lg border bg-muted/20">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Frequency</Label>
                          <Select
                            value={newSession.recurring_frequency}
                            onValueChange={(value) => setNewSession(prev => ({ ...prev, recurring_frequency: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>End Date *</Label>
                          <Input
                            type="date"
                            value={newSession.recurring_end_date}
                            onChange={(e) => setNewSession(prev => ({ ...prev, recurring_end_date: e.target.value }))}
                          />
                        </div>
                      </div>

                      {newSession.recurring_frequency === 'weekly' && (
                        <div className="space-y-2">
                          <Label>Repeat on Days *</Label>
                          <div className="flex flex-wrap gap-2">
                            {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => (
                              <label key={day} className="flex items-center space-x-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newSession.recurring_days.includes(day)}
                                  onChange={(e) => {
                                    const updatedDays = e.target.checked
                                      ? [...newSession.recurring_days, day]
                                      : newSession.recurring_days.filter(d => d !== day);
                                    setNewSession(prev => ({ ...prev, recurring_days: updatedDays }));
                                  }}
                                  className="rounded border-gray-300"
                                />
                                <span className="text-sm capitalize">{day.slice(0, 3)}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeSemester && (
                        <p className="text-xs text-muted-foreground">
                          Sessions will respect {activeSemester.exception_dates.length} exception dates from {activeSemester.name}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetNewSession(); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateSession} disabled={creating} className="bg-[#003666]">
                    {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    {newSession.is_recurring ? 'Create Sessions' : 'Create Session'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>}
      </div>

      {/* Tabs for Class Sessions vs Spelman Calendar */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'class' | 'spelman')}>
        <TabsList className="mb-4">
          <TabsTrigger value="class" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Class Sessions
          </TabsTrigger>
          <TabsTrigger value="spelman" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Spelman Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="class">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {getCalendarTitle()}
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* View Toggle */}
                  <ToggleGroup type="single" value={calendarView} onValueChange={(v) => v && setCalendarView(v as 'month' | 'week' | 'day')} className="border rounded-md">
                    <ToggleGroupItem value="month" size="sm" className="text-xs px-2">Month</ToggleGroupItem>
                    <ToggleGroupItem value="week" size="sm" className="text-xs px-2">Week</ToggleGroupItem>
                    <ToggleGroupItem value="day" size="sm" className="text-xs px-2">Day</ToggleGroupItem>
                  </ToggleGroup>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" onClick={navigatePrev}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                      Today
                    </Button>
                    <Button variant="outline" size="icon" onClick={navigateNext}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Month View */}
                {calendarView === 'month' && (
                  <>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {viewDays.map((day, i) => {
                        const daySessions = getSessionsForDate(day);
                        const daySpelmanEvents = spelmanEvents.filter(e => {
                          const eventDate = parseISO(e.start_date);
                          return isSameDay(eventDate, day);
                        });
                        const isHoliday = activeSemester?.exception_dates.includes(format(day, 'yyyy-MM-dd'));
                        const isToday = isSameDay(day, new Date());
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        const isCurrentMonth = isSameMonth(day, currentDate);
                        return (
                          <button key={i} onClick={() => setSelectedDate(day)} className={cn("min-h-[80px] p-1 rounded-lg border text-left transition-colors", !isCurrentMonth && "opacity-40", isHoliday && "bg-amber-50 border-amber-300", isToday && "border-primary", isSelected && "bg-primary/10 border-primary", !isSelected && !isHoliday && "hover:bg-accent")}>
                            <div className={cn("text-sm font-medium mb-1 flex items-center gap-1 text-primary-foreground", isToday && "text-primary", isHoliday && "text-amber-600")}>
                              {format(day, 'd')}
                              {isHoliday && <AlertCircle className="h-3 w-3" />}
                            </div>
                            <div className="space-y-0.5">
                              {daySpelmanEvents.slice(0, 1).map(event => (
                                <div key={event.id} className="text-xs bg-amber-100 rounded px-1 py-0.5 truncate text-black">
                                  {event.title}
                                </div>
                              ))}
                              {daySessions.slice(0, isHoliday ? 1 : 2).map(session => {
                                const typeConfig = getSessionTypeConfig(session.session_type);
                                return (
                                  <div key={session.id} className="text-xs bg-[#003666]/10 text-[#003666] rounded px-1 py-0.5 truncate flex items-center gap-1">
                                    <typeConfig.icon className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{session.title}</span>
                                  </div>
                                );
                              })}
                              {daySessions.length + daySpelmanEvents.length > 2 && (
                                <div className="text-xs text-muted-foreground">
                                  +{daySessions.length + daySpelmanEvents.length - 2} more
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Week View */}
                {calendarView === 'week' && (
                  <>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {viewDays.map((day, i) => {
                        const isToday = isSameDay(day, new Date());
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        return (
                          <div key={i} className={cn("text-center py-2 rounded-t-lg", isToday && "bg-primary/10", isSelected && "bg-primary/20")}>
                            <div className="text-xs font-medium text-muted-foreground">{format(day, 'EEE')}</div>
                            <div className={cn("text-lg font-bold", isToday && "text-primary")}>{format(day, 'd')}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {viewDays.map((day, i) => {
                        const daySessions = getSessionsForDate(day);
                        const daySpelmanEvents = spelmanEvents.filter(e => {
                          const eventDate = parseISO(e.start_date);
                          return isSameDay(eventDate, day);
                        });
                        const isHoliday = activeSemester?.exception_dates.includes(format(day, 'yyyy-MM-dd'));
                        const isToday = isSameDay(day, new Date());
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        return (
                          <button
                            key={i}
                            onClick={() => setSelectedDate(day)}
                            className={cn(
                              "min-h-[200px] p-2 rounded-lg border text-left transition-colors",
                              isHoliday && "bg-amber-50 border-amber-300",
                              isToday && "border-primary",
                              isSelected && "bg-primary/10 border-primary ring-1 ring-primary",
                              !isSelected && !isHoliday && "hover:bg-accent"
                            )}
                          >
                            {isHoliday && (
                              <div className="flex items-center gap-1 text-amber-600 text-xs mb-2">
                                <AlertCircle className="h-3 w-3" />
                                Holiday
                              </div>
                            )}
                            <div className="space-y-1">
                              {daySpelmanEvents.map(event => (
                                <div key={event.id} className="text-xs bg-amber-100 rounded px-1.5 py-1 text-black">
                                  {event.title}
                                </div>
                              ))}
                              {daySessions.map(session => {
                                const typeConfig = getSessionTypeConfig(session.session_type);
                                return (
                                  <div key={session.id} className="text-xs bg-[#003666]/10 text-[#003666] rounded px-1.5 py-1">
                                    <div className="flex items-center gap-1 font-medium">
                                      <typeConfig.icon className="h-3 w-3 flex-shrink-0" />
                                      <span className="truncate">{session.title}</span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                      {session.start_time} - {session.end_time}
                                    </div>
                                  </div>
                                );
                              })}
                              {daySessions.length === 0 && daySpelmanEvents.length === 0 && !isHoliday && (
                                <div className="text-xs text-muted-foreground text-center py-4">No sessions</div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Day View */}
                {calendarView === 'day' && (
                  <div className="space-y-4">
                    {(() => {
                      const daySessions = getSessionsForDate(currentDate);
                      const daySpelmanEvents = spelmanEvents.filter(e => {
                        const eventDate = parseISO(e.start_date);
                        return isSameDay(eventDate, currentDate);
                      });
                      const isHoliday = activeSemester?.exception_dates.includes(format(currentDate, 'yyyy-MM-dd'));
                      
                      return (
                        <>
                          {isHoliday && (
                            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-700">
                              <AlertCircle className="h-5 w-5" />
                              <span>This is an exception date (holiday/break)</span>
                            </div>
                          )}
                          
                          {daySpelmanEvents.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm text-muted-foreground">Spelman Events</h4>
                              {daySpelmanEvents.map(event => (
                                <div key={event.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                  <div className="font-medium">{event.title}</div>
                                  {event.location && <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" />{event.location}</div>}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground">Class Sessions ({daySessions.length})</h4>
                            {daySessions.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                <p>No classes scheduled for this day</p>
                                {isInstructor && (
                                  <Button size="sm" variant="outline" className="mt-3" onClick={() => {
                                    setNewSession(prev => ({ ...prev, session_date: format(currentDate, 'yyyy-MM-dd') }));
                                    setCreateDialogOpen(true);
                                  }}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Session
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {daySessions.map(session => {
                                  const typeConfig = getSessionTypeConfig(session.session_type);
                                  return (
                                    <div key={session.id} className="border rounded-lg overflow-hidden">
                                      {session.image_url && <img src={session.image_url} alt={session.title} className="w-full h-32 object-cover" />}
                                      <div className="p-4 space-y-3">
                                        <div className="flex items-start justify-between">
                                          <div>
                                            <Badge variant="outline" className="mb-1">
                                              <typeConfig.icon className="h-3 w-3 mr-1" />
                                              {typeConfig.label}
                                            </Badge>
                                            <h4 className="font-semibold text-lg">{session.title}</h4>
                                          </div>
                                          {session.attendance_required && (
                                            <Badge className="bg-green-500/10 text-green-600">
                                              <CheckCircle className="h-3 w-3 mr-1" />
                                              Attendance
                                            </Badge>
                                          )}
                                        </div>
                                        {session.description && <p className="text-sm text-muted-foreground">{session.description}</p>}
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                          <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{session.start_time} - {session.end_time}</span>
                                          {session.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{session.location}</span>}
                                        </div>
                                        {isInstructor && (
                                          <div className="flex items-center gap-2 pt-3 border-t">
                                            <Button size="sm" variant="outline" onClick={() => generateQRCode(session)} className="flex-1">
                                              <QrCode className="h-4 w-4 mr-2" />
                                              QR Attendance
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => deleteSession(session.id)} className="text-destructive">
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

        {/* Selected Date Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a Date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate ? <ScrollArea className="h-[400px]">
                {selectedDateSessions.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No classes scheduled</p>
                    {isInstructor && <Button size="sm" variant="outline" className="mt-4" onClick={() => {
                    setNewSession(prev => ({
                      ...prev,
                      session_date: format(selectedDate, 'yyyy-MM-dd')
                    }));
                    setCreateDialogOpen(true);
                  }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Session
                      </Button>}
                  </div> : <div className="space-y-4">
                    {selectedDateSessions.map(session => {
                    const typeConfig = getSessionTypeConfig(session.session_type);
                    return <div key={session.id} className="border rounded-lg overflow-hidden">
                          {session.image_url && <img src={session.image_url} alt={session.title} className="w-full h-32 object-cover" />}
                          <div className="p-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <Badge variant="outline" className="mb-1">
                                  <typeConfig.icon className="h-3 w-3 mr-1" />
                                  {typeConfig.label}
                                </Badge>
                                <h4 className="font-semibold">{session.title}</h4>
                              </div>
                              {session.attendance_required && <Badge className="bg-green-500/10 text-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Attendance
                                </Badge>}
                            </div>
                            
                            {session.description && <p className="text-sm text-muted-foreground line-clamp-2">
                                {session.description}
                              </p>}
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {session.start_time} - {session.end_time}
                              </span>
                              {session.location && <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {session.location}
                                </span>}
                            </div>
                            
                            {isInstructor && <div className="flex items-center gap-2 pt-2 border-t">
                                <Button size="sm" variant="outline" onClick={() => generateQRCode(session)} className="flex-1">
                                  <QrCode className="h-4 w-4 mr-2" />
                                  QR Attendance
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => deleteSession(session.id)} className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>}
                          </div>
                        </div>;
                  })}
                  </div>}
              </ScrollArea> : <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-primary-foreground">Click a date to view sessions</p>
              </div>}
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="spelman">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Spelman Academic Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {spelmanLoading ? <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div> : <div className="space-y-4">
                  {/* Semester Info */}
                  {activeSemester && <div className="bg-muted/50 rounded-lg p-4 mb-4">
                      <h3 className="font-semibold mb-2">{activeSemester.name}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Start:</span>
                          <p className="font-medium">{format(parseISO(activeSemester.start_date), 'MMM d, yyyy')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Classes End:</span>
                          <p className="font-medium">{activeSemester.classes_end_date ? format(parseISO(activeSemester.classes_end_date), 'MMM d, yyyy') : 'TBD'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Finals:</span>
                          <p className="font-medium">{activeSemester.academic_events.find(e => e.title.includes('Final'))?.start_date ? format(parseISO(activeSemester.academic_events.find(e => e.title.includes('Final'))?.start_date || ''), 'MMM d') : 'TBD'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Semester End:</span>
                          <p className="font-medium">{format(parseISO(activeSemester.end_date), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                    </div>}
                  
                  {/* Academic Events */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Important Dates</h4>
                    {activeSemester?.academic_events.map((event, idx) => <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg", event.type === 'holiday' && "bg-red-100 text-red-600", event.type === 'break' && "bg-amber-100 text-amber-600", event.type === 'academic' && "bg-blue-100 text-blue-600")}>
                            {event.type === 'holiday' && <AlertCircle className="h-4 w-4" />}
                            {event.type === 'break' && <CalendarIcon className="h-4 w-4" />}
                            {event.type === 'academic' && <GraduationCap className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {event.date ? format(parseISO(event.date), 'EEEE, MMMM d, yyyy') : event.start_date && event.end_date ? `${format(parseISO(event.start_date), 'MMM d')} - ${format(parseISO(event.end_date), 'MMM d, yyyy')}` : 'Date TBD'}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn(event.type === 'holiday' && "border-red-300 text-red-600", event.type === 'break' && "border-amber-300 text-amber-600", event.type === 'academic' && "border-blue-300 text-blue-600")}>
                          {event.type === 'holiday' ? 'No Classes' : event.type === 'break' ? 'Break' : 'Academic'}
                        </Badge>
                      </div>)}
                  </div>

                  {/* GleeWorld Events */}
                  {spelmanEvents.length > 0 && <div className="space-y-2 mt-6">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Upcoming Events</h4>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {spelmanEvents.filter(e => new Date(e.start_date) >= new Date()).slice(0, 10).map(event => <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                  <p className="font-medium">{event.title}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {format(parseISO(event.start_date), 'EEE, MMM d • h:mm a')}
                                  </p>
                                </div>
                                {event.event_type && <Badge variant="secondary">{event.event_type}</Badge>}
                              </div>)}
                        </div>
                      </ScrollArea>
                    </div>}
                </div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Attendance QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {generatingQR ? <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div> : qrImageData ? <>
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg shadow-lg">
                    <img src={qrImageData} alt="QR Code" className="w-64 h-64" />
                  </div>
                </div>
                
                <div className="text-center">
                  <h3 className="font-semibold">{selectedSession?.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Scan to mark attendance
                  </p>
                </div>
                
                {qrCode && <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {qrCode.scan_count} scans
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Expires {format(new Date(qrCode.expires_at), 'h:mm a')}
                    </span>
                  </div>}
                
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={downloadQR}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" onClick={() => selectedSession && generateQRCode(selectedSession)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </> : <div className="text-center py-8 text-muted-foreground">
                <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No QR code generated</p>
              </div>}
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};