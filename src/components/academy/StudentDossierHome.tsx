import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  User, Calendar, ClipboardList, CheckCircle, XCircle, Clock, 
  FileText, AlertCircle, Play, MoreHorizontal, Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getAvatarUrl, getInitials } from '@/utils/avatarUtils';
import { useNavigate } from 'react-router-dom';
import { useMus240SemesterSafe } from '@/contexts/Mus240SemesterContext';
import { getCourseByCode } from '@/config/academyCourses';

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

interface Assignment {
  id: string;
  title: string;
  due_date: string;
  points: number;
  status?: 'pending' | 'submitted' | 'graded' | 'overdue';
  course_id: string;
}

interface CurrentModule {
  id: string;
  title: string;
  week_number: number;
  content_types: string[];
  assignments: Assignment[];
}

interface StudentDossierHomeProps {
  courseId: string;
}

export const StudentDossierHome: React.FC<StudentDossierHomeProps> = ({ courseId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentSemester } = useMus240SemesterSafe();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [currentModule, setCurrentModule] = useState<CurrentModule | null>(null);
  const [loading, setLoading] = useState(true);

  const course = getCourseByCode(courseId) || { courseCode: 'MUS 240', title: 'Course' };

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user, courseId]);

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

      // Fetch assignments for this course
      const { data: assignmentsData } = await supabase
        .from('gw_course_assignments')
        .select('*')
        .eq('course_id', courseId)
        .order('due_date', { ascending: true })
        .limit(10);

      if (assignmentsData) {
        const now = new Date();
        setAssignments(assignmentsData.map((a: any) => ({
          id: a.id,
          title: a.title,
          due_date: a.due_date,
          points: a.max_points || 100,
          course_id: a.course_id,
          status: new Date(a.due_date) < now ? 'overdue' : 'pending'
        })));
      }

      // Course-specific calendar IDs
      const COURSE_CALENDAR_IDS: Record<string, string> = {
        'a0000000-0000-0000-0000-000000000070': 'b1e077a0-85f3-4665-b006-4767b310a521',
        'a0000000-0000-0000-0000-000000000100': 'a0000000-0000-0000-0000-000000000100',
      };

      const calendarId = COURSE_CALENDAR_IDS[courseId];
      if (calendarId) {
        const { data: eventsData } = await supabase
          .from('gw_events')
          .select('id, title, start_date, location, event_type')
          .eq('calendar_id', calendarId)
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(5);

        if (eventsData) {
          setUpcomingEvents(eventsData);
        }
      } else {
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, title, start_date, location, event_type')
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(5);

        if (eventsData) {
          setUpcomingEvents(eventsData);
        }
      }

      // Mock current module data - in production, fetch from mus240_module_settings or similar
      if (assignments.length > 0) {
        setCurrentModule({
          id: '1',
          title: 'African Roots',
          week_number: 2,
          content_types: ['Video', 'Reading', 'Listening'],
          assignments: assignments.slice(0, 2)
        });
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
    late: attendance.filter(a => a.status === 'late').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const avatarUrl = getAvatarUrl(profile?.avatar_url);
  const initials = getInitials(profile?.full_name);

  // Find the most urgent assignment
  const urgentAssignment = assignments.find(a => a.status === 'overdue') || assignments[0];

  return (
    <div className="flex gap-6">
      {/* Main Content Column - 70% */}
      <div className="flex-1 space-y-6 min-w-0">
        
        {/* What's Due Next Card */}
        {urgentAssignment && (
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                What's Due Next
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{urgentAssignment.title}</h3>
                    {urgentAssignment.status === 'overdue' && (
                      <Badge variant="destructive" className="text-xs flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Overdue
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Due: {format(new Date(urgentAssignment.due_date), 'MMM d')} · {urgentAssignment.points} pts
                    {urgentAssignment.status === 'overdue' && ' · OVERDUE'}
                  </p>
                </div>
                <Button className="bg-primary hover:bg-primary/90">
                  Start Assignment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Module / Week */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Current Module / Week
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Module Header */}
            <div>
              <h3 className="text-xl font-bold">Week 2: African Roots</h3>
              <div className="flex gap-2 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Play className="h-3 w-3" />Video
                </span>
                <span>·</span>
                <span>Reading</span>
                <span>·</span>
                <span>Listening</span>
              </div>
            </div>

            {/* Module Assignment Preview */}
            {urgentAssignment && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{urgentAssignment.title}</span>
                    {urgentAssignment.status === 'overdue' && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                        Overdue
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    Due: {format(new Date(urgentAssignment.due_date), 'MMM d')} · {urgentAssignment.points} pts
                  </p>
                </div>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-xs">
                  Start Assignment
                </Button>
              </div>
            )}

            {/* Assignments List */}
            <div className="space-y-3">
              <h4 className="font-semibold text-base">Assignments</h4>
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assignments yet</p>
              ) : (
                <div className="space-y-2">
                  {assignments.slice(0, 4).map((assignment, idx) => (
                    <div key={assignment.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">•</span>
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{assignment.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Due: {format(new Date(assignment.due_date), 'MMM d')} · {assignment.points} pts
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {assignment.status === 'overdue' ? (
                          <span className="text-xs text-destructive font-medium">Overdue</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{assignment.points} pts</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Announcements Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-base">Announcements</h4>
                <Button variant="outline" size="sm" className="text-xs h-7">
                  <FileText className="h-3 w-3 mr-1" />
                  Dismiss
                </Button>
              </div>
              <Card className="bg-muted/20">
                <CardContent className="p-4">
                  <p className="font-medium text-sm">MLK Day:</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Just a reminder to listen to the assigned tracks for Wednesday's MLK Day special 
                    and come prepared to discuss in class. Make sure to complete the related listening 
                    quiz by Wednesday evening!
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Sidebar - 30% */}
      <div className="w-80 flex-shrink-0 space-y-6 hidden lg:block">
        
        {/* Course Snapshot - Student Profile */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Course Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={avatarUrl || undefined} alt={profile?.full_name || 'Student'} />
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                  {initials || <User className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate">
                  {profile?.full_name || 'Student Name'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {course.courseCode} · {profile?.voice_part || 'B2'}
                </p>
                {profile?.email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{profile.email}</span>
                  </p>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  Thu 1-3 PM, Fri 12 AM, 9-10 AM
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming events
              </p>
            ) : (
              upcomingEvents.map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-start gap-3 p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-shrink-0 w-10 text-center">
                    <div className="text-[10px] text-primary font-semibold uppercase">
                      {format(new Date(event.start_date), 'MMM')}
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {format(new Date(event.start_date), 'd')}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{event.title}</p>
                    {event.location && (
                      <p className="text-xs text-muted-foreground truncate">{event.location}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Attendance Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                <div className="flex justify-center mb-1">
                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-green-600">{attendanceStats.present}</p>
                <p className="text-[10px] text-muted-foreground">Present</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
                <div className="flex justify-center mb-1">
                  <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <XCircle className="h-3.5 w-3.5 text-red-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-red-600">{attendanceStats.absent}</p>
                <p className="text-[10px] text-muted-foreground">Absent</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
                <div className="flex justify-center mb-1">
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-amber-600">{attendanceStats.late}</p>
                <p className="text-[10px] text-muted-foreground">Late</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
