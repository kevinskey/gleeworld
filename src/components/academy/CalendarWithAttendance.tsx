import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, Clock, MapPin, ChevronLeft, ChevronRight,
  UserCheck, CheckCircle, XCircle, AlertTriangle, Send, Mail, FileText,
  ThumbsUp, ThumbsDown, Inbox, Upload, User, X, Camera, TrendingUp, CalendarDays
} from 'lucide-react';
import { QuickCameraCapture } from '@/components/camera/QuickCameraCapture';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMessenger } from '@/contexts/MessengerContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfDay, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const EXCUSE_TYPES = [
  { value: 'class_conflict', label: 'Class Conflict' },
  { value: 'illness', label: 'Illness' },
  { value: 'family_emergency', label: 'Family Emergency' },
  { value: 'death_in_family', label: 'Death in Family' },
  { value: 'medical_appointment', label: 'Medical Appointment' },
  { value: 'academic_obligation', label: 'Academic Obligation' },
  { value: 'religious_observance', label: 'Religious Observance' },
  { value: 'travel_delay', label: 'Travel Delay' },
  { value: 'other', label: 'Other' },
];

interface CalendarWithAttendanceProps {
  courseId: string;
  isEnrolled?: boolean;
  isAdmin?: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
}

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  status: string;
  notes: string | null;
}

interface ExcuseRequest {
  id: string;
  student_id: string;
  course_id: string;
  event_ids: string[];
  excuse_type: string;
  clarification: string | null;
  document_url: string | null;
  document_filename: string | null;
  status: 'pending' | 'approved' | 'denied';
  response_message: string | null;
  responded_at: string | null;
  created_at: string;
}

