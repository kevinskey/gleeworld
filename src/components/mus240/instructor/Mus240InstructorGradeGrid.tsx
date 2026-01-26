import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Check, X, Clock, Minus, Download, Users, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';

const MUS240_COURSE_ID = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37';

// Helper to avoid deep type instantiation
const query = (table: string) => supabase.from(table as any);

interface Student {
  user_id: string;
  full_name: string;
  email: string;
}

interface AttendanceSession {
  id: string;
  title: string;
  opens_at: string;
}

interface AttendanceRecord {
  attendance_session_id: string;
  student_profile_id: string;
  status: string;
}

interface Assignment {
  id: string;
  title: string;
  due_date: string;
  points: number | null;
}

interface Submission {
  assignment_id: string;
  student_id: string;
  grade: number | null;
  status: string;
}

interface Poll {
  id: string;
  title: string;
  created_at: string;
}

interface PollResponse {
  poll_id: string;
  student_id: string;
}

interface Discussion {
  id: string;
  title: string;
  created_at: string;
}

interface DiscussionGrade {
  discussion_id: string;
  student_id: string;
  total_score: number;
}

export const Mus240InstructorGradeGrid: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollResponses, setPollResponses] = useState<PollResponse[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [discussionGrades, setDiscussionGrades] = useState<DiscussionGrade[]>([]);

  // Use unified semester constant
  const currentSemester = 'Spring 2026';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch students from gw_course_enrollments (unified source of truth)
      const enrollmentsResult = await query('gw_course_enrollments')
        .select('user_id')
        .eq('course_id', MUS240_COURSE_ID)
        .eq('semester', currentSemester)
        .eq('enrollment_status', 'enrolled');
      const enrollments = (enrollmentsResult.data || []) as unknown as { user_id: string }[];
      
      const studentIds = enrollments.map(e => e.user_id);
      
      const profilesResult = await query('gw_profiles')
        .select('user_id, full_name, email')
        .in('user_id', studentIds.length > 0 ? studentIds : ['none'])
        .order('full_name');
      
      setStudents((profilesResult.data || []) as unknown as Student[]);

      // Fetch attendance sessions
      const sessionsResult = await query('gw_attendance_sessions')
        .select('id, title, opens_at')
        .eq('course_id', MUS240_COURSE_ID)
        .order('opens_at', { ascending: true });
      const sessions = (sessionsResult.data || []) as unknown as AttendanceSession[];
      
      setAttendanceSessions(sessions);

      const sessionIds = sessions.map(s => s.id);
      
      // Fetch attendance records
      const recordsResult = await query('gw_attendance_records')
        .select('attendance_session_id, student_profile_id, status')
        .in('attendance_session_id', sessionIds.length > 0 ? sessionIds : ['none']);
      
      setAttendanceRecords((recordsResult.data || []) as unknown as AttendanceRecord[]);

      // Fetch assignments
      const assignmentsResult = await query('gw_course_assignments')
        .select('id, title, due_date, points')
        .eq('course_id', MUS240_COURSE_ID)
        .eq('is_published', true)
        .order('due_date', { ascending: true });
      const assignmentsData = (assignmentsResult.data || []) as unknown as Assignment[];
      
      setAssignments(assignmentsData);

      const assignmentIds = assignmentsData.map(a => a.id);
      
      // Fetch submissions
      const submissionsResult = await query('assignment_submissions')
        .select('assignment_id, student_id, grade, status')
        .in('assignment_id', assignmentIds.length > 0 ? assignmentIds : ['none']);
      
      setSubmissions((submissionsResult.data || []) as unknown as Submission[]);

      // Fetch polls
      const pollsResult = await query('mus240_polls')
        .select('id, title, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      const pollsData = (pollsResult.data || []) as unknown as Poll[];
      
      setPolls(pollsData);

      const pollIds = pollsData.map(p => p.id);
      
      // Fetch poll responses
      const pollResponsesResult = await query('mus240_poll_responses')
        .select('poll_id, student_id')
        .in('poll_id', pollIds.length > 0 ? pollIds : ['none']);
      
      setPollResponses((pollResponsesResult.data || []) as unknown as PollResponse[]);

      // Fetch discussions
      const discussionsResult = await query('discussion_prompts')
        .select('id, title, created_at')
        .eq('course_id', MUS240_COURSE_ID)
        .order('created_at', { ascending: true });
      const discussionsData = (discussionsResult.data || []) as unknown as Discussion[];
      
      setDiscussions(discussionsData);

      const discussionIds = discussionsData.map(d => d.id);
      
      // Fetch discussion grades
      const gradesResult = await query('discussion_grades')
        .select('discussion_id, student_id, total_score')
        .in('discussion_id', discussionIds.length > 0 ? discussionIds : ['none']);
      
      setDiscussionGrades((gradesResult.data || []) as unknown as DiscussionGrade[]);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Process data for display
  const processedData = useMemo(() => {
    if (students.length === 0) return null;

    const now = new Date();
    const pastSessions = attendanceSessions.filter(s => new Date(s.opens_at) < now);
    
    // Create lookup maps
    const attendanceMap = new Map<string, Map<string, string>>();
    attendanceRecords.forEach(r => {
      if (!attendanceMap.has(r.student_profile_id)) {
        attendanceMap.set(r.student_profile_id, new Map());
      }
      attendanceMap.get(r.student_profile_id)!.set(r.attendance_session_id, r.status);
    });

    const submissionMap = new Map<string, Map<string, { grade: number | null; status: string }>>();
    submissions.forEach(s => {
      if (!submissionMap.has(s.student_id)) {
        submissionMap.set(s.student_id, new Map());
      }
      submissionMap.get(s.student_id)!.set(s.assignment_id, { grade: s.grade, status: s.status });
    });

    const pollResponseMap = new Map<string, Set<string>>();
    pollResponses.forEach(r => {
      if (!pollResponseMap.has(r.student_id)) {
        pollResponseMap.set(r.student_id, new Set());
      }
      pollResponseMap.get(r.student_id)!.add(r.poll_id);
    });

    const discussionGradeMap = new Map<string, Map<string, number>>();
    discussionGrades.forEach(g => {
      if (!discussionGradeMap.has(g.student_id)) {
        discussionGradeMap.set(g.student_id, new Map());
      }
      discussionGradeMap.get(g.student_id)!.set(g.discussion_id, g.total_score);
    });

    // Calculate per-student data
    const studentData = students.map(student => {
      const studentAttendance = attendanceMap.get(student.user_id) || new Map();
      const presentCount = pastSessions.filter(s => 
        studentAttendance.get(s.id) === 'present' || studentAttendance.get(s.id) === 'excused'
      ).length;
      const attendancePercent = pastSessions.length > 0 ? (presentCount / pastSessions.length) * 100 : 100;

      const studentSubmissions = submissionMap.get(student.user_id) || new Map();
      const studentPolls = pollResponseMap.get(student.user_id) || new Set();
      const studentDiscussions = discussionGradeMap.get(student.user_id) || new Map();

      const pollPercent = polls.length > 0 
        ? (studentPolls.size / polls.length) * 100 
        : 100;

      const discussionScores = Array.from(studentDiscussions.values());
      const discussionAvg = discussionScores.length > 0
        ? discussionScores.reduce((a, b) => a + b, 0) / discussionScores.length
        : 100;

      // Participation: Polls 25%, Discussions 25%, Attendance 50%
      const participationPercent = (pollPercent * 0.25) + (discussionAvg * 0.25) + (attendancePercent * 0.5);

      return {
        ...student,
        attendance: {
          present: presentCount,
          total: pastSessions.length,
          percent: attendancePercent,
          bySession: studentAttendance
        },
        polls: {
          completed: studentPolls.size,
          total: polls.length,
          percent: pollPercent,
          responses: studentPolls
        },
        discussions: {
          graded: studentDiscussions.size,
          total: discussions.length,
          avgScore: discussionAvg,
          grades: studentDiscussions
        },
        participation: participationPercent,
        submissions: studentSubmissions
      };
    });

    return {
      students: studentData,
      sessions: pastSessions,
      allSessions: attendanceSessions,
      assignments,
      polls,
      discussions
    };
  }, [students, attendanceSessions, attendanceRecords, assignments, submissions, polls, pollResponses, discussions, discussionGrades]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (!processedData) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    );
  }

  const StatusIcon = ({ status }: { status: string | null }) => {
    switch (status) {
      case 'present':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'absent':
        return <X className="h-4 w-4 text-red-600" />;
      case 'excused':
        return <Clock className="h-4 w-4 text-amber-600" />;
      case 'late':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'Email', 'Attendance %', 'Polls %', 'Discussions Avg', 'Participation %'];
    const rows = processedData.students.map(s => [
      s.full_name,
      s.email,
      s.attendance.percent.toFixed(1),
      s.polls.percent.toFixed(1),
      s.discussions.avgScore.toFixed(1),
      s.participation.toFixed(1)
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mus240-grades-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          MUS-240 Grade Spreadsheet
          <Badge variant="outline">{processedData.students.length} Students</Badge>
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-lg mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="essays">Essays</TabsTrigger>
            <TabsTrigger value="participation">Participation</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <ScrollArea className="w-full">
              <div className="min-w-[800px]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border p-2 text-left font-medium sticky left-0 bg-muted/50 z-10">Student</th>
                      <th className="border p-2 text-center font-medium">Attendance</th>
                      <th className="border p-2 text-center font-medium">Polls</th>
                      <th className="border p-2 text-center font-medium">Discussions</th>
                      <th className="border p-2 text-center font-medium">Participation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedData.students.map(student => (
                      <tr key={student.user_id} className="hover:bg-muted/30">
                        <td className="border p-2 font-medium sticky left-0 bg-background z-10">
                          {student.full_name}
                        </td>
                        <td className="border p-2 text-center">
                          <Badge variant={student.attendance.percent >= 90 ? 'default' : student.attendance.percent >= 70 ? 'secondary' : 'destructive'}>
                            {student.attendance.percent.toFixed(0)}%
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {student.attendance.present}/{student.attendance.total}
                          </div>
                        </td>
                        <td className="border p-2 text-center">
                          <Badge variant={student.polls.percent >= 80 ? 'default' : 'secondary'}>
                            {student.polls.percent.toFixed(0)}%
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {student.polls.completed}/{student.polls.total}
                          </div>
                        </td>
                        <td className="border p-2 text-center">
                          <Badge variant={student.discussions.avgScore >= 80 ? 'default' : 'secondary'}>
                            {student.discussions.avgScore.toFixed(0)}%
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {student.discussions.graded}/{student.discussions.total} graded
                          </div>
                        </td>
                        <td className="border p-2 text-center">
                          <Badge variant={student.participation >= 90 ? 'default' : student.participation >= 70 ? 'secondary' : 'destructive'}>
                            {student.participation.toFixed(0)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <ScrollArea className="w-full">
              <div className="min-w-[1200px]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border p-2 text-left font-medium sticky left-0 bg-muted/50 z-10 min-w-[200px]">Student</th>
                      {processedData.allSessions.map(session => (
                        <th key={session.id} className="border p-1 text-center font-medium text-xs min-w-[60px]">
                          {format(parseISO(session.opens_at), 'M/d')}
                        </th>
                      ))}
                      <th className="border p-2 text-center font-medium bg-muted">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedData.students.map(student => (
                      <tr key={student.user_id} className="hover:bg-muted/30">
                        <td className="border p-2 font-medium sticky left-0 bg-background z-10">
                          {student.full_name}
                        </td>
                        {processedData.allSessions.map(session => {
                          const status = student.attendance.bySession.get(session.id);
                          const isPast = new Date(session.opens_at) < new Date();
                          return (
                            <td key={session.id} className={cn(
                              "border p-1 text-center",
                              !isPast && "bg-muted/20"
                            )}>
                              {isPast ? <StatusIcon status={status || null} /> : <Minus className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                            </td>
                          );
                        })}
                        <td className="border p-2 text-center bg-muted/30">
                          <Badge variant={student.attendance.percent >= 90 ? 'default' : 'destructive'}>
                            {student.attendance.percent.toFixed(0)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </TabsContent>

          {/* Essays Tab */}
          <TabsContent value="essays">
            <ScrollArea className="w-full">
              <div className="min-w-[1000px]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border p-2 text-left font-medium sticky left-0 bg-muted/50 z-10 min-w-[200px]">Student</th>
                      {processedData.assignments.map(assignment => (
                        <th key={assignment.id} className="border p-1 text-center font-medium text-xs min-w-[80px]">
                          <div className="truncate max-w-[100px]" title={assignment.title}>
                            {assignment.title}
                          </div>
                          <div className="text-muted-foreground font-normal">
                            {assignment.points}pts
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {processedData.students.map(student => (
                      <tr key={student.user_id} className="hover:bg-muted/30">
                        <td className="border p-2 font-medium sticky left-0 bg-background z-10">
                          {student.full_name}
                        </td>
                        {processedData.assignments.map(assignment => {
                          const submission = student.submissions.get(assignment.id);
                          return (
                            <td key={assignment.id} className="border p-1 text-center">
                              {submission?.status === 'graded' && submission.grade !== null ? (
                                <Badge variant={submission.grade >= (assignment.points || 100) * 0.7 ? 'default' : 'destructive'}>
                                  {submission.grade}
                                </Badge>
                              ) : submission?.status === 'submitted' ? (
                                <Badge variant="secondary">Pending</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </TabsContent>

          {/* Participation Tab */}
          <TabsContent value="participation">
            <ScrollArea className="w-full">
              <div className="min-w-[800px]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border p-2 text-left font-medium sticky left-0 bg-muted/50 z-10">Student</th>
                      <th className="border p-2 text-center font-medium" colSpan={2}>Polls (25%)</th>
                      <th className="border p-2 text-center font-medium" colSpan={2}>Discussions (25%)</th>
                      <th className="border p-2 text-center font-medium" colSpan={2}>Attendance (50%)</th>
                      <th className="border p-2 text-center font-medium bg-primary/10">Total</th>
                    </tr>
                    <tr className="bg-muted/30 text-xs">
                      <th className="border p-1 sticky left-0 bg-muted/30"></th>
                      <th className="border p-1 text-center">Count</th>
                      <th className="border p-1 text-center">%</th>
                      <th className="border p-1 text-center">Count</th>
                      <th className="border p-1 text-center">Avg</th>
                      <th className="border p-1 text-center">Present</th>
                      <th className="border p-1 text-center">%</th>
                      <th className="border p-1 text-center bg-primary/10">Weighted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedData.students.map(student => (
                      <tr key={student.user_id} className="hover:bg-muted/30">
                        <td className="border p-2 font-medium sticky left-0 bg-background z-10">
                          {student.full_name}
                        </td>
                        <td className="border p-2 text-center">
                          {student.polls.completed}/{student.polls.total}
                        </td>
                        <td className="border p-2 text-center">
                          {student.polls.percent.toFixed(0)}%
                        </td>
                        <td className="border p-2 text-center">
                          {student.discussions.graded}/{student.discussions.total}
                        </td>
                        <td className="border p-2 text-center">
                          {student.discussions.avgScore.toFixed(0)}%
                        </td>
                        <td className="border p-2 text-center">
                          {student.attendance.present}/{student.attendance.total}
                        </td>
                        <td className="border p-2 text-center">
                          {student.attendance.percent.toFixed(0)}%
                        </td>
                        <td className="border p-2 text-center bg-primary/5">
                          <Badge variant={student.participation >= 90 ? 'default' : student.participation >= 70 ? 'secondary' : 'destructive'}>
                            {student.participation.toFixed(0)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
