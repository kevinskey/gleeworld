import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Calendar, ClipboardList, CheckCircle, XCircle, Clock, 
  FileText, AlertCircle, Play, ChevronDown, BookOpen, Headphones,
  MessageSquare, PenLine, BookMarked, ExternalLink, ArrowRight,
  Lightbulb, Target, ListChecks
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMus240SemesterSafe } from '@/contexts/Mus240SemesterContext';
import { getCourseByCode } from '@/config/academyCourses';
import { CourseTopicSlider } from './CourseTopicSlider';

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

interface CurrentModule {
  id: string;
  title: string;
  week_number: number;
  content_types: string[];
  assignments: Assignment[];
}

interface TeachingFirstHomeProps {
  courseId: string;
  isAdmin?: boolean;
}

export const TeachingFirstHome: React.FC<TeachingFirstHomeProps> = ({ courseId, isAdmin = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentSemester } = useMus240SemesterSafe();
  const [attendance, setAttendance] = useState<{ present: number; absent: number; late: number }>({ present: 0, absent: 0, late: 0 });
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [currentModule, setCurrentModule] = useState<CurrentModule | null>(null);
  const [loading, setLoading] = useState(true);

  const course = getCourseByCode(courseId) || { courseCode: 'MUS 240', title: 'Course' };

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user, courseId, location.key]);

  const fetchStudentData = async () => {
    if (!user) return;
    
    try {
      // Fetch attendance records
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('user_id', user.id);

      if (attendanceData) {
        setAttendance({
          present: attendanceData.filter(a => a.status === 'present').length,
          absent: attendanceData.filter(a => a.status === 'absent').length,
          late: attendanceData.filter(a => a.status === 'late').length,
        });
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

        // Fetch discussions
        const { data: discussionsData } = await supabase
          .from('course_discussions')
          .select('id, title, content, due_date, max_points, course_id')
          .eq('course_id', courseId)
          .not('due_date', 'is', null)
          .order('due_date', { ascending: true })
          .limit(10);

        const discussionIds: string[] = (discussionsData || []).map((d: any) => d.id as string);
        let repliedDiscussionIds = new Set<string>();
        if (discussionIds.length > 0 && user?.id) {
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

        const discussionAssignments: Assignment[] = (discussionsData || [])
          .filter((d: any) => d.due_date)
          .map((d: any) => {
            const due = new Date(d.due_date);
            const hasReplied = repliedDiscussionIds.has(d.id);
            let status: Assignment['status'] = 'pending';
            if (hasReplied) {
              status = 'submitted';
            } else if (due < now) {
              status = 'overdue';
            }
            return {
              id: d.id,
              title: d.title,
              due_date: d.due_date,
              points: d.max_points || 10,
              status,
              course_id: d.course_id,
              description: d.content,
              is_discussion: true
            };
          });

        const allAssignments = [...mappedAssignments, ...discussionAssignments];
        setAssignments(allAssignments);

        // Mock current module - in production this would come from the database
        setCurrentModule({
          id: '1',
          title: 'African Roots',
          week_number: 2,
          content_types: ['Video', 'Reading', 'Listening', 'Discussion', 'Journal'],
          assignments: allAssignments.filter(a => a.status === 'pending' || a.status === 'overdue').slice(0, 3),
        });

        // Fetch upcoming events
        const { data: eventsData } = await supabase
          .from('gw_events')
          .select('id, title, start_date, location, event_type')
          .eq('course_id', courseId)
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(5);

        const currentTime = new Date();
        const assignmentEvents: UpcomingEvent[] = assignmentsData
          .filter((a: any) => a.due_date && new Date(a.due_date) >= currentTime)
          .map((a: any) => ({
            id: `assignment-${a.id}`,
            title: a.title,
            start_date: a.due_date,
            event_type: 'assignment',
            is_assignment: true,
            assignment_status: submissionStatusByAssignmentId.get(a.id) === 'graded' ? 'graded' : 
                              submissionStatusByAssignmentId.get(a.id) ? 'submitted' : 'pending',
            points: a.max_points || 100
          }));

        const allEvents: UpcomingEvent[] = [
          ...(eventsData || []).map(e => ({ ...e, is_assignment: false })),
          ...assignmentEvents
        ].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
         .slice(0, 6);

        setUpcomingEvents(allEvents);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Find the most urgent assignment
  const pendingAssignments = assignments.filter(a => a.status === 'pending' || a.status === 'overdue');
  const urgentAssignment = pendingAssignments.find(a => a.status === 'overdue') || pendingAssignments[0];

  const getStatusBadge = (status: Assignment['status']) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="default" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />Submitted</Badge>;
      case 'graded':
        return <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Graded</Badge>;
      case 'overdue':
        return <Badge variant="destructive" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" />Overdue</Badge>;
      default:
        return null;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'video': return <Play className="h-4 w-4" />;
      case 'listening': return <Headphones className="h-4 w-4" />;
      case 'reading': return <BookMarked className="h-4 w-4" />;
      case 'discussion': return <MessageSquare className="h-4 w-4" />;
      case 'journal': return <PenLine className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex gap-6">
      {/* Main Content Column */}
      <div className="flex-1 space-y-4 min-w-0">
        
        {/* 1. DO THIS NOW - Most urgent assignment */}
        {urgentAssignment && (
          <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-amber-700 dark:text-amber-400">
                <Target className="h-5 w-5" />
                Do This Now
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{urgentAssignment.title}</h3>
                    {getStatusBadge(urgentAssignment.status)}
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>Due: {format(new Date(urgentAssignment.due_date), 'MMM d, h:mm a')} · {urgentAssignment.points} pts</span>
                    {urgentAssignment.status === 'overdue' && <span className="text-destructive font-medium">· OVERDUE</span>}
                  </p>
                </div>
                <Button 
                  size="lg"
                  className="bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto"
                  onClick={() => {
                    if (urgentAssignment.is_discussion) {
                      navigate(`/academy/${course.courseCode.toLowerCase().replace(' ', '-')}?tab=discussions`);
                    } else {
                      navigate(`/grading/student/assignment/${urgentAssignment.id}`);
                    }
                  }}
                >
                  {urgentAssignment.is_discussion ? 'Join Discussion' : 'Start Now'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 2. CURRENT LEARNING FOCUS - Topic with image */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Lightbulb className="h-5 w-5 text-primary" />
              Current Learning Focus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Topic Photo Slider */}
            <CourseTopicSlider courseCode={course.courseCode} isAdmin={isAdmin} />
            
            {/* Optional description */}
            <p className="text-sm text-muted-foreground">
              Explore the origins and evolution of African American musical traditions through listening, reading, and critical analysis.
            </p>
          </CardContent>
        </Card>

        {/* 3. THIS WEEK'S MODULE - Weekly activities */}
        {currentModule && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <ListChecks className="h-5 w-5 text-primary" />
                This Week's Module
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Week {currentModule.week_number}: {currentModule.title}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Activity checklist */}
              <div className="grid gap-2">
                {currentModule.content_types.map((type) => {
                  // Check if there's an assignment of this type that's completed
                  const isCompleted = false; // In production, derive from actual data
                  
                  return (
                    <div 
                      key={type}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        isCompleted 
                          ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' 
                          : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        isCompleted ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'
                      }`}>
                        {getActivityIcon(type)}
                      </div>
                      <span className="flex-1 font-medium text-sm">{type}</span>
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Button variant="ghost" size="sm" className="text-xs h-7">
                          Start
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pending assignments for this module */}
              {currentModule.assignments.length > 0 && (
                <div className="pt-3 border-t">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    Due This Week
                  </h4>
                  <div className="space-y-2">
                    {currentModule.assignments.map((assignment) => (
                      <div 
                        key={assignment.id}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          if (assignment.is_discussion) {
                            navigate(`/academy/${course.courseCode.toLowerCase().replace(' ', '-')}?tab=discussions`);
                          } else {
                            navigate(`/grading/student/assignment/${assignment.id}`);
                          }
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{assignment.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Due {format(new Date(assignment.due_date), 'MMM d')} · {assignment.points} pts
                          </p>
                        </div>
                        {getStatusBadge(assignment.status)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Context Panel */}
      <div className="w-72 flex-shrink-0 space-y-4 hidden lg:block">
        {/* Upcoming */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-y-auto">
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                No upcoming events
              </p>
            ) : (
              upcomingEvents.slice(0, 4).map((event) => (
                <div 
                  key={event.id} 
                  className={`flex items-start gap-2 p-2 rounded-md text-xs transition-colors cursor-pointer ${
                    event.is_assignment 
                      ? 'bg-primary/5 hover:bg-primary/10 border-l-2 border-l-primary' 
                      : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                  onClick={() => {
                    if (event.is_assignment) {
                      const assignmentId = event.id.replace('assignment-', '');
                      navigate(`/grading/student/assignment/${assignmentId}`);
                    }
                  }}
                >
                  <div className="text-center shrink-0 w-8">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                      {format(new Date(event.start_date), 'MMM')}
                    </div>
                    <div className="text-sm font-bold">
                      {format(new Date(event.start_date), 'd')}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{event.title}</p>
                    {event.is_assignment && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 mt-1">
                        {event.points} pts
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Attendance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-green-600">{attendance.present}</p>
                <p className="text-[10px] text-muted-foreground">Present</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-red-600">{attendance.absent}</p>
                <p className="text-[10px] text-muted-foreground">Absent</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-amber-600">{attendance.late}</p>
                <p className="text-[10px] text-muted-foreground">Late</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              Quick Links
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              { label: 'Syllabus', icon: BookOpen },
              { label: 'Grades', icon: ClipboardList },
              { label: 'Resources', icon: FileText },
            ].map((link) => (
              <Button
                key={link.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs h-8"
                onClick={() => {
                  // Navigate to appropriate tab
                  const tabMap: Record<string, string> = {
                    'Syllabus': 'syllabus',
                    'Grades': 'grades',
                    'Resources': 'resources',
                  };
                  navigate(`/academy/${course.courseCode.toLowerCase().replace(' ', '-')}?tab=${tabMap[link.label]}`);
                }}
              >
                <link.icon className="h-3.5 w-3.5 mr-2" />
                {link.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
