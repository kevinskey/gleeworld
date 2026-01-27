import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  QrCode, 
  RefreshCw, 
  Calendar, 
  Users, 
  MapPin, 
  Clock, 
  Maximize2, 
  Download,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { AttendanceFullScreenModal } from './AttendanceFullScreenModal';

interface CourseSession {
  id: string;
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  qr_code_id: string | null;
}

interface QRCodeData {
  id: string;
  qr_token: string;
}

interface QuickAttendanceQRProps {
  courseId: string;
  courseCode: string;
  courseTitle: string;
}

export const QuickAttendanceQR: React.FC<QuickAttendanceQRProps> = ({
  courseId,
  courseCode,
  courseTitle,
}) => {
  const [session, setSession] = useState<CourseSession | null>(null);
  const [qrCode, setQrCode] = useState<QRCodeData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);
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
        // Fetch the QR code
        const { data: qrData, error: qrError } = await supabase
          .from('gw_attendance_qr_codes')
          .select('id, qr_token, attendance_session_id')
          .eq('id', data.qr_code_id)
          .maybeSingle();
          
        if (!qrError && qrData) {
          setQrCode({ id: qrData.id, qr_token: qrData.qr_token });
          setAttendanceSessionId(qrData.attendance_session_id);
          await generateQRImage(qrData.qr_token);
        }
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      toast({
        title: 'Error',
        description: 'Failed to load session data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  // Generate QR image from token
  const generateQRImage = async (token: string) => {
    try {
      const baseUrl = window.location.hostname.includes('lovable')
        ? 'https://gleeworld.lovable.app'
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

  // Fetch enrollment count
  const fetchEnrollmentCount = useCallback(async () => {
    try {
      const query = supabase.from('gw_course_enrollments').select('id');
      // @ts-ignore - deep type instantiation issue
      const result = await query.eq('course_id', courseId).eq('status', 'enrolled');
        
      if (!result.error && result.data) {
        setEnrolledCount(result.data.length);
      }
    } catch (error) {
      console.error('Error fetching enrollment count:', error);
    }
  }, [courseId]);

  // Fetch checked-in count for today's session
  const fetchCheckedInCount = useCallback(async () => {
    if (!attendanceSessionId) return;
    
    try {
      const query = supabase.from('gw_attendance_records').select('id');
      // @ts-ignore - deep type instantiation issue
      const result = await query.eq('attendance_session_id', attendanceSessionId);
        
      if (!result.error && result.data) {
        setCheckedInCount(result.data.length);
      }
    } catch (error) {
      console.error('Error fetching checked-in count:', error);
    }
  }, [attendanceSessionId]);

  // Initial load
  useEffect(() => {
    fetchSession();
    fetchEnrollmentCount();
  }, [fetchSession, fetchEnrollmentCount]);

  // Fetch checked-in count when session changes
  useEffect(() => {
    if (attendanceSessionId) {
      fetchCheckedInCount();
      
      // Subscribe to realtime updates
      const channel = supabase
        .channel(`attendance_records_${attendanceSessionId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'gw_attendance_records',
          filter: `attendance_session_id=eq.${attendanceSessionId}`,
        }, () => {
          fetchCheckedInCount();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [attendanceSessionId, fetchCheckedInCount]);

  // Download QR code
  const downloadQR = () => {
    if (!qrDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `${courseCode.replace(' ', '-')}-attendance-qr.png`;
    link.href = qrDataUrl;
    link.click();
  };

  // Get session date label
  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMM d');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Quick Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">No upcoming class sessions found</p>
          <p className="text-sm text-muted-foreground">
            Create class sessions in the Calendar tab to enable quick attendance
          </p>
        </CardContent>
      </Card>
    );
  }

  const sessionDate = parseISO(session.session_date);
  const sessionTitle = session.title || 'Class Session';

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <QrCode className="h-5 w-5 text-primary" />
                Quick Attendance
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Show QR code for students to check in
              </p>
            </div>
            <Badge variant={isToday(sessionDate) ? 'default' : 'secondary'}>
              {getDateLabel(session.session_date)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Session Info */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">
                  {courseCode} - {sessionTitle}
                </h3>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(sessionDate, 'MMMM d, yyyy')}
                  </span>
                  {session.start_time && session.end_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {session.start_time} - {session.end_time}
                    </span>
                  )}
                  {session.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {session.location}
                    </span>
                  )}
                </div>
              </div>

              {/* Attendance Stats */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="font-medium">Attendance</span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {checkedInCount} / {enrolledCount}
                    </p>
                    <p className="text-xs text-muted-foreground">students checked in</p>
                  </div>
                </div>
                {checkedInCount > 0 && (
                  <div className="mt-3 w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (checkedInCount / Math.max(1, enrolledCount)) * 100)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setShowFullScreen(true)} className="flex-1">
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Present Full Screen
                </Button>
                <Button variant="outline" onClick={downloadQR} disabled={!qrDataUrl}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            {/* QR Code Display */}
            <div className="flex flex-col items-center">
              {qrDataUrl ? (
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <img
                    src={qrDataUrl}
                    alt="Attendance QR Code"
                    className="w-[250px] h-[250px]"
                  />
                </div>
              ) : (
                <div className="w-[250px] h-[250px] flex items-center justify-center bg-muted rounded-lg border">
                  <div className="text-center p-4">
                    <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No QR code generated for this session
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                QR auto-generated with session
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AttendanceFullScreenModal
        open={showFullScreen}
        onClose={() => setShowFullScreen(false)}
        qrDataUrl={qrDataUrl}
        sessionTitle={`${courseCode} - ${sessionTitle}`}
        sessionDate={sessionDate}
        startTime={session.start_time || undefined}
        endTime={session.end_time || undefined}
        location={session.location || undefined}
        enrolledCount={enrolledCount}
        checkedInCount={checkedInCount}
      />
    </>
  );
};