export const CalendarWithAttendance: React.FC<CalendarWithAttendanceProps> = ({ 
  courseId, 
  isEnrolled = true,
  isAdmin = false 
}) => {
  const { user } = useAuth();
  const { openMessenger } = useMessenger();
  
  // Calendar state
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Attendance state
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, excused: 0 });
  
  // Excuse state
  const [excuseRequests, setExcuseRequests] = useState<ExcuseRequest[]>([]);
  const [showExcuseDialog, setShowExcuseDialog] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [excuseType, setExcuseType] = useState('');
  const [excuseDocument, setExcuseDocument] = useState<File | null>(null);
  const [excuseDocumentPreview, setExcuseDocumentPreview] = useState<string | null>(null);
  const [excuseClarification, setExcuseClarification] = useState('');
  const [submittingExcuse, setSubmittingExcuse] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  // Student profile
  const [studentName, setStudentName] = useState('');
  
  // Secretary email for messenger
  const [secretaryEmail, setSecretaryEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchCalendarEvents();
    fetchSecretaryEmail();
    if (isEnrolled && user) {
      fetchAttendance();
      fetchExcuseRequests();
      fetchStudentProfile();
    }
  }, [courseId, currentMonth, isEnrolled, user]);

  const fetchSecretaryEmail = async () => {
    try {
      const { data } = await supabase
        .from('gw_profiles')
        .select('email')
        .or(`exec_board_role.ilike.%secretary%,role_tags.cs.{secretary},special_roles.cs.{secretary}`)
        .limit(1)
        .single();
      if (data?.email) {
        setSecretaryEmail(data.email);
      }
    } catch (error) {
      console.error('Error fetching secretary email:', error);
    }
  };

  const fetchStudentProfile = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('gw_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();
      if (data?.full_name) {
        setStudentName(data.full_name);
      }
    } catch (error) {
      console.error('Error fetching student profile:', error);
    }
  };

  const handleEmailSecretary = () => {
    const selectedEvents = events.filter(e => selectedEventIds.includes(e.id));
    const eventDetails = selectedEvents.map(e => 
      `- ${e.title} (${format(new Date(e.start_time), 'MMM d, yyyy h:mm a')})`
    ).join('\n');
    
    const excuseLabel = EXCUSE_TYPES.find(t => t.value === excuseType)?.label || excuseType;
    
    openMessenger({
      recipientEmail: secretaryEmail || '',
      subject: `Excuse Request - ${studentName || 'Student'}`,
      content: `Dear Glee Secretary,\n\nI am writing regarding my absence for the following event(s):\n${eventDetails}\n\nReason: ${excuseLabel}\n${excuseClarification ? `\nAdditional details: ${excuseClarification}` : ''}\n\nThank you for your understanding.\n\nSincerely,\n${studentName || 'Student'}`
    });
  };

  const fetchCalendarEvents = async () => {
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      // Unified approach: All courses fetch events by course_id from gw_events
      // and include assignments from gw_course_assignments
      
      // Fetch course events from gw_events filtered by course_id
      const { data: eventsData, error: eventsError } = await supabase
        .from('gw_events')
        .select('id, title, description, event_type, start_date, location')
        .eq('course_id', courseId)
        .gte('start_date', start.toISOString())
        .lte('start_date', end.toISOString())
        .order('start_date', { ascending: true });

      let gwEventsData: CalendarEvent[] = [];
      if (!eventsError && eventsData) {
        gwEventsData = eventsData.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          event_type: event.event_type || 'class',
          start_time: event.start_date,
          end_time: null,
          location: event.location
        }));
      }
      
      // Fetch course assignments to show on calendar
      const { data: assignmentsData } = await supabase
        .from('gw_course_assignments')
        .select('id, title, description, due_date')
        .eq('course_id', courseId)
        .gte('due_date', start.toISOString())
        .lte('due_date', end.toISOString())
        .order('due_date', { ascending: true });

      const assignmentEvents: CalendarEvent[] = (assignmentsData || []).map(a => ({
        id: a.id,
        title: a.title,
        description: a.description,
        event_type: 'assignment_due',
        start_time: a.due_date,
        end_time: null,
        location: null
      }));

      // Fetch course discussions with due dates to show on calendar
      const { data: discussionsData } = await supabase
        .from('course_discussions')
        .select('id, title, content, due_date, is_graded, max_points')
        .eq('course_id', courseId)
        .not('due_date', 'is', null)
        .gte('due_date', start.toISOString())
        .lte('due_date', end.toISOString())
        .order('due_date', { ascending: true });

      const discussionEvents: CalendarEvent[] = (discussionsData || []).map(d => ({
        id: `discussion-${d.id}`,
        title: `💬 ${d.title}`,
        description: d.content,
        event_type: 'discussion',
        start_time: d.due_date,
        end_time: null,
        location: null
      }));

      // Also fetch from gw_course_calendar for legacy course calendar events
      const { data: courseCalendarData } = await supabase
        .from('gw_course_calendar')
        .select('*')
        .eq('course_id', courseId)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });
      
      // Combine all sources, avoiding duplicates by id
      const allEvents = [...gwEventsData, ...assignmentEvents, ...discussionEvents, ...(courseCalendarData || [])];
      const uniqueEvents = allEvents.filter((event, index, self) => 
        index === self.findIndex(e => e.id === event.id)
      );
      
      setEvents(uniqueEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_course_attendance')
        .select('*')
        .eq('course_id', courseId)
        .eq('student_id', user?.id)
        .order('attendance_date', { ascending: false });

      if (error) throw error;

      setAttendanceRecords(data || []);

      // Calculate stats
      const newStats = { present: 0, absent: 0, late: 0, excused: 0 };
      data?.forEach(record => {
        if (record.status in newStats) {
          newStats[record.status as keyof typeof newStats]++;
        }
      });
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const fetchExcuseRequests = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('gw_excuse_requests')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const typedData = (data || []).map(d => ({
        ...d,
        status: d.status as 'pending' | 'approved' | 'denied'
      }));
      setExcuseRequests(typedData);
    } catch (error) {
      console.error('Error fetching excuse requests:', error);
    }
  };

  const handleSubmitExcuse = async () => {
    if (!user) {
      toast.error('You must be logged in to submit an excuse');
      return;
    }
    
    if (selectedEventIds.length === 0 || !excuseType) {
      toast.error('Please select at least one event and an excuse type');
      return;
    }

    setSubmittingExcuse(true);
    try {
      let documentUrl: string | null = null;
      let documentFilename: string | null = null;

      if (excuseDocument) {
        const fileExt = excuseDocument.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-excuse-doc.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('excuse-documents')
          .upload(fileName, excuseDocument, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading document:', uploadError);
          toast.error('Failed to upload document');
          return;
        }

        const { data: urlData } = supabase.storage
          .from('excuse-documents')
          .getPublicUrl(uploadData.path);
        
        documentUrl = urlData.publicUrl;
        documentFilename = excuseDocument.name;
      }

      const { data: insertData, error: insertError } = await supabase
        .from('gw_excuse_requests')
        .insert({
          student_id: user.id,
          course_id: courseId,
          event_ids: selectedEventIds,
          excuse_type: excuseType,
          clarification: excuseClarification || null,
          document_url: documentUrl,
          document_filename: documentFilename,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success('Excuse request submitted successfully');
      setShowExcuseDialog(false);
      resetExcuseForm();
      
      if (insertData) {
        const typedInsertData = {
          ...insertData,
          status: insertData.status as 'pending' | 'approved' | 'denied'
        };
        setExcuseRequests(prev => [typedInsertData, ...prev]);
      }
    } catch (error) {
      console.error('Error submitting excuse:', error);
      toast.error('Failed to submit excuse request');
    } finally {
      setSubmittingExcuse(false);
    }
  };

  const resetExcuseForm = () => {
    setSelectedEventIds([]);
    setExcuseType('');
    setExcuseDocument(null);
    setExcuseDocumentPreview(null);
    setExcuseClarification('');
  };

  const handleCameraCapture = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `excuse-doc-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      setExcuseDocument(file);
      setExcuseDocumentPreview(imageUrl);
      setShowCamera(false);
      toast.success('Photo captured successfully!');
    } catch (error) {
      console.error('Error processing captured image:', error);
      toast.error('Failed to process captured image');
    }
  };

  const handleEventSelection = (eventId: string, checked: boolean) => {
    if (checked) {
      setSelectedEventIds(prev => [...prev, eventId]);
    } else {
      setSelectedEventIds(prev => prev.filter(id => id !== eventId));
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setExcuseDocument(file);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'late':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'excused':
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const total = stats.present + stats.absent + stats.late + stats.excused;
  const attendanceRate = total > 0 ? Math.round((stats.present + stats.late) / total * 100) : 100;

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.start_time), day));
  };

  const upcomingEvents = events
    .filter(e => new Date(e.start_time) >= startOfDay(new Date()))
    .slice(0, 10);

  // Get first day of month to calculate offset
  const firstDayOfMonth = startOfMonth(currentMonth);
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Get events for selected date
  const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile-First Attendance Stats */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/20 rounded-xl">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base md:text-lg">Attendance</h3>
              <p className="text-xs text-muted-foreground">Your attendance overview</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl md:text-4xl font-bold text-primary">{attendanceRate}%</span>
            <p className="text-xs text-muted-foreground">Overall Rate</p>
          </div>
        </div>
        
        <Progress value={attendanceRate} className="h-2 mb-4" />
        
        {/* Stats Grid - Mobile: 2x2, Desktop: 4 columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-background/60 backdrop-blur-sm rounded-xl p-3 text-center border border-green-500/20">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xl md:text-2xl font-bold text-green-600">{stats.present}</span>
            </div>
            <p className="text-xs text-muted-foreground">Present</p>
          </div>
          <div className="bg-background/60 backdrop-blur-sm rounded-xl p-3 text-center border border-yellow-500/20">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-xl md:text-2xl font-bold text-yellow-600">{stats.late}</span>
            </div>
            <p className="text-xs text-muted-foreground">Late</p>
          </div>
          <div className="bg-background/60 backdrop-blur-sm rounded-xl p-3 text-center border border-red-500/20">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-xl md:text-2xl font-bold text-red-600">{stats.absent}</span>
            </div>
            <p className="text-xs text-muted-foreground">Absent</p>
          </div>
          <div className="bg-background/60 backdrop-blur-sm rounded-xl p-3 text-center border border-blue-500/20">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <AlertTriangle className="h-4 w-4 text-blue-500" />
              <span className="text-xl md:text-2xl font-bold text-blue-600">{stats.excused}</span>
            </div>
            <p className="text-xs text-muted-foreground">Excused</p>
          </div>
        </div>
      </div>

      {/* Quick Action Button - Mobile Optimized */}
      <Button 
        onClick={() => setShowExcuseDialog(true)}
        className="w-full md:w-auto gap-2 h-12 text-base font-medium"
        size="lg"
      >
        <FileText className="h-5 w-5" />
        Submit Excuse Request
      </Button>

      {/* Calendar Section - Mobile First */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 px-3 md:px-6">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="h-9 w-9"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg md:text-xl font-bold">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="h-9 w-9"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="px-2 md:px-6 pb-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before the first of the month */}
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            
            {days.map((day) => {
              const dayEvents = getEventsForDay(day);
              const hasEvents = dayEvents.length > 0;
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(isSelected ? null : day)}
                  className={cn(
                    "aspect-square relative flex flex-col items-center justify-center rounded-lg text-sm transition-all",
                    "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/50",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                    isTodayDate && !isSelected && "bg-accent font-bold",
                    !isSameMonth(day, currentMonth) && "text-muted-foreground/50"
                  )}
                >
                  <span className={cn(
                    "text-xs md:text-sm",
                    isTodayDate && !isSelected && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {hasEvents && (
                    <div className={cn(
                      "absolute bottom-1 flex gap-0.5",
                    )}>
                      {dayEvents.slice(0, 3).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-1 h-1 md:w-1.5 md:h-1.5 rounded-full",
                            isSelected ? "bg-primary-foreground" : "bg-primary"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Selected Date Events */}
          {selectedDate && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                {format(selectedDate, 'EEEE, MMMM d')}
              </h4>
              {selectedDateEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No events scheduled
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedDateEvents.map(event => (
                    <div
                      key={event.id}
                      className={cn(
                        "p-3 bg-accent/50 rounded-lg border-l-4",
                        event.event_type === 'discussion' ? "border-orange-400" : "border-primary"
                      )}
                    >
                      <p className="font-medium text-sm">{event.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.start_time), 'h:mm a')}
                        {event.location && (
                          <>
                            <MapPin className="h-3 w-3 ml-2" />
                            {event.location}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Events - Compact Mobile View */}
      <Card>
        <CardHeader className="pb-2 px-4 md:px-6">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Upcoming Classes
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 md:px-6 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map(event => (
                <div 
                  key={event.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex flex-col items-center justify-center">
                    <span className="text-xs text-primary uppercase font-medium">
                      {format(new Date(event.start_time), 'MMM')}
                    </span>
                    <span className="text-lg font-bold text-primary leading-none">
                      {format(new Date(event.start_time), 'd')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{event.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(event.start_time), 'h:mm a')}</span>
                      {event.location && (
                        <>
                          <span className="text-muted-foreground/50">•</span>
                          <span className="truncate">{event.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for History - Mobile Optimized */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-11">
          <TabsTrigger value="history" className="gap-2 text-xs md:text-sm">
            <Inbox className="h-4 w-4" />
            <span className="hidden sm:inline">Excuse</span> History
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2 text-xs md:text-sm">
            <UserCheck className="h-4 w-4" />
            Attendance <span className="hidden sm:inline">Log</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <ScrollArea className="h-[280px] md:h-[320px]">
                {excuseRequests.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Inbox className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No excuse requests yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 pr-4">
                    {excuseRequests.map((request) => {
                      const excuseLabel = EXCUSE_TYPES.find(t => t.value === request.excuse_type)?.label || request.excuse_type;
                      return (
                        <div 
                          key={request.id} 
                          className={cn(
                            "p-4 rounded-xl border",
                            request.status === 'approved' && "border-green-200 bg-green-50/50 dark:bg-green-950/20",
                            request.status === 'denied' && "border-red-200 bg-red-50/50 dark:bg-red-950/20",
                            request.status === 'pending' && "border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-medium text-sm">
                                  {format(new Date(request.created_at), 'MMM d, yyyy')}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-xs",
                                    request.status === 'approved' && "border-green-400 text-green-700 bg-green-100",
                                    request.status === 'denied' && "border-red-400 text-red-700 bg-red-100",
                                    request.status === 'pending' && "border-yellow-400 text-yellow-700 bg-yellow-100"
                                  )}
                                >
                                  {request.status === 'approved' && <ThumbsUp className="h-3 w-3 mr-1" />}
                                  {request.status === 'denied' && <ThumbsDown className="h-3 w-3 mr-1" />}
                                  {request.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium">{excuseLabel}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {request.event_ids.length} event(s) • {request.document_filename ? 'Document attached' : 'No document'}
                              </p>
                              {request.response_message && (
                                <div className="mt-2 pl-3 border-l-2 border-primary/30">
                                  <p className="text-sm italic text-muted-foreground">"{request.response_message}"</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <ScrollArea className="h-[280px] md:h-[320px]">
                {attendanceRecords.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <UserCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No attendance records yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 pr-4">
                    {attendanceRecords.slice(0, 15).map(record => (
                      <div 
                        key={record.id}
                        className="flex items-center justify-between p-3 bg-accent/30 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(record.status)}
                          <span className="text-sm">
                            {format(new Date(record.attendance_date), 'EEE, MMM d')}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {record.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Excuse Request Dialog - Mobile Optimized */}
      <Dialog open={showExcuseDialog} onOpenChange={(open) => { setShowExcuseDialog(open); if (!open) resetExcuseForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Submit Excuse
            </DialogTitle>
            <DialogDescription className="text-sm">
              Submit an absence excuse for review
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {/* Student Info */}
            <div className="p-3 bg-accent/50 rounded-xl">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{studentName || user?.email || 'Student'}</span>
              </div>
            </div>

            {/* Event Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Event(s) *</Label>
              <ScrollArea className="h-[140px] border rounded-xl p-2">
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No events this month
                  </p>
                ) : (
                  <div className="space-y-1">
                    {events.map(event => (
                      <div 
                        key={event.id} 
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer"
                        onClick={() => handleEventSelection(event.id, !selectedEventIds.includes(event.id))}
                      >
                        <Checkbox
                          id={`event-${event.id}`}
                          checked={selectedEventIds.includes(event.id)}
                          onCheckedChange={(checked) => handleEventSelection(event.id, checked as boolean)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(event.start_time), 'EEE, MMM d • h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              {selectedEventIds.length > 0 && (
                <p className="text-xs text-primary font-medium">
                  {selectedEventIds.length} event(s) selected
                </p>
              )}
            </div>

            {/* Excuse Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Excuse Type *</Label>
              <Select value={excuseType} onValueChange={setExcuseType}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {EXCUSE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Document Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Supporting Document</Label>
              
              {excuseDocument || excuseDocumentPreview ? (
                <div className="border rounded-xl p-3">
                  {excuseDocumentPreview ? (
                    <div className="relative">
                      <img 
                        src={excuseDocumentPreview} 
                        alt="Document" 
                        className="w-full max-h-32 object-contain rounded-lg"
                      />
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-1 right-1 h-7 w-7"
                        onClick={() => { setExcuseDocument(null); setExcuseDocumentPreview(null); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : excuseDocument && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm truncate max-w-[200px]">{excuseDocument.name}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => setExcuseDocument(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                      <Camera className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs font-medium">Take Photo</span>
                  </button>

                  <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleDocumentChange}
                      className="hidden"
                    />
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-medium">Upload File</span>
                  </label>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Additional Notes</Label>
              <Textarea
                placeholder="Any additional details..."
                value={excuseClarification}
                onChange={(e) => setExcuseClarification(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowExcuseDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitExcuse}
              disabled={submittingExcuse || selectedEventIds.length === 0 || !excuseType}
              className="w-full sm:w-auto gap-2"
            >
              {submittingExcuse ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Excuse
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Dialog */}
      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Capture Document</DialogTitle>
          </DialogHeader>
          <QuickCameraCapture
            onCapture={handleCameraCapture}
            onClose={() => setShowCamera(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {format(new Date(selectedEvent.start_time), 'EEEE, MMMM d, yyyy • h:mm a')}
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {selectedEvent.location}
                </div>
              )}
              {selectedEvent.description && (
                <p className="text-sm">{selectedEvent.description}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
