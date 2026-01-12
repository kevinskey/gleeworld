import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, Music, GraduationCap, Mail, Phone, Calendar, 
  ClipboardList, CheckCircle, XCircle, Clock, FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getAvatarUrl, getInitials } from '@/utils/avatarUtils';
import { CourseAssignments } from './CourseAssignments';

interface StudentProfile {
  user_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  voice_part: string | null;
  class_year: number | null;
  avatar_url: string | null;
  status: string | null;
  role: string | null;
  join_date: string | null;
  is_exec_board?: boolean | null;
  exec_board_role?: string | null;
  music_role?: string | null;
  dues_paid?: boolean | null;
}

interface AttendanceRecord {
  id: string;
  event_id: string;
  status: string;
  recorded_at: string;
  event_title?: string;
  event_date?: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  start_date: string;
  location?: string;
  event_type?: string;
}

interface StudentDossierHomeProps {
  courseId: string;
}

export const StudentDossierHome: React.FC<StudentDossierHomeProps> = ({ courseId }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user]);

  const fetchStudentData = async () => {
    if (!user) return;
    
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('gw_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }

      // Fetch attendance records
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select(`
          id, event_id, status, recorded_at,
          events!attendance_event_id_fkey(title, start_date)
        `)
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(20);

      if (attendanceData) {
        setAttendance(attendanceData.map((a: any) => ({
          id: a.id,
          event_id: a.event_id,
          status: a.status,
          recorded_at: a.recorded_at,
          event_title: a.events?.title,
          event_date: a.events?.start_date
        })));
      }

      // Fetch upcoming events
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title, start_date, location, event_type')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(5);

      if (eventsData) {
        setUpcomingEvents(eventsData);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const attendanceStats = {
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    excused: attendance.filter(a => a.status === 'excused').length,
    late: attendance.filter(a => a.status === 'late').length,
    total: attendance.length
  };

  const attendanceRate = attendanceStats.total > 0 
    ? Math.round(((attendanceStats.present + attendanceStats.excused) / attendanceStats.total) * 100) 
    : 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const avatarUrl = getAvatarUrl(profile?.avatar_url);
  const initials = getInitials(profile?.full_name);

  return (
    <div className="space-y-6">
      {/* Profile Hero Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Large Profile Image */}
            <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-xl">
              <AvatarImage src={avatarUrl || undefined} alt={profile?.full_name || 'Student'} />
              <AvatarFallback className="text-3xl md:text-4xl bg-primary text-primary-foreground">
                {initials || <User className="h-16 w-16" />}
              </AvatarFallback>
            </Avatar>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {profile?.full_name || 'Glee Club Member'}
              </h1>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
                {profile?.voice_part && (
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    <Music className="h-3.5 w-3.5 mr-1.5" />
                    {profile.voice_part}
                  </Badge>
                )}
                {profile?.class_year && (
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
                    Class of {profile.class_year}
                  </Badge>
                )}
                {profile?.is_exec_board && (
                  <Badge variant="default" className="text-sm px-3 py-1">
                    {profile.exec_board_role || 'Executive Board'}
                  </Badge>
                )}
                {profile?.music_role && (
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {profile.music_role}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-sm text-muted-foreground">
                {profile?.email && (
                  <span className="flex items-center justify-center md:justify-start gap-2">
                    <Mail className="h-4 w-4" />
                    {profile.email}
                  </span>
                )}
                {profile?.phone && (
                  <span className="flex items-center justify-center md:justify-start gap-2">
                    <Phone className="h-4 w-4" />
                    {profile.phone}
                  </span>
                )}
                {profile?.join_date && (
                  <span className="flex items-center justify-center md:justify-start gap-2">
                    <Calendar className="h-4 w-4" />
                    Member since {format(new Date(profile.join_date), 'MMMM yyyy')}
                  </span>
                )}
              </div>
            </div>

            {/* Attendance Quick Stat */}
            <div className="hidden md:block text-center bg-background/80 rounded-xl p-4 shadow-sm">
              <div className={`text-3xl font-bold ${attendanceRate >= 90 ? 'text-green-600' : attendanceRate >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
                {attendanceRate}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Attendance Rate</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Assignments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assignments Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5 text-primary" />
                My Assignments
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CourseAssignments courseId={courseId} isEnrolled={true} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Events & Attendance */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No upcoming events
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-accent/30">
                      <div className="flex-shrink-0 w-12 text-center">
                        <div className="text-xs text-muted-foreground uppercase">
                          {format(new Date(event.start_date), 'MMM')}
                        </div>
                        <div className="text-xl font-bold">
                          {format(new Date(event.start_date), 'd')}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{event.title}</p>
                        {event.location && (
                          <p className="text-xs text-muted-foreground truncate">{event.location}</p>
                        )}
                        {event.event_type && (
                          <Badge variant="outline" className="text-xs mt-1">{event.event_type}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {attendance.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No attendance records yet
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                      <CheckCircle className="h-5 w-5 mx-auto text-green-600 mb-1" />
                      <p className="text-lg font-bold text-green-600">{attendanceStats.present}</p>
                      <p className="text-xs text-muted-foreground">Present</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
                      <XCircle className="h-5 w-5 mx-auto text-red-600 mb-1" />
                      <p className="text-lg font-bold text-red-600">{attendanceStats.absent}</p>
                      <p className="text-xs text-muted-foreground">Absent</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
                      <Clock className="h-5 w-5 mx-auto text-amber-600 mb-1" />
                      <p className="text-lg font-bold text-amber-600">{attendanceStats.late}</p>
                      <p className="text-xs text-muted-foreground">Late</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                      <Calendar className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                      <p className="text-lg font-bold text-blue-600">{attendanceStats.excused}</p>
                      <p className="text-xs text-muted-foreground">Excused</p>
                    </div>
                  </div>

                  {/* Recent Attendance */}
                  <div className="max-h-48 overflow-y-auto">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Recent Records</p>
                    <div className="space-y-2">
                      {attendance.slice(0, 8).map((record) => (
                        <div key={record.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                          <span className="truncate flex-1">{record.event_title || 'Event'}</span>
                          <Badge 
                            variant={record.status === 'present' ? 'default' : record.status === 'absent' ? 'destructive' : 'secondary'}
                            className="text-xs ml-2"
                          >
                            {record.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
