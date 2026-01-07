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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import QRCode from 'qrcode';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  QrCode, 
  Users, 
  Clock, 
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download,
  RefreshCw,
  BookOpen,
  Music,
  Eye,
  Edit,
  Trash2,
  CheckCircle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO, addHours } from 'date-fns';
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

const SESSION_TYPES = [
  { value: 'class', label: 'Class', icon: BookOpen },
  { value: 'rehearsal', label: 'Rehearsal', icon: Music },
  { value: 'lab', label: 'Lab', icon: BookOpen },
  { value: 'workshop', label: 'Workshop', icon: Users },
  { value: 'lecture', label: 'Lecture', icon: BookOpen },
];

export const CourseClassCalendar: React.FC<CourseClassCalendarProps> = ({
  courseId,
  courseCode = 'MUS-210',
  isInstructor = false
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  
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
    attendance_required: true
  });
  const [creating, setCreating] = useState(false);
  
  // QR Code state
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrImageData, setQrImageData] = useState<string>('');
  const [qrCode, setQrCode] = useState<QRCodeData | null>(null);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [attendanceCount, setAttendanceCount] = useState(0);

  // Fetch sessions
  useEffect(() => {
    fetchSessions();
  }, [courseId]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_course_class_sessions')
        .select('*')
        .eq('course_id', courseId)
        .order('session_date', { ascending: true });
      
      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({ title: 'Error', description: 'Failed to load class sessions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Calendar helpers
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

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

  // Create session
  const handleCreateSession = async () => {
    if (!newSession.title || !newSession.session_date) {
      toast({ title: 'Error', description: 'Please fill in required fields', variant: 'destructive' });
      return;
    }

    try {
      setCreating(true);
      const { error } = await supabase
        .from('gw_course_class_sessions')
        .insert({
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

      toast({ title: 'Success', description: 'Class session created' });
      setCreateDialogOpen(false);
      setNewSession({
        title: '',
        description: '',
        session_date: format(new Date(), 'yyyy-MM-dd'),
        start_time: '09:00',
        end_time: '10:30',
        location: '',
        session_type: 'class',
        attendance_required: true
      });
      fetchSessions();
    } catch (error) {
      console.error('Error creating session:', error);
      toast({ title: 'Error', description: 'Failed to create session', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  // Generate QR Code for session
  const generateQRCode = async (session: ClassSession) => {
    if (!user) return;

    try {
      setGeneratingQR(true);
      setSelectedSession(session);
      setQrDialogOpen(true);

      // Check for existing active QR code
      const { data: existingQR } = await supabase
        .from('gw_attendance_qr_codes')
        .select('*')
        .eq('course_id', courseId)
        .eq('context_type', 'course_session')
        .eq('custom_data->>session_id', session.id)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

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

      const { data: newQR, error } = await supabase
        .from('gw_attendance_qr_codes')
        .insert({
          event_id: session.id, // Use session ID as event reference
          qr_token: token,
          generated_by: user.id,
          expires_at: expiresAt.toISOString(),
          is_active: true,
          course_id: courseId,
          course_code: courseCode,
          context_type: 'course_session',
          custom_data: { session_id: session.id, session_title: session.title }
        })
        .select()
        .single();

      if (error) throw error;

      // Update session with QR code ID
      await supabase
        .from('gw_course_class_sessions')
        .update({ qr_code_id: newQR.id })
        .eq('id', session.id);

      setQrCode(newQR as QRCodeData);
      await generateQRImage(token);
      
    } catch (error) {
      console.error('Error generating QR:', error);
      toast({ title: 'Error', description: 'Failed to generate QR code', variant: 'destructive' });
    } finally {
      setGeneratingQR(false);
    }
  };

  const generateQRImage = async (token: string) => {
    const baseUrl = window.location.hostname.includes('lovable') 
      ? 'https://gleeworld.org' 
      : window.location.origin;
    const attendanceUrl = `${baseUrl}/attendance/scan?token=${encodeURIComponent(token)}`;
    
    const qrDataURL = await QRCode.toDataURL(attendanceUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    });
    
    setQrImageData(qrDataURL);
  };

  const fetchAttendanceCount = async (sessionId: string) => {
    const { count } = await supabase
      .from('gw_course_attendance')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);
    
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
      const { error } = await supabase
        .from('gw_course_class_sessions')
        .delete()
        .eq('id', sessionId);
      
      if (error) throw error;
      toast({ title: 'Deleted', description: 'Class session removed' });
      fetchSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({ title: 'Error', description: 'Failed to delete session', variant: 'destructive' });
    }
  };

  const getSessionTypeConfig = (type: string) => {
    const config = SESSION_TYPES.find(t => t.value === type);
    return config || SESSION_TYPES[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Class Calendar</h2>
          <p className="text-muted-foreground">Manage class sessions with attendance tracking</p>
        </div>
        {isInstructor && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#003666]">
                <Plus className="h-4 w-4 mr-2" />
                Add Class Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Class Session</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={newSession.title}
                    onChange={e => setNewSession(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Conducting Fundamentals"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newSession.description}
                    onChange={e => setNewSession(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Class topics and objectives..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={newSession.session_date}
                      onChange={e => setNewSession(prev => ({ ...prev, session_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={newSession.session_type}
                      onValueChange={value => setNewSession(prev => ({ ...prev, session_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SESSION_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={newSession.start_time}
                      onChange={e => setNewSession(prev => ({ ...prev, start_time: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={newSession.end_time}
                      onChange={e => setNewSession(prev => ({ ...prev, end_time: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={newSession.location}
                    onChange={e => setNewSession(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., Music Building Room 101"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSession} disabled={creating} className="bg-[#003666]">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Create Session
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(currentDate, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                const daySessions = getSessionsForDate(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentDate);
                
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "min-h-[80px] p-1 rounded-lg border text-left transition-colors",
                      !isCurrentMonth && "opacity-40",
                      isToday && "border-primary",
                      isSelected && "bg-primary/10 border-primary",
                      !isSelected && "hover:bg-accent"
                    )}
                  >
                    <div className={cn(
                      "text-sm font-medium mb-1",
                      isToday && "text-primary"
                    )}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {daySessions.slice(0, 2).map(session => {
                        const typeConfig = getSessionTypeConfig(session.session_type);
                        return (
                          <div
                            key={session.id}
                            className="text-xs bg-[#003666]/10 text-[#003666] rounded px-1 py-0.5 truncate flex items-center gap-1"
                          >
                            <typeConfig.icon className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{session.title}</span>
                          </div>
                        );
                      })}
                      {daySessions.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{daySessions.length - 2} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
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
            {selectedDate ? (
              <ScrollArea className="h-[400px]">
                {selectedDateSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No classes scheduled</p>
                    {isInstructor && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-4"
                        onClick={() => {
                          setNewSession(prev => ({
                            ...prev,
                            session_date: format(selectedDate, 'yyyy-MM-dd')
                          }));
                          setCreateDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Session
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedDateSessions.map(session => {
                      const typeConfig = getSessionTypeConfig(session.session_type);
                      return (
                        <div
                          key={session.id}
                          className="border rounded-lg overflow-hidden"
                        >
                          {session.image_url && (
                            <img
                              src={session.image_url}
                              alt={session.title}
                              className="w-full h-32 object-cover"
                            />
                          )}
                          <div className="p-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <Badge variant="outline" className="mb-1">
                                  <typeConfig.icon className="h-3 w-3 mr-1" />
                                  {typeConfig.label}
                                </Badge>
                                <h4 className="font-semibold">{session.title}</h4>
                              </div>
                              {session.attendance_required && (
                                <Badge className="bg-green-500/10 text-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Attendance
                                </Badge>
                              )}
                            </div>
                            
                            {session.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {session.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {session.start_time} - {session.end_time}
                              </span>
                              {session.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {session.location}
                                </span>
                              )}
                            </div>
                            
                            {isInstructor && (
                              <div className="flex items-center gap-2 pt-2 border-t">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => generateQRCode(session)}
                                  className="flex-1"
                                >
                                  <QrCode className="h-4 w-4 mr-2" />
                                  QR Attendance
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteSession(session.id)}
                                  className="text-destructive"
                                >
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
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Click a date to view sessions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Attendance QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {generatingQR ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : qrImageData ? (
              <>
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
                
                {qrCode && (
                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {qrCode.scan_count} scans
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Expires {format(new Date(qrCode.expires_at), 'h:mm a')}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={downloadQR}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => selectedSession && generateQRCode(selectedSession)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No QR code generated</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
