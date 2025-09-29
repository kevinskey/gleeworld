import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  AlertCircle
} from 'lucide-react';
import { useUserById } from '@/hooks/useUserById';
import { useStudentMidtermSubmission } from '@/hooks/useStudentMidtermSubmission';
import { useStudentAssignmentSubmissions } from '@/hooks/useStudentAssignmentSubmissions';
import { getInitials } from '@/utils/avatarUtils';

export const StudentWorkOverview = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUserById(studentId);
  const { data: midtermSubmission, isLoading: midtermLoading } = useStudentMidtermSubmission(studentId || '');
  const { data: assignmentSubmissions, isLoading: assignmentsLoading } = useStudentAssignmentSubmissions(studentId || '');

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
        return <Badge variant="default" className="bg-green-100 text-green-800">Submitted</Badge>;
      case 'graded':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Graded</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Pending</Badge>;
      default:
        return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/classes/mus240/instructor')}
            className="bg-white/70"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
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

        {/* Work Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Midterm Exam */}
          <Card className="border-0 bg-white/70 backdrop-blur-sm">
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
                      {midtermSubmission.grade ? `${midtermSubmission.grade}/85` : 'Not graded'}
                    </span>
                  </div>
                  <Button
                    onClick={() => navigate(`/classes/mus240/instructor/student/${studentId}/midterm`)}
                    className="w-full"
                    variant="outline"
                  >
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Grade Midterm
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No midterm submission found</p>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/classes/mus240/instructor/student/${studentId}/midterm`)}
                  >
                    View Midterm Details
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignments Summary */}
          <Card className="border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Assignment Submissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignmentSubmissions && assignmentSubmissions.length > 0 ? (
                <div className="space-y-3">
                  {assignmentSubmissions.slice(0, 3).map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg border bg-white/50">
                      <div>
                        <h4 className="font-medium text-sm">{assignment.file_name || `Assignment ${assignment.assignment_id}`}</h4>
                        <p className="text-xs text-gray-600">
                          Submitted: {new Date(assignment.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      {getStatusBadge(assignment.status)}
                    </div>
                  ))}
                  {assignmentSubmissions.length > 3 && (
                    <Button variant="outline" className="w-full mt-4">
                      View All {assignmentSubmissions.length} Assignments
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No assignments submitted yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="border-0 bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No recent activity to display</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};