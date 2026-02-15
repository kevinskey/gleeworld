import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  QrCode,
  RefreshCw,
  Calendar,
  Users,
  Clock,
  Maximize2,
  Download,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  BarChart3,
  Zap,
} from 'lucide-react';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { AttendanceFullScreenModal } from './AttendanceFullScreenModal';
import { CourseAttendanceGrid } from './CourseAttendanceGrid';

interface CourseSession {
  id: string;
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  qr_code_id: string | null;
}

interface InstructorAttendanceHubProps {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  semester?: string;
}

export const InstructorAttendanceHub: React.FC<InstructorAttendanceHubProps> = ({
  courseId,
  courseCode,
  courseTitle,
  semester = 'Spring 2026',
}) => {
  const [session, setSession] = useState<CourseSession | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch today's or next upcoming session
  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('gw_course_class_sessions')
        .select('id, title, session_date, start_time, end_time, location, qr_code_id')
        .eq('course_id', courseId)
        .gte('session_date', today)
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSession(data);

      if (data?.qr_code_id) {
        const { data: qrData, error: qrError } = await supabase
          .from('gw_attendance_qr_codes')
          .select('id, qr_token, attendance_session_id')
          .eq('id', data.qr_code_id)
          .maybeSingle();

        if (!qrError && qrData) {
          setAttendanceSessionId(qrData.attendance_session_id);
          await generateQRImage(qrData.qr_token);
        }
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const generateQRImage = async (token: string) => {
    try {
      const baseUrl = window.location.hostname.includes('lovable')
        ? 'https://gleeworld.org'
        : window.location.origin;
      const checkInUrl = `${baseUrl}/qr-scanner?token=${encodeURIComponent(token)}`;
      const dataUrl = await QRCode.toDataURL(checkInUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR image:', error);
    }
  };

  // One-click: create today's session + QR code
  const generateQuickQR = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const now = new Date();
      const opensAt = now.toISOString();
      // Session closes 2 hours from now
      const closesAt = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

      // 1. Create a gw_attendance_sessions record (this is what the attendance grid reads)
      const { data: newSession, error: sessionError } = await supabase
        .from('gw_attendance_sessions')
        .insert({
          course_id: courseId,
          title: `${courseCode} Class`,
          opens_at: opensAt,
          closes_at: closesAt,
          status: 'open',
          mode: 'qr',
          roster_scope: 'course',
          allow_late_checkin: true,
          late_threshold_minutes: 15,
          requires_grading: false,
          created_by: user.id,
        })
        .select('id, title, opens_at, closes_at')
        .single();

      if (sessionError) throw sessionError;

      // 2. Generate QR code linked to the attendance session
      const qrToken = crypto.randomUUID() + '-' + Date.now();
      const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString();

      const { data: qrInsert, error: qrInsertError } = await supabase
        .from('gw_attendance_qr_codes')
        .insert({
          qr_token: qrToken,
          attendance_session_id: newSession.id,
          course_id: courseId,
          generated_by: user.id,
          expires_at: expiresAt,
          is_active: true,
          context_type: 'session_attendance',
        })
        .select('id, qr_token, attendance_session_id')
        .single();

      if (qrInsertError) throw qrInsertError;

      // 3. Generate QR image
      await generateQRImage(qrInsert.qr_token);
      setAttendanceSessionId(qrInsert.attendance_session_id);

      // 4. Also create a gw_course_class_sessions record for the calendar
      await supabase
        .from('gw_course_class_sessions')
        .insert({
          course_id: courseId,
          title: `${courseCode} Class`,
          session_date: now.toISOString().split('T')[0],
          start_time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
          end_time: `${String(Math.min(now.getHours() + 1, 23)).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
          session_type: 'class',
          attendance_required: true,
          created_by: user.id,
          qr_code_id: qrInsert.id,
        });

      // 5. Update UI
      setSession({
        id: newSession.id,
        title: newSession.title,
        session_date: now.toISOString().split('T')[0],
        start_time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        end_time: `${String(Math.min(now.getHours() + 1, 23)).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        location: null,
        qr_code_id: qrInsert.id,
      });
      setQrOpen(true);

      toast({
        title: 'QR Code Ready!',
        description: 'Students can now scan to check in. Attendance will appear in the grid.',
      });
    } catch (error: any) {
      console.error('Error generating quick QR:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate QR code',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const fetchEnrollmentCount = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('gw_course_enrollments')
        .select('id')
        .eq('course_id', courseId)
        .eq('enrollment_status', 'enrolled');
      if (!error && data) {
        setEnrolledCount(data.length);
      }
    } catch (error) {
      console.error('Error fetching enrollment count:', error);
    }
  }, [courseId]);

  const fetchCheckedInCount = useCallback(async () => {
    if (!attendanceSessionId) return;
    try {
      const query = supabase.from('gw_attendance_records').select('id');
      // @ts-ignore
      const result = await query.eq('attendance_session_id', attendanceSessionId);
      if (!result.error && result.data) {
        setCheckedInCount(result.data.length);
      }
    } catch (error) {
      console.error('Error fetching checked-in count:', error);
    }
  }, [attendanceSessionId]);

  useEffect(() => {
    fetchSession();
    fetchEnrollmentCount();
  }, [fetchSession, fetchEnrollmentCount]);

  useEffect(() => {
    if (attendanceSessionId) {
      fetchCheckedInCount();
      const channel = supabase
        .channel(`attendance_hub_${attendanceSessionId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'gw_attendance_records',
          filter: `attendance_session_id=eq.${attendanceSessionId}`,
        }, () => {
          fetchCheckedInCount();
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [attendanceSessionId, fetchCheckedInCount]);

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `${courseCode.replace(' ', '-')}-attendance-qr.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  const attendanceRate = enrolledCount > 0
    ? Math.round((checkedInCount / enrolledCount) * 100)
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card">
          <CardContent className="p-3 sm:p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold text-foreground">{enrolledCount}</p>
            <p className="text-xs text-muted-foreground">Enrolled</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-3 sm:p-4 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto text-green-600 mb-1" />
            <p className="text-2xl font-bold text-foreground">{checkedInCount}</p>
            <p className="text-xs text-muted-foreground">Checked In</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-3 sm:p-4 text-center">
            <BarChart3 className="h-5 w-5 mx-auto text-blue-600 mb-1" />
            <p className="text-2xl font-bold text-foreground">{attendanceRate}%</p>
            <p className="text-xs text-muted-foreground">Today's Rate</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-3 sm:p-4 text-center">
            <Calendar className="h-5 w-5 mx-auto text-amber-600 mb-1" />
            <p className="text-lg font-bold text-foreground truncate">
              {session ? getDateLabel(session.session_date) : 'None'}
            </p>
            <p className="text-xs text-muted-foreground">Next Session</p>
          </CardContent>
        </Card>
      </div>

      {/* QR Quick-Start — Collapsible (when session exists) */}
      {session && (
        <Collapsible open={qrOpen} onOpenChange={setQrOpen}>
          <Card className="bg-card">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer pb-3 hover:bg-accent/30 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <QrCode className="h-5 w-5 text-primary" />
                    Quick QR Check-In
                    {isToday(parseISO(session.session_date)) && (
                      <Badge variant="default" className="text-[10px] h-5">LIVE</Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {session.start_time && `${session.start_time}`}
                      {session.location && ` · ${session.location}`}
                    </span>
                    {qrOpen
                      ? <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      : <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    }
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center">
                  {/* QR Code */}
                  <div className="flex-shrink-0">
                    {qrDataUrl ? (
                      <div className="bg-white p-3 rounded-lg shadow-sm border">
                        <img
                          src={qrDataUrl}
                          alt="Attendance QR Code"
                          className="w-[180px] h-[180px] sm:w-[200px] sm:h-[200px]"
                        />
                      </div>
                    ) : (
                      <div className="w-[180px] h-[180px] flex items-center justify-center bg-muted rounded-lg border">
                        <div className="text-center p-4">
                          <AlertCircle className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                          <p className="text-xs text-muted-foreground">No QR code</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Session Info & Actions */}
                  <div className="flex-1 space-y-3 text-center sm:text-left w-full">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {session.title || 'Class Session'}
                      </h3>
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(session.session_date), 'MMM d, yyyy')}
                        </span>
                        {session.start_time && session.end_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {session.start_time} – {session.end_time}
                          </span>
                        )}
                        {session.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {session.location}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-foreground">
                          {checkedInCount} / {enrolledCount} checked in
                        </span>
                        <span className="text-xs font-bold text-foreground">{attendanceRate}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(100, attendanceRate)}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      <Button
                        size="sm"
                        onClick={() => setShowFullScreen(true)}
                        className="flex-1 sm:flex-none"
                      >
                        <Maximize2 className="h-4 w-4 mr-1.5" />
                        Full Screen
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadQR}
                        disabled={!qrDataUrl}
                      >
                        <Download className="h-4 w-4 mr-1.5" />
                        <span className="hidden sm:inline">Download</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { fetchSession(); fetchEnrollmentCount(); }}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* No session — show one-click generate button */}
      {!session && !loading && (
        <Card className="bg-card">
          <CardContent className="py-8 text-center space-y-4">
            <QrCode className="h-12 w-12 mx-auto text-primary/60" />
            <div>
              <p className="font-medium text-foreground">No upcoming sessions</p>
              <p className="text-sm text-muted-foreground mt-1">
                Generate a QR code for today's class with one click
              </p>
            </div>
            <Button
              size="lg"
              onClick={generateQuickQR}
              disabled={generating}
              className="gap-2"
            >
              {generating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {generating ? 'Generating...' : 'Generate QR for Today'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Full Attendance Grid */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Attendance Records
        </h2>
        <CourseAttendanceGrid
          courseId={courseId}
          courseCode={courseCode}
          semester={semester}
          isInstructor={true}
        />
      </div>

      {/* Fullscreen Modal */}
      {session && (
        <AttendanceFullScreenModal
          open={showFullScreen}
          onClose={() => setShowFullScreen(false)}
          qrDataUrl={qrDataUrl}
          sessionTitle={`${courseCode} - ${session.title || 'Class Session'}`}
          sessionDate={parseISO(session.session_date)}
          startTime={session.start_time || undefined}
          endTime={session.end_time || undefined}
          location={session.location || undefined}
          enrolledCount={enrolledCount}
          checkedInCount={checkedInCount}
        />
      )}
    </div>
  );
};
