import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  User, Calendar, ClipboardList, CheckCircle, XCircle, Clock, 
  FileText, AlertCircle, Play, MoreHorizontal, Mail, ChevronDown, Bell
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getAvatarUrl, getInitials } from '@/utils/avatarUtils';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMus240SemesterSafe } from '@/contexts/Mus240SemesterContext';
import { getCourseByCode } from '@/config/academyCourses';
import { CourseTopicSlider } from './CourseTopicSlider';

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
  is_assignment?: boolean;
  is_discussion?: boolean;
  assignment_status?: 'pending' | 'submitted' | 'graded' | 'overdue';
  points?: number;
}

interface Assignment {
  id: string;
  title: string;
  due_date: string;
  points: number;
  status?: 'pending' | 'submitted' | 'graded' | 'overdue';
  course_id: string;
  description?: string;
  is_discussion?: boolean;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_pinned?: boolean;
  created_at?: string;
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
  isAdmin?: boolean;
}

export const StudentDossierHome: React.FC<StudentDossierHomeProps> = ({ courseId, isAdmin = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentSemester } = useMus240SemesterSafe();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [currentModule, setCurrentModule] = useState<CurrentModule | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const course = getCourseByCode(courseId) || { courseCode: 'MUS 240', title: 'Course' };

  // Refetch when user navigates back to this page (location.key changes on navigation)
  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user, courseId, location.key]);

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

      // Fetch attendance records - filter by course through events table
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select(`
          id, event_id, status, recorded_at,
          events!attendance_event_id_fkey(id, title, start_date, course_id)
        `)
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(50);

      if (attendanceData) {
        // Filter to only include attendance for events belonging to this course
        const filteredAttendance = attendanceData
          .filter((a: any) => a.events?.course_id === courseId)
          .slice(0, 20);
        
        setAttendance(filteredAttendance.map((a: any) => ({
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
        const assignmentIds = assignmentsData.map((a: any) => a.id);

        // Fetch submissions from BOTH tables (essays vs performance/sight-reading)
        const [{ data: videoSubmissions }, { data: essaySubmissions }] = await Promise.all([
          supabase
            .from('gw_assignment_submissions')
            .select('assignment_id, status')
            .eq('user_id', user.id)
            .in('assignment_id', assignmentIds),
          supabase
            .from('gw_course_submissions')
            .select('assignment_id, status')
            .eq('student_id', user.id)
            .in('assignment_id', assignmentIds),
        ]);

        const submissionStatusByAssignmentId = new Map<string, string>();
        videoSubmissions?.forEach((s: any) => submissionStatusByAssignmentId.set(s.assignment_id, s.status));
        essaySubmissions?.forEach((s: any) => submissionStatusByAssignmentId.set(s.assignment_id, s.status));

        const mappedAssignments: Assignment[] = assignmentsData.map((a: any) => {
          const submissionStatus = submissionStatusByAssignmentId.get(a.id);
          const due = a.due_date ? new Date(a.due_date) : null;

          let status: Assignment['status'] = 'pending';
          if (submissionStatus) {
            status = submissionStatus === 'graded' ? 'graded' : 'submitted';
          } else if (due && due < now) {
            status = 'overdue';
          }

          return {
            id: a.id,
            title: a.title,
            due_date: a.due_date,
            points: a.max_points || 100,
            course_id: a.course_id,
            status,
            description: a.description || '',
          };
        });

        setAssignments(mappedAssignments);

        // Mock current module data - in production, fetch from mus240_module_settings or similar
        if (mappedAssignments.length > 0) {
          setCurrentModule({
            id: '1',
            title: 'African Roots',
            week_number: 2,
            content_types: ['Video', 'Reading', 'Listening'],
            assignments: mappedAssignments.slice(0, 2),
          });
        }

        // Unified approach: All courses fetch upcoming events by course_id
        // This ensures each course only shows its own events
        const { data: eventsData } = await supabase
          .from('gw_events')
          .select('id, title, start_date, location, event_type')
          .eq('course_id', courseId)
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(5);

        // Merge assignments with due dates into upcoming events
        // Include future assignments AND recent overdue ones (within 7 days) that aren't submitted
        const currentTime = new Date();
        const sevenDaysAgo = new Date(currentTime.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const assignmentEvents: UpcomingEvent[] = (assignmentsData || [])
          .filter((a: any) => {
            if (!a.due_date) return false;
            const dueDate = new Date(a.due_date);
            const submissionStatus = submissionStatusByAssignmentId.get(a.id);
            // Show if: future OR (recent past AND not submitted/graded)
            return dueDate >= currentTime || (dueDate >= sevenDaysAgo && !submissionStatus);
          })
          .map((a: any) => {
            const submissionStatus = submissionStatusByAssignmentId.get(a.id);
            const due = a.due_date ? new Date(a.due_date) : null;
            let status: 'pending' | 'submitted' | 'graded' | 'overdue' = 'pending';
            if (submissionStatus) {
              status = submissionStatus === 'graded' ? 'graded' : 'submitted';
            } else if (due && due < currentTime) {
              status = 'overdue';
            }
            
            return {
              id: `assignment-${a.id}`,
              title: a.title,
              start_date: a.due_date,
              event_type: 'assignment',
              is_assignment: true,
              assignment_status: status,
              points: a.max_points || a.points || 100
            };
          });

        // Fetch discussions with due dates for this course
        const { data: discussionsData } = await supabase
          .from('course_discussions')
          .select('id, title, content, due_date, is_graded, max_points, course_id')
          .eq('course_id', courseId)
          .not('due_date', 'is', null)
          .order('due_date', { ascending: true })
          .limit(10);

        // Check which discussions the user has replied to
        const discussionIds: string[] = (discussionsData || []).map((d: any) => d.id as string);
        let repliedDiscussionIds = new Set<string>();
        if (discussionIds.length > 0 && user?.id) {
          // Use rpc or direct query with explicit typing to avoid TypeScript issues
          const repliesQuery = supabase.from('discussion_replies').select('discussion_id');
          const { data: repliesData } = await (repliesQuery as any).eq('created_by', user.id);
          if (repliesData) {
            repliedDiscussionIds = new Set(
              (repliesData as any[])
                .filter((r: any) => discussionIds.includes(r.discussion_id))
                .map((r: any) => r.discussion_id as string)
            );
          }
        }

        // repliedDiscussionIds is already defined above

        // Map discussions to assignment-like objects for the "What's Due Next" card
        const discussionAssignments: Assignment[] = (discussionsData || [])
          .filter((d: any) => d.due_date)
          .map((d: any) => {
            const due = new Date(d.due_date);
            const hasReplied = repliedDiscussionIds.has(d.id);
            let status: Assignment['status'] = 'pending';
            if (hasReplied) {
              status = 'submitted';
            } else if (due < currentTime) {
              status = 'overdue';
            }
            return {
              id: d.id,
              title: `💬 ${d.title}`,
              due_date: d.due_date,
              points: d.max_points || 10,
              status,
              course_id: d.course_id,
              description: d.content,
              is_discussion: true
            };
          });

        // Include discussions in the assignments list for urgentAssignment logic
        setAssignments([...mappedAssignments, ...discussionAssignments]);

        // Create discussion events for the upcoming events list
        const discussionEvents: UpcomingEvent[] = (discussionsData || [])
          .filter((d: any) => {
            if (!d.due_date) return false;
            const dueDate = new Date(d.due_date);
            const hasReplied = repliedDiscussionIds.has(d.id);
            // Show if: future OR (recent past AND not replied)
            return dueDate >= currentTime || (dueDate >= sevenDaysAgo && !hasReplied);
          })
          .map((d: any) => {
            const due = new Date(d.due_date);
            const hasReplied = repliedDiscussionIds.has(d.id);
            let status: 'pending' | 'submitted' | 'graded' | 'overdue' = 'pending';
            if (hasReplied) {
              status = 'submitted';
            } else if (due < currentTime) {
              status = 'overdue';
            }
            return {
              id: `discussion-${d.id}`,
              title: `💬 ${d.title}`,
              start_date: d.due_date,
              event_type: 'discussion',
              is_discussion: true,
              assignment_status: status,
              points: d.max_points || 10
            };
          });

        // Combine events, assignments, and discussions, sort by date
        const allEvents: UpcomingEvent[] = [
          ...(eventsData || []).map(e => ({ ...e, is_assignment: false, is_discussion: false })),
          ...assignmentEvents,
          ...discussionEvents
        ].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
         .slice(0, 8);

        setUpcomingEvents(allEvents);
      } else {
        // No assignments, just fetch events
        const { data: eventsData } = await supabase
          .from('gw_events')
          .select('id, title, start_date, location, event_type')
          .eq('course_id', courseId)
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(5);
        
        if (eventsData) {
          setUpcomingEvents(eventsData.map(e => ({ ...e, is_assignment: false })));
        }
      }

      // Fetch course-specific announcements created by instructor/TA
      const { data: announcementsData } = await supabase
        .from('course_announcements')
        .select('id, title, content, is_pinned, created_at')
        .eq('course_id', courseId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (announcementsData) {
        setAnnouncements(announcementsData);
      }

      // (Current module is set above from mappedAssignments to avoid stale state.)
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

  // Find the most urgent assignment (prioritize overdue, then pending, skip submitted/graded)
  const pendingAssignments = assignments.filter(a => a.status === 'pending' || a.status === 'overdue');
  const urgentAssignment = pendingAssignments.find(a => a.status === 'overdue') || pendingAssignments[0];

  // Helper to get status badge
  const getStatusBadge = (status: Assignment['status']) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="default" className="text-xs flex items-center gap-1"><CheckCircle className="h-3 w-3" />Submitted</Badge>;
      case 'graded':
        return <Badge variant="outline" className="text-xs flex items-center gap-1 bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3" />Graded</Badge>;
      case 'overdue':
        return <Badge variant="destructive" className="text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3" />Overdue</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="flex gap-6">
      {/* Main Content Column - 70% */}
      <div className="flex-1 space-y-6 min-w-0">
        
        {/* What's Due Next Card - only show if there's a pending/overdue assignment */}
        {urgentAssignment && (
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                What's Due Next
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-card rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{urgentAssignment.title}</h3>
                      {getStatusBadge(urgentAssignment.status)}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      Due: {format(new Date(urgentAssignment.due_date), 'MMM d')} · {urgentAssignment.points} pts
                      {urgentAssignment.status === 'overdue' && ' · OVERDUE'}
                    </p>
                  </div>
                  <Button 
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => {
                      if (urgentAssignment.is_discussion) {
                        // Navigate to discussions tab
                        navigate(`/academy/${course.courseCode.toLowerCase().replace(' ', '-')}?tab=discussions`);
                      } else {
                        navigate(`/grading/student/assignment/${urgentAssignment.id}`);
                      }
                    }}
                  >
                    {urgentAssignment.is_discussion 
                      ? (urgentAssignment.status === 'submitted' ? 'View Discussion' : 'Join Discussion')
                      : (urgentAssignment.status === 'submitted' || urgentAssignment.status === 'graded' 
                        ? 'View Submission' 
                        : 'Start Assignment')}
                  </Button>
                </div>
                {urgentAssignment.description && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground p-2">
                        <span className="text-sm">View Assignment Description</span>
                        <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <div 
                        className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: urgentAssignment.description }}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Topic Photo Slider */}
        <CourseTopicSlider courseCode={course.courseCode} isAdmin={isAdmin} />

        {/* Current Module / Week - Only show for MUS 240 which has DB-driven modules */}
        {currentModule && course.courseCode === 'MUS 240' && (
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
              <h3 className="text-xl font-bold">Week {currentModule.week_number}: {currentModule.title}</h3>
              <div className="flex gap-2 text-sm text-muted-foreground mt-1">
                {currentModule.content_types.map((type, idx) => (
                  <React.Fragment key={type}>
                    {idx > 0 && <span>·</span>}
                    <span className="flex items-center gap-1">
                      {type === 'Video' && <Play className="h-3 w-3" />}
                      {type}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Module Assignment Preview - show first pending/overdue assignment */}
            {urgentAssignment && (
              <div className="p-3 bg-muted/30 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{urgentAssignment.title}</span>
                      {getStatusBadge(urgentAssignment.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      Due: {format(new Date(urgentAssignment.due_date), 'MMM d')} · {urgentAssignment.points} pts
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    className="bg-primary hover:bg-primary/90 text-xs"
                    onClick={() => navigate(`/grading/student/assignment/${urgentAssignment.id}`)}
                  >
                    {urgentAssignment.status === 'submitted' || urgentAssignment.status === 'graded' 
                      ? 'View Submission' 
                      : 'Start Assignment'}
                  </Button>
                </div>
                {urgentAssignment.description && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground p-1.5 h-auto">
                        <span className="text-xs">View Description</span>
                        <ChevronDown className="h-3 w-3 transition-transform duration-200 data-[state=open]:rotate-180" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-1">
                      <div 
                        className="text-xs text-muted-foreground bg-background/50 rounded-md p-2 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: urgentAssignment.description }}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}

            {/* Assignments List */}
            <div className="space-y-3">
              <h4 className="font-semibold text-base">Assignments</h4>
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assignments yet</p>
              ) : (
                <div className="space-y-2">
                  {assignments.slice(0, 4).map((assignment) => (
                    <Collapsible key={assignment.id}>
                      <div className="py-2 border-b last:border-0">
                        <div className="flex items-center justify-between">
                          <div 
                            className="flex items-center gap-3 cursor-pointer hover:opacity-80 flex-1"
                            onClick={() => {
                              if (assignment.is_discussion) {
                                navigate(`/academy/${course.courseCode.toLowerCase().replace(' ', '-')}?tab=discussions`);
                              } else {
                                navigate(`/grading/student/assignment/${assignment.id}`);
                              }
                            }}
                          >
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">•</span>
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium hover:underline">{assignment.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Due: {format(new Date(assignment.due_date), 'MMM d')} · {assignment.points} pts
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {assignment.description && (
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground">
                                  <ChevronDown className="h-3 w-3 mr-1 transition-transform duration-200 data-[state=open]:rotate-180" />
                                  Details
                                </Button>
                              </CollapsibleTrigger>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => {
                                if (assignment.is_discussion) {
                                  navigate(`/academy/${course.courseCode.toLowerCase().replace(' ', '-')}?tab=discussions`);
                                } else {
                                  navigate(`/grading/student/assignment/${assignment.id}`);
                                }
                              }}
                            >
                              {assignment.status === 'submitted' ? (
                                <span className="text-primary font-medium">View →</span>
                              ) : assignment.status === 'graded' ? (
                                <span className="text-green-600 font-medium">Graded →</span>
                              ) : assignment.status === 'overdue' ? (
                                <span className="text-destructive font-medium">Overdue</span>
                              ) : (
                                <span className="text-muted-foreground">{assignment.points} pts</span>
                              )}
                            </Button>
                          </div>
                        </div>
                        {assignment.description && (
                          <CollapsibleContent className="pt-2 pl-8">
                            <div 
                              className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: assignment.description }}
                            />
                          </CollapsibleContent>
                        )}
                      </div>
                    </Collapsible>
                  ))}
                </div>
              )}
            </div>

            {/* Announcements Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-base flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  Announcements
                </h4>
                {announcements.length > 0 && announcements.filter(a => !dismissedAnnouncements.has(a.id)).length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-7"
                    onClick={() => {
                      const allIds = new Set(announcements.map(a => a.id));
                      setDismissedAnnouncements(allIds);
                    }}
                  >
                    Dismiss All
                  </Button>
                )}
              </div>
              {announcements.filter(a => !dismissedAnnouncements.has(a.id)).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No announcements at this time
                </p>
              ) : (
                <div className="space-y-2">
                  {announcements
                    .filter(a => !dismissedAnnouncements.has(a.id))
                    .slice(0, 3)
                    .map((announcement) => (
                      <Card key={announcement.id} className="bg-muted/20">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{announcement.title}</p>
                                {announcement.is_pinned && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                    Pinned
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                                {announcement.content}
                              </p>
                              {announcement.created_at && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => {
                                setDismissedAnnouncements(prev => new Set([...prev, announcement.id]));
                              }}
                            >
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        )}
      </div>

      {/* Right Sidebar - 30% */}
      <div className="w-80 flex-shrink-0 space-y-6 hidden lg:block">
        {/* Upcoming Events & Assignments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming events or assignments
              </p>
            ) : (
              upcomingEvents.map((event) => (
                <div 
                  key={event.id} 
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                    event.is_assignment 
                      ? 'bg-primary/10 hover:bg-primary/20 border-l-2 border-l-primary' 
                      : 'bg-accent/30 hover:bg-accent/50'
                  }`}
                  onClick={() => {
                    if (event.is_assignment) {
                      const assignmentId = event.id.replace('assignment-', '');
                      if (event.is_discussion) {
                        navigate(`/academy/${course.courseCode.toLowerCase().replace(' ', '-')}?tab=discussions`);
                      } else {
                        navigate(`/grading/student/assignment/${assignmentId}`);
                      }
                    }
                  }}
                >
                  <div className="flex-shrink-0 w-10 text-center">
                    <div className={`text-[10px] font-semibold uppercase ${
                      event.is_assignment ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {format(new Date(event.start_date), 'MMM')}
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {format(new Date(event.start_date), 'd')}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{event.title}</p>
                      {event.is_assignment && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                          {event.points} pts
                        </Badge>
                      )}
                    </div>
                    {event.is_assignment ? (
                      <p className="text-xs text-muted-foreground">
                        Due {format(new Date(event.start_date), 'h:mm a')}
                        {event.assignment_status === 'submitted' && (
                          <span className="ml-2 text-green-600">✓ Submitted</span>
                        )}
                        {event.assignment_status === 'graded' && (
                          <span className="ml-2 text-blue-600">✓ Graded</span>
                        )}
                      </p>
                    ) : event.location ? (
                      <p className="text-xs text-muted-foreground truncate">{event.location}</p>
                    ) : null}
                  </div>
                  {event.is_assignment && (
                    <div className="flex-shrink-0">
                      <ClipboardList className="h-4 w-4 text-primary" />
                    </div>
                  )}
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
