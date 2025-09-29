import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  BookOpen, 
  BarChart3, 
  MessageSquare, 
  Search, 
  GraduationCap,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  FileText,
  User,
  ArrowLeft,
  Home,
  ChevronRight
} from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useMus240Enrollments } from '@/hooks/useMus240Enrollments';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { StudentRecordView } from './StudentRecordView';
import { StudentCommunications } from './StudentCommunications';
import { GradingInterface } from './GradingInterface';
import { EnrollmentManager } from '../admin/EnrollmentManager';

interface StudentRecord {
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  enrollment_status: string;
  enrolled_at: string;
  final_grade?: string;
}

interface DashboardStats {
  totalStudents: number;
  activeAssignments: number;
  pendingGrades: number;
  recentSubmissions: number;
  averageGrade: number;
}

export const ComprehensiveInstructorDashboard: React.FC = () => {
  const { isAdmin, loading } = useUserRole();
  const { enrollments, loading: enrollmentsLoading } = useMus240Enrollments();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeAssignments: 0,
    pendingGrades: 0,
    recentSubmissions: 0,
    averageGrade: 0
  });
  const [loading_stats, setLoadingStats] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoadingStats(true);
      
      // Get total students
      const { data: studentsData } = await supabase
        .from('mus240_enrollments')
        .select('student_id')
        .eq('semester', 'Fall 2025')
        .eq('enrollment_status', 'enrolled');

      // Get pending assignments
      const { data: assignmentsData } = await supabase
        .from('assignment_submissions')
        .select('id, grade')
        .is('grade', null);

      // Get recent submissions (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: recentData } = await supabase
        .from('assignment_submissions')
        .select('id')
        .gte('submission_date', weekAgo.toISOString());

      // Get graded assignments for average
      const { data: gradedData } = await supabase
        .from('assignment_submissions')
        .select('grade')
        .not('grade', 'is', null);

      const averageGrade = gradedData?.length > 0 
        ? gradedData.reduce((sum, item) => sum + (item.grade || 0), 0) / gradedData.length 
        : 0;

      setStats({
        totalStudents: studentsData?.length || 0,
        activeAssignments: 5, // This would come from assignments table
        pendingGrades: assignmentsData?.length || 0,
        recentSubmissions: recentData?.length || 0,
        averageGrade: Math.round(averageGrade)
      });

    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading || enrollmentsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin()) {
    return <Navigate to="/classes/mus240" replace />;
  }

  // Convert enrollments to student records format
  const studentRecords: StudentRecord[] = enrollments.map(enrollment => ({
    user_id: enrollment.student_id,
    full_name: enrollment.gw_profiles?.full_name || 'Unknown',
    email: enrollment.gw_profiles?.email || '',
    phone: enrollment.gw_profiles?.phone,
    enrollment_status: enrollment.enrollment_status,
    enrolled_at: enrollment.enrolled_at,
    final_grade: enrollment.final_grade
  }));

  // Filter students based on search
  const filteredStudents = studentRecords.filter(student =>
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStudentSelect = (student: StudentRecord) => {
    setSelectedStudent(student);
    setActiveTab('student-record');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/classes/mus240')}
              className="p-2 hover:bg-gray-100"
            >
              <Home className="h-4 w-4" />
            </Button>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-400">MUS 240</span>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-gray-900">Instructor Dashboard</span>
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => navigate('/classes/mus240')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Course
          </Button>
        </div>

        {/* Main Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            MUS 240 Instructor Dashboard
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Survey of African American Music - Dr. Kevin Phillip Johnson
          </p>
          <Badge variant="secondary" className="flex items-center gap-2 w-fit">
            <GraduationCap className="h-4 w-4" />
            Comprehensive Teaching Platform
          </Badge>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {loading_stats ? '...' : stats.totalStudents}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Assignments</p>
                  <p className="text-2xl font-bold text-green-600">
                    {loading_stats ? '...' : stats.activeAssignments}
                  </p>
                </div>
                <BookOpen className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Grades</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {loading_stats ? '...' : stats.pendingGrades}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Recent Submissions</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {loading_stats ? '...' : stats.recentSubmissions}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Class Average</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {loading_stats ? '...' : stats.averageGrade ? `${stats.averageGrade}%` : 'N/A'}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Students
            </TabsTrigger>
            <TabsTrigger value="grading" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Grading
            </TabsTrigger>
            <TabsTrigger value="communications" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Communications
            </TabsTrigger>
            <TabsTrigger value="student-record" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Student Record
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <Button 
                    onClick={() => setActiveTab('grading')}
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <BookOpen className="h-6 w-6 mb-2" />
                    Grade Assignments
                  </Button>
                  <Button 
                    onClick={() => setActiveTab('communications')}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <MessageSquare className="h-6 w-6 mb-2" />
                    Message Students
                  </Button>
                  <Button 
                    onClick={() => setActiveTab('students')}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <Users className="h-6 w-6 mb-2" />
                    Manage Students
                  </Button>
                  <Button 
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <FileText className="h-6 w-6 mb-2" />
                    View Reports
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm">5 assignments graded today</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      <span className="text-sm">{stats.pendingGrades} assignments pending review</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      <span className="text-sm">{stats.recentSubmissions} new submissions this week</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Student Overview List */}
            <Card>
              <CardHeader>
                <CardTitle>Student Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredStudents.slice(0, 10).map((student) => (
                    <div 
                      key={student.user_id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleStudentSelect(student)}
                    >
                      <div>
                        <p className="font-medium">{student.full_name}</p>
                        <p className="text-sm text-gray-600">{student.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={student.enrollment_status === 'enrolled' ? 'default' : 'secondary'}>
                          {student.enrollment_status}
                        </Badge>
                        {student.final_grade && (
                          <Badge variant="outline">{student.final_grade}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <div className="space-y-6">
              {/* Student Search */}
              <Card>
                <CardHeader>
                  <CardTitle>Student Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={() => setActiveTab('student-record')}>
                      View Selected Student
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {filteredStudents.map((student) => (
                        <div 
                          key={student.user_id}
                          className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer ${
                            selectedStudent?.user_id === student.user_id ? 'bg-blue-50 border-blue-200' : ''
                          }`}
                          onClick={() => setSelectedStudent(student)}
                        >
                          <div>
                            <p className="font-medium">{student.full_name}</p>
                            <p className="text-sm text-gray-600">{student.email}</p>
                            <p className="text-xs text-gray-500">
                              Enrolled: {new Date(student.enrolled_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={student.enrollment_status === 'enrolled' ? 'default' : 'secondary'}>
                              {student.enrollment_status}
                            </Badge>
                            {student.final_grade && (
                              <Badge variant="outline">{student.final_grade}</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Enrollment Management */}
              <EnrollmentManager />
            </div>
          </TabsContent>

          <TabsContent value="grading">
            <GradingInterface />
          </TabsContent>

          <TabsContent value="communications">
            <StudentCommunications />
          </TabsContent>

          <TabsContent value="student-record">
            <StudentRecordView 
              selectedStudent={selectedStudent}
              onClose={() => setActiveTab('students')}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};