import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar, Clock, MapPin, ChevronLeft, ChevronRight, List, Grid3X3,
  UserCheck, CheckCircle, XCircle, AlertTriangle, Send, Mail, FileText,
  ThumbsUp, ThumbsDown, Inbox, Upload, User, X, Camera
} from 'lucide-react';
import { QuickCameraCapture } from '@/components/camera/QuickCameraCapture';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfDay } from 'date-fns';
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
  event_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  submitted_at: string;
  response_message?: string;
  responded_at?: string;
}

const EVENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  class: { bg: 'bg-blue-200 dark:bg-blue-800', text: 'text-blue-900 dark:text-blue-100', border: 'border-blue-400 dark:border-blue-600' },
  rehearsal: { bg: 'bg-purple-200 dark:bg-purple-800', text: 'text-purple-900 dark:text-purple-100', border: 'border-purple-400 dark:border-purple-600' },
  assignment_due: { bg: 'bg-orange-200 dark:bg-orange-800', text: 'text-orange-900 dark:text-orange-100', border: 'border-orange-400 dark:border-orange-600' },
  test: { bg: 'bg-red-200 dark:bg-red-800', text: 'text-red-900 dark:text-red-100', border: 'border-red-400 dark:border-red-600' },
  office_hours: { bg: 'bg-green-200 dark:bg-green-800', text: 'text-green-900 dark:text-green-100', border: 'border-green-400 dark:border-green-600' },
  special: { bg: 'bg-indigo-200 dark:bg-indigo-800', text: 'text-indigo-900 dark:text-indigo-100', border: 'border-indigo-400 dark:border-indigo-600' },
};

