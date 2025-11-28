import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft,
  ClipboardCheck,
  FileText,
  Calendar,
  User,
  GraduationCap,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Award,
  ExternalLink
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useUserById } from '@/hooks/useUserById';
import { useStudentMidtermSubmission } from '@/hooks/useStudentMidtermSubmission';
import { useStudentAssignmentSubmissions } from '@/hooks/useStudentAssignmentSubmissions';
import { getInitials } from '@/utils/avatarUtils';
import { supabase } from '@/integrations/supabase/client';
import { convertToSecureUrl } from '@/utils/secureFileAccess';
import { StudentGradeSummary } from '@/components/mus240/instructor/StudentGradeSummary';

export const StudentWorkOverview = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUserById(studentId);
  const { data: midtermSubmission, isLoading: midtermLoading } = useStudentMidtermSubmission(studentId || '');
  const { data: assignmentSubmissions, isLoading: assignmentsLoading } = useStudentAssignmentSubmissions(studentId || '');
  const [students, setStudents] = useState<Array<{ user_id: string; full_name: string; email: string }>>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<'midterm' | string | null>(null);

  useEffect(() => {
    const fetchEnrolledStudents = async () => {
      try {
        const { data, error } = await supabase
          .from('mus240_enrollments')
          .select(`
            student_id,
            gw_profiles!inner(user_id, full_name, email)
          `)
          .eq('semester', 'Fall 2025')
          .eq('enrollment_status', 'enrolled')
          .order('gw_profiles(full_name)');

        if (error) throw error;

        const formattedStudents = data?.map(enrollment => ({
          user_id: enrollment.student_id,
          full_name: enrollment.gw_profiles.full_name,
          email: enrollment.gw_profiles.email
        })) || [];

        setStudents(formattedStudents);
      } catch (error) {
        console.error('Error fetching enrolled students:', error);
      } finally {
        setStudentsLoading(false);
      }
    };

    fetchEnrolledStudents();
  }, []);

  const isLoading = userLoading || midtermLoading || assignmentsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-lg">Loading student information...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-lg text-red-600">Student not found</div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="default" className="bg-emerald-50 text-emerald-700 border-emerald-200">Submitted</Badge>;
      case 'graded':
        return <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">Graded</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-warning/50 text-warning bg-warning/5">Pending</Badge>;
      default:
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Not Started</Badge>;
    }
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-emerald-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGradeBgColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-emerald-50 border-emerald-200';
    if (percentage >= 80) return 'bg-blue-50 border-blue-200';
    if (percentage >= 70) return 'bg-yellow-50 border-yellow-200';
    if (percentage >= 60) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  const renderDetailView = () => {
    if (!selectedItem) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Select an assignment to view details</p>
          </div>
        </div>
      );
    }

    if (selectedItem === 'midterm') {
      return (
        <Card className="border-0 bg-white/70 backdrop-blur-sm h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
              Midterm Examination
            </CardTitle>
          </CardHeader>
          <CardContent>
            {midtermSubmission ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  {getStatusBadge(midtermSubmission.is_submitted ? 'submitted' : 'pending')}
                </div>
                {midtermSubmission.submitted_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Submitted:</span>
                    <span className="text-sm">
                      {new Date(midtermSubmission.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Grade:</span>
                  <span className="text-sm font-medium">
                    {midtermSubmission.grade ? `${midtermSubmission.grade}/90` : 'Not graded'}
                  </span>
                </div>
                <Button
                  onClick={() => navigate(`/mus-240/instructor/student/${studentId}/midterm`)}
                  className="w-full"
                >
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Grade Midterm
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No midterm submission found</p>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    const assignment = assignmentSubmissions?.find(a => a.id === selectedItem);
    if (!assignment) return null;

    return (
      <Card className="border-0 bg-white/70 backdrop-blur-sm h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            {assignment.file_name || `Assignment ${assignment.assignment_id}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              {getStatusBadge(assignment.status)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Submitted:</span>
              <span className="text-sm">
                {new Date(assignment.submitted_at).toLocaleDateString()}
              </span>
            </div>
            {assignment.grade !== null && assignment.grade !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Grade:</span>
                <span className="text-sm font-medium">
                  {assignment.grade}/100
                </span>
              </div>
            )}
            {assignment.feedback && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Feedback:</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {assignment.feedback}
                </p>
              </div>
            )}
            {assignment.file_url && (
              <Button
                onClick={async () => {
                  const secureUrl = await convertToSecureUrl(assignment.file_url!);
                  if (secureUrl) {
                    window.open(secureUrl, '_blank');
                  }
                }}
                className="w-full"
                variant="outline"
              >
                View Submission
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/mus-240/instructor/console')}
            className="bg-white/70"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Instructor Console
          </Button>

          {/* Student Selector */}
          <div className="flex-1 max-w-md">
            <Select
              value={studentId}
              onValueChange={(newStudentId) => navigate(`/mus-240/instructor/student/${newStudentId}`)}
              disabled={studentsLoading}
            >
              <SelectTrigger className="bg-white border-gray-200 shadow-sm z-50">
                <SelectValue placeholder="Select a student..." />
              </SelectTrigger>
              <SelectContent className="bg-white z-[100]">
                {students.map((student) => (
                  <SelectItem key={student.user_id} value={student.user_id}>
                    {student.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={() => window.open(`/mus-240/student-dashboard`, '_blank')}
            className="bg-primary"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Student Dashboard
          </Button>
        </div>

        {/* Student Info Card */}
        <Card className="border-0 bg-white/70 backdrop-blur-sm mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.avatar_url || ""} />
                <AvatarFallback className="text-xl">
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {user.full_name || 'Name not provided'}
                </h1>
                <p className="text-gray-600 mb-2">{user.email}</p>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="bg-white/70">
                    <User className="h-4 w-4 mr-1" />
                    Student
                  </Badge>
                  <Badge variant="outline" className="bg-white/70">
                    <GraduationCap className="h-4 w-4 mr-1" />
                    MUS 240
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Main Content - Tabbed Layout */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-card/70 backdrop-blur-sm">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Grade Summary
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Assignments
            </TabsTrigger>
          </TabsList>

          {/* Grade Summary Tab */}
          <TabsContent value="overview">
            <StudentGradeSummary studentId={studentId || ''} />
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Assignments List */}
              <div className="lg:col-span-1">
                <Card className="border-0 bg-card/70 backdrop-blur-sm sticky top-6 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      Assignments & Grades
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[600px] overflow-y-auto">
                      {/* Midterm Item */}
                      <button
                        onClick={() => setSelectedItem('midterm')}
                        className={`w-full text-left p-4 border-b border-border hover:bg-accent/50 transition-all duration-200 ${
                          selectedItem === 'midterm' ? 'bg-accent border-l-4 border-l-primary shadow-sm' : 'border-l-4 border-l-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-0.5">
                              <ClipboardCheck className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <span className="font-semibold text-sm text-foreground block mb-1">
                                Midterm Examination
                              </span>
                              {midtermSubmission?.submitted_at && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                                  <Clock className="h-3 w-3" />
                                  {new Date(midtermSubmission.submitted_at).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                {getStatusBadge(midtermSubmission?.is_submitted ? 'graded' : 'pending')}
                              </div>
                            </div>
                          </div>
                          {midtermSubmission?.grade && (
                            <div className={`text-right ml-2 px-3 py-1.5 rounded-lg border ${getGradeBgColor((midtermSubmission.grade / 90) * 100)}`}>
                              <div className={`text-xl font-bold ${getGradeColor((midtermSubmission.grade / 90) * 100)}`}>
                                {midtermSubmission.grade}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                / 90
                              </div>
                            </div>
                          )}
                        </div>
                        {midtermSubmission?.grade && (
                          <Progress 
                            value={(midtermSubmission.grade / 90) * 100} 
                            className="h-1.5"
                          />
                        )}
                      </button>

                      {/* Assignment Items */}
                      {assignmentSubmissions && assignmentSubmissions.length > 0 ? (
                        assignmentSubmissions.map((assignment) => {
                          const percentage = assignment.grade !== null && assignment.grade !== undefined 
                            ? assignment.grade 
                            : 0;
                          const hasGrade = assignment.grade !== null && assignment.grade !== undefined;
                          
                          return (
                            <button
                              key={assignment.id}
                              onClick={() => setSelectedItem(assignment.id)}
                              className={`w-full text-left p-4 border-b border-border hover:bg-accent/50 transition-all duration-200 ${
                                selectedItem === assignment.id ? 'bg-accent border-l-4 border-l-primary shadow-sm' : 'border-l-4 border-l-transparent'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className="mt-0.5">
                                    {hasGrade ? (
                                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                                    ) : (
                                      <FileText className="h-5 w-5 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <span className="font-medium text-sm text-foreground block mb-1 line-clamp-2">
                                      {assignment.file_name || `Assignment ${assignment.assignment_id}`}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                                      <Clock className="h-3 w-3" />
                                      {new Date(assignment.submitted_at).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric' 
                                      })}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {getStatusBadge(assignment.status)}
                                    </div>
                                  </div>
                                </div>
                                {hasGrade && (
                                  <div className={`text-right ml-2 px-3 py-1.5 rounded-lg border ${getGradeBgColor(percentage)}`}>
                                    <div className={`text-xl font-bold ${getGradeColor(percentage)}`}>
                                      {assignment.grade}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      / 100
                                    </div>
                                  </div>
                                )}
                              </div>
                              {hasGrade && (
                                <Progress 
                                  value={percentage} 
                                  className="h-1.5"
                                />
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center">
                          <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-muted-foreground text-sm">No assignments submitted</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Detail View */}
              <div className="lg:col-span-2">
                {renderDetailView()}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};