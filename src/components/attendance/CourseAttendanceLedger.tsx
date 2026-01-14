import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { 
  BookOpen, Users, Calendar, Download, Search, 
  CheckCircle, XCircle, Clock, AlertCircle, RefreshCw,
  BarChart3, TrendingUp, User
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Course {
  id: string;
  title: string;
  course_code: string;
  semester: string;
}

interface CourseSession {
  id: string;
  title: string;
  start_time: string;
  course_id: string;
}

interface AttendanceRecord {
  id: string;
  course_id: string;
  student_id: string;
  attendance_date: string;
  status: string;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  student_name?: string;
  student_email?: string;
}

interface StudentSummary {
  student_id: string;
  student_name: string;
  student_email: string;
  total_sessions: number;
  present: number;
  absent: number;
  excused: number;
  late: number;
  attendance_rate: number;
}

interface SessionSummary {
  session_date: string;
  total_students: number;
  present: number;
  absent: number;
  excused: number;
  late: number;
  attendance_rate: number;
}

export const CourseAttendanceLedger: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [semesters, setSemesters] = useState<string[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [studentSummaries, setStudentSummaries] = useState<StudentSummary[]>([]);
  const [sessionSummaries, setSessionSummaries] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // Fetch courses and semesters
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data, error } = await supabase
          .from('gw_courses')
          .select('id, title, course_code, semester')
          .eq('is_active', true)
          .order('course_code');

        if (error) throw error;

        setCourses(data || []);
        
        // Extract unique semesters
        const uniqueSemesters = [...new Set(data?.map(c => c.semester).filter(Boolean))];
        setSemesters(uniqueSemesters);
        
        // Default to first semester if available
        if (uniqueSemesters.length > 0 && !selectedSemester) {
          setSelectedSemester(uniqueSemesters[0]);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        toast({
          title: 'Error',
          description: 'Failed to load courses',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // Fetch attendance data when course is selected
  useEffect(() => {
    if (!selectedCourse) {
      setAttendanceRecords([]);
      setStudentSummaries([]);
      setSessionSummaries([]);
      return;
    }

    const fetchAttendanceData = async () => {
      setLoading(true);
      try {
        // Fetch attendance records
        const { data: records, error: recordsError } = await supabase
          .from('gw_course_attendance')
          .select('*')
          .eq('course_id', selectedCourse)
          .order('attendance_date', { ascending: false });

        if (recordsError) throw recordsError;

        // Get unique student IDs
        const studentIds = [...new Set(records?.map(r => r.student_id).filter(Boolean))];

        // Fetch student profiles
        let studentProfiles: Record<string, { full_name: string; email: string }> = {};
        if (studentIds.length > 0) {
          const { data: profiles } = await supabase
            .from('gw_profiles')
            .select('user_id, full_name, email')
            .in('user_id', studentIds);

          profiles?.forEach(p => {
            studentProfiles[p.user_id] = { full_name: p.full_name || 'Unknown', email: p.email || '' };
          });
        }

        // Enrich records with student names
        const enrichedRecords = (records || []).map(r => ({
          ...r,
          student_name: studentProfiles[r.student_id]?.full_name || 'Unknown',
          student_email: studentProfiles[r.student_id]?.email || '',
        }));

        setAttendanceRecords(enrichedRecords);

        // Calculate student summaries
        const studentStats: Record<string, StudentSummary> = {};
        enrichedRecords.forEach(r => {
          if (!studentStats[r.student_id]) {
            studentStats[r.student_id] = {
              student_id: r.student_id,
              student_name: r.student_name || 'Unknown',
              student_email: r.student_email || '',
              total_sessions: 0,
              present: 0,
              absent: 0,
              excused: 0,
              late: 0,
              attendance_rate: 0,
            };
          }
          studentStats[r.student_id].total_sessions++;
          const status = r.status?.toLowerCase() || 'absent';
          if (status === 'present') studentStats[r.student_id].present++;
          else if (status === 'absent') studentStats[r.student_id].absent++;
          else if (status === 'excused') studentStats[r.student_id].excused++;
          else if (status === 'late' || status === 'tardy') studentStats[r.student_id].late++;
        });

        // Calculate attendance rates
        Object.values(studentStats).forEach(s => {
          s.attendance_rate = s.total_sessions > 0 
            ? Math.round(((s.present + s.late) / s.total_sessions) * 100) 
            : 0;
        });

        setStudentSummaries(Object.values(studentStats).sort((a, b) => b.attendance_rate - a.attendance_rate));

        // Calculate session summaries
        const sessionStats: Record<string, SessionSummary> = {};
        enrichedRecords.forEach(r => {
          const date = r.attendance_date;
          if (!sessionStats[date]) {
            sessionStats[date] = {
              session_date: date,
              total_students: 0,
              present: 0,
              absent: 0,
              excused: 0,
              late: 0,
              attendance_rate: 0,
            };
          }
          sessionStats[date].total_students++;
          const status = r.status?.toLowerCase() || 'absent';
          if (status === 'present') sessionStats[date].present++;
          else if (status === 'absent') sessionStats[date].absent++;
          else if (status === 'excused') sessionStats[date].excused++;
          else if (status === 'late' || status === 'tardy') sessionStats[date].late++;
        });

        Object.values(sessionStats).forEach(s => {
          s.attendance_rate = s.total_students > 0 
            ? Math.round(((s.present + s.late) / s.total_students) * 100) 
            : 0;
        });

        setSessionSummaries(Object.values(sessionStats).sort((a, b) => 
          new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
        ));

      } catch (error) {
        console.error('Error fetching attendance:', error);
        toast({
          title: 'Error',
          description: 'Failed to load attendance data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [selectedCourse]);

  const filteredCourses = courses.filter(c => 
    !selectedSemester || c.semester === selectedSemester
  );

  const filteredStudents = studentSummaries.filter(s =>
    s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || 'absent';
    switch (statusLower) {
      case 'present':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Present</Badge>;
      case 'absent':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Absent</Badge>;
      case 'excused':
        return <Badge className="bg-blue-500"><AlertCircle className="h-3 w-3 mr-1" />Excused</Badge>;
      case 'late':
      case 'tardy':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Late</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const exportToCSV = () => {
    const selectedCourseData = courses.find(c => c.id === selectedCourse);
    const csvContent = [
      ['Student Name', 'Email', 'Total Sessions', 'Present', 'Absent', 'Excused', 'Late', 'Attendance Rate'],
      ...studentSummaries.map(s => [
        s.student_name,
        s.student_email,
        s.total_sessions,
        s.present,
        s.absent,
        s.excused,
        s.late,
        `${s.attendance_rate}%`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCourseData?.course_code || 'course'}-attendance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const overallStats = {
    totalStudents: studentSummaries.length,
    totalSessions: sessionSummaries.length,
    avgAttendance: studentSummaries.length > 0 
      ? Math.round(studentSummaries.reduce((acc, s) => acc + s.attendance_rate, 0) / studentSummaries.length)
      : 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Course Attendance Ledger
          </h2>
          <p className="text-muted-foreground">Track attendance by course and semester</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedCourse && (
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Semester</label>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map(sem => (
                    <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Course</label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCourses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.course_code} - {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Search Students</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name or email..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedCourse ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a course to view attendance records</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
            <p>Loading attendance data...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                    <p className="text-2xl font-bold">{overallStats.totalStudents}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Sessions</p>
                    <p className="text-2xl font-bold">{overallStats.totalSessions}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Attendance</p>
                    <p className={`text-2xl font-bold ${getAttendanceColor(overallStats.avgAttendance)}`}>
                      {overallStats.avgAttendance}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Records</p>
                    <p className="text-2xl font-bold">{attendanceRecords.length}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Student Summary</TabsTrigger>
              <TabsTrigger value="sessions">By Session</TabsTrigger>
              <TabsTrigger value="records">All Records</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Student Attendance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead className="text-center">Sessions</TableHead>
                          <TableHead className="text-center">Present</TableHead>
                          <TableHead className="text-center">Absent</TableHead>
                          <TableHead className="text-center">Excused</TableHead>
                          <TableHead className="text-center">Late</TableHead>
                          <TableHead className="text-center">Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map(student => (
                          <TableRow key={student.student_id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{student.student_name}</p>
                                <p className="text-sm text-muted-foreground">{student.student_email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{student.total_sessions}</TableCell>
                            <TableCell className="text-center text-green-600">{student.present}</TableCell>
                            <TableCell className="text-center text-red-600">{student.absent}</TableCell>
                            <TableCell className="text-center text-blue-600">{student.excused}</TableCell>
                            <TableCell className="text-center text-yellow-600">{student.late}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center gap-2">
                                <Progress value={student.attendance_rate} className="w-16 h-2" />
                                <span className={`font-medium ${getAttendanceColor(student.attendance_rate)}`}>
                                  {student.attendance_rate}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredStudents.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No attendance records found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sessions" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Attendance by Session
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-center">Present</TableHead>
                          <TableHead className="text-center">Absent</TableHead>
                          <TableHead className="text-center">Excused</TableHead>
                          <TableHead className="text-center">Late</TableHead>
                          <TableHead className="text-center">Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessionSummaries.map(session => (
                          <TableRow key={session.session_date}>
                            <TableCell className="font-medium">
                              {format(parseISO(session.session_date), 'EEEE, MMMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-center">{session.total_students}</TableCell>
                            <TableCell className="text-center text-green-600">{session.present}</TableCell>
                            <TableCell className="text-center text-red-600">{session.absent}</TableCell>
                            <TableCell className="text-center text-blue-600">{session.excused}</TableCell>
                            <TableCell className="text-center text-yellow-600">{session.late}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Progress value={session.attendance_rate} className="w-16 h-2" />
                                <span className={`font-medium ${getAttendanceColor(session.attendance_rate)}`}>
                                  {session.attendance_rate}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {sessionSummaries.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No sessions found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="records" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    All Attendance Records
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceRecords.map(record => (
                          <TableRow key={record.id}>
                            <TableCell>
                              {format(parseISO(record.attendance_date), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{record.student_name}</p>
                                <p className="text-sm text-muted-foreground">{record.student_email}</p>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(record.status)}</TableCell>
                            <TableCell className="text-muted-foreground">{record.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                        {attendanceRecords.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                              No attendance records found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default CourseAttendanceLedger;