export const CalendarWithAttendance: React.FC<CalendarWithAttendanceProps> = ({ 
  courseId, 
  isEnrolled = true,
  isAdmin = false 
}) => {
  const { user } = useAuth();
  
  // Calendar state
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
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

  useEffect(() => {
    fetchCalendarEvents();
    if (isEnrolled && user) {
      fetchAttendance();
      fetchExcuseRequests();
      fetchStudentProfile();
    }
  }, [courseId, currentMonth, isEnrolled, user]);

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

  const fetchCalendarEvents = async () => {
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      // Fetch from gw_events for MUS 070 (Glee Club)
      let gleeEvents: CalendarEvent[] = [];
      if (courseId === 'a0000000-0000-0000-0000-000000000070') {
        const scgcCalendarId = 'b1e077a0-85f3-4665-b006-4767b310a521';
        
        const { data: eventsData, error: eventsError } = await supabase
          .from('gw_events')
          .select('id, title, description, event_type, start_date, location')
          .or(`calendar_id.eq.${scgcCalendarId},title.ilike.%glee%,title.ilike.%scgc%`)
          .gte('start_date', start.toISOString())
          .lte('start_date', end.toISOString())
          .order('start_date', { ascending: true });

        if (!eventsError) {
          gleeEvents = (eventsData || []).map(event => ({
            id: event.id,
            title: event.title,
            description: event.description,
            event_type: event.event_type || 'rehearsal',
            start_time: event.start_date,
            end_time: null,
            location: event.location
          }));
        }
      }

      // Also fetch course-specific calendar events
      const { data: courseData } = await supabase
        .from('gw_course_calendar')
        .select('*')
        .eq('course_id', courseId)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });

      setEvents([...(courseData || []), ...gleeEvents]);
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
    // For now, we'll simulate excuse requests - in production this would fetch from a real table
    // This can be connected to a gw_excuse_requests table later
    setExcuseRequests([
      // Sample data structure for demonstration
    ]);
  };

  const handleSubmitExcuse = async () => {
    if (selectedEventIds.length === 0 || !excuseType) {
      toast.error('Please select at least one event and an excuse type');
      return;
    }

    setSubmittingExcuse(true);
    try {
      // In production, this would insert into gw_excuse_requests table
      // For now, we'll simulate success
      toast.success('Excuse request submitted successfully');
      setShowExcuseDialog(false);
      resetExcuseForm();
      
      // Add to local state for immediate UI feedback
      const selectedEventsInfo = events
        .filter(e => selectedEventIds.includes(e.id))
        .map(e => e.title)
        .join(', ');
      
      const excuseLabel = EXCUSE_TYPES.find(t => t.value === excuseType)?.label || excuseType;
      
      const newRequest: ExcuseRequest = {
        id: crypto.randomUUID(),
        event_date: new Date().toISOString(),
        reason: `${excuseLabel}: ${selectedEventsInfo}${excuseClarification ? ` - ${excuseClarification}` : ''}`,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      };
      setExcuseRequests(prev => [newRequest, ...prev]);
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
      // Convert the captured image URL to a file
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

  const getEventColors = (type: string) => {
    return EVENT_COLORS[type] || EVENT_COLORS.class;
  };

  const total = stats.present + stats.absent + stats.late + stats.excused;
  const attendanceRate = total > 0 ? ((stats.present + stats.late) / total * 100).toFixed(1) : '100';

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.start_time), day));
  };

  const upcomingEvents = events
    .filter(e => new Date(e.start_time) >= startOfDay(new Date()))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Attendance Summary Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Attendance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="bg-primary/10 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-primary">{attendanceRate}%</div>
              <p className="text-sm text-muted-foreground">Rate</p>
            </div>
            <div className="bg-green-100 dark:bg-green-950/30 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.present}</div>
              <p className="text-sm text-muted-foreground">Present</p>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-950/30 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600">{stats.late}</div>
              <p className="text-sm text-muted-foreground">Late</p>
            </div>
            <div className="bg-red-100 dark:bg-red-950/30 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{stats.absent}</div>
              <p className="text-sm text-muted-foreground">Absent</p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-950/30 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.excused}</div>
              <p className="text-sm text-muted-foreground">Excused</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="default" 
              size="lg" 
              onClick={() => setShowExcuseDialog(true)}
              className="gap-2 text-base px-6 py-3"
            >
              <FileText className="h-5 w-5" />
              Submit Excuse Request
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Excuse Requests / Mail Log */}
      <Tabs defaultValue="mail" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mail" className="gap-2">
            <Mail className="h-4 w-4" />
            Mail Log
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Inbox className="h-4 w-4" />
            Excuse History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mail" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Correspondence with Secretary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {excuseRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No correspondence yet</p>
                    <p className="text-sm">Submit an excuse request to start a conversation</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {excuseRequests.map((request) => (
                      <div 
                        key={request.id} 
                        className={cn(
                          "p-3 rounded-lg border",
                          request.status === 'approved' && "border-green-200 bg-green-50 dark:bg-green-950/20",
                          request.status === 'denied' && "border-red-200 bg-red-50 dark:bg-red-950/20",
                          request.status === 'pending' && "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {format(new Date(request.event_date), 'MMM d, yyyy')}
                              </span>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs",
                                  request.status === 'approved' && "border-green-400 text-green-700",
                                  request.status === 'denied' && "border-red-400 text-red-700",
                                  request.status === 'pending' && "border-yellow-400 text-yellow-700"
                                )}
                              >
                                {request.status === 'approved' && <ThumbsUp className="h-3 w-3 mr-1" />}
                                {request.status === 'denied' && <ThumbsDown className="h-3 w-3 mr-1" />}
                                {request.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{request.reason}</p>
                            {request.response_message && (
                              <div className="mt-2 pl-3 border-l-2 border-primary/50">
                                <p className="text-sm italic">"{request.response_message}"</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  — Secretary, {request.responded_at && format(new Date(request.responded_at), 'MMM d')}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                Attendance History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {attendanceRecords.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No attendance records yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {attendanceRecords.slice(0, 10).map(record => (
                      <div 
                        key={record.id}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.status)}
                          <span className="text-sm">
                            {format(new Date(record.attendance_date), 'EEE, MMM d, yyyy')}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
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

      {/* Calendar Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-bold min-w-[180px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="font-medium">Calendar</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No upcoming events this month</p>
                </div>
              ) : (
                upcomingEvents.map(event => {
                  const colors = getEventColors(event.event_type);
                  return (
                    <div 
                      key={event.id}
                      className={cn(
                        "p-4 rounded-lg border-l-4 bg-card hover:shadow-md transition-all cursor-pointer",
                        colors.border
                      )}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <Badge variant="secondary" className={cn("mb-2", colors.bg, colors.text)}>
                            {event.event_type.replace('_', ' ')}
                          </Badge>
                          <h3 className="font-semibold">{event.title}</h3>
                          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" />
                              {format(new Date(event.start_time), 'EEE, MMM d • h:mm a')}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" />
                                {event.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Excuse Request Dialog */}
      <Dialog open={showExcuseDialog} onOpenChange={(open) => { setShowExcuseDialog(open); if (!open) resetExcuseForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Submit Excuse Request
            </DialogTitle>
            <DialogDescription>
              Submit an excuse for an absence to the Secretary for review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {/* Student Name */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Student Name
              </Label>
              <div className="px-3 py-2 bg-muted rounded-md text-sm font-medium">
                {studentName || user?.email || 'Loading...'}
              </div>
            </div>

            {/* Event Selection */}
            <div className="space-y-2">
              <Label>Select Event(s) to be Excused *</Label>
              <ScrollArea className="h-[160px] border rounded-md p-3">
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No events found this month
                  </p>
                ) : (
                  <div className="space-y-2">
                    {events.map(event => (
                      <div key={event.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50">
                        <Checkbox
                          id={`event-${event.id}`}
                          checked={selectedEventIds.includes(event.id)}
                          onCheckedChange={(checked) => handleEventSelection(event.id, checked as boolean)}
                        />
                        <label 
                          htmlFor={`event-${event.id}`} 
                          className="text-sm cursor-pointer flex-1"
                        >
                          <span className="font-medium">{event.title}</span>
                          <span className="text-muted-foreground block text-xs">
                            {format(new Date(event.start_time), 'EEE, MMM d, yyyy • h:mm a')}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              {selectedEventIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedEventIds.length} event(s) selected
                </p>
              )}
            </div>

            {/* Excuse Type */}
            <div className="space-y-2">
              <Label htmlFor="excuse-type">Excuse Type *</Label>
              <Select value={excuseType} onValueChange={setExcuseType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select excuse type..." />
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

            {/* Document Upload / Camera */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Supporting Document (optional)
              </Label>
              
              {excuseDocument || excuseDocumentPreview ? (
                <div className="border rounded-md p-4">
                  {excuseDocumentPreview ? (
                    <div className="relative">
                      <img 
                        src={excuseDocumentPreview} 
                        alt="Captured document" 
                        className="w-full max-h-48 object-contain rounded-md"
                      />
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={() => {
                          setExcuseDocument(null);
                          setExcuseDocumentPreview(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : excuseDocument && (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{excuseDocument.name}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => setExcuseDocument(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {/* Glee Cam Option */}
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-md hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium">Glee Cam</span>
                    <span className="text-xs text-muted-foreground text-center">
                      Take a photo
                    </span>
                  </button>

                  {/* File Upload Option */}
                  <label
                    htmlFor="excuse-document"
                    className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-md hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                  >
                    <input
                      id="excuse-document"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleDocumentChange}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium">Upload File</span>
                    <span className="text-xs text-muted-foreground text-center">
                      PDF, JPG, PNG, DOC
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Clarification */}
            <div className="space-y-2">
              <Label htmlFor="excuse-clarification">Further Clarification (optional)</Label>
              <Textarea
                id="excuse-clarification"
                placeholder="Provide any additional details about your absence..."
                value={excuseClarification}
                onChange={(e) => setExcuseClarification(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowExcuseDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitExcuse} 
              disabled={submittingExcuse || selectedEventIds.length === 0 || !excuseType} 
              className="gap-2"
              size="lg"
            >
              <Send className="h-4 w-4" />
              {submittingExcuse ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Calendar className="h-5 w-5 text-primary" />
                  {selectedEvent.title}
                </DialogTitle>
                <DialogDescription>
                  <Badge variant="secondary" className={cn(getEventColors(selectedEvent.event_type).bg, getEventColors(selectedEvent.event_type).text)}>
                    {selectedEvent.event_type.replace('_', ' ')}
                  </Badge>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-semibold">{format(new Date(selectedEvent.start_time), 'EEEE, MMMM d, yyyy')}</div>
                    <div className="text-muted-foreground">
                      {format(new Date(selectedEvent.start_time), 'h:mm a')}
                      {selectedEvent.end_time && ` - ${format(new Date(selectedEvent.end_time), 'h:mm a')}`}
                    </div>
                  </div>
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{selectedEvent.location}</span>
                  </div>
                )}
                {selectedEvent.description && (
                  <div className="pt-3 border-t">
                    <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Glee Cam for Document Capture */}
      {showCamera && (
        <QuickCameraCapture
          onClose={() => setShowCamera(false)}
          onCapture={handleCameraCapture}
        />
      )}
    </div>
  );
};
