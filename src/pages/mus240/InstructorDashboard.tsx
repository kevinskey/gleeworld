import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  Users, 
  BookOpen, 
  ClipboardCheck, 
  Brain, 
  ChevronRight,
  GraduationCap,
  MessageSquare,
  FileText,
  Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMus240Enrollments } from '@/hooks/useMus240Enrollments';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { useCourseTA } from '@/hooks/useCourseTA';

export const InstructorDashboard = () => {
  const { isAdmin, loading } = useUserRole();
  const { isTA, loading: taLoading } = useCourseTA('MUS240');
  const { enrollments, loading: enrollmentsLoading } = useMus240Enrollments();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  if (loading || taLoading || enrollmentsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Allow both admins and TAs to access
  if (!isAdmin() && !isTA) {
    return <Navigate to="/classes/mus240" replace />;
  }

  const activeStudents = enrollments.filter(e => 
    e.enrollment_status === 'enrolled' && 
    e.gw_profiles?.role === 'student'
  );
  
  const filteredStudents = activeStudents.filter(student => {
    const matchesSearch = searchTerm === "" || 
      (student.gw_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       student.gw_profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const quickActions = [
    {
      title: 'Create Assignment',
      description: 'Add new assignments for students',
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      action: () => navigate('/classes/mus240/instructor/assignments')
    },
    {
      title: 'View Journals',
      description: 'Review student journal entries',
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      action: () => navigate('/classes/mus240/instructor/journals')
    },
    {
      title: 'Bulk Grade Journals',
      description: 'AI-powered bulk journal grading',
      icon: ClipboardCheck,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      action: () => navigate('/classes/mus240/instructor/bulk-grading')
    },
    {
      title: 'AI Assistant',
      description: 'Get help with course content',
      icon: Brain,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      action: () => navigate('/classes/mus240/instructor/ai-assistant')
    },
    {
      title: 'Grade Calculator',
      description: 'Calculate final grades',
      icon: Star,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      action: () => navigate('/classes/mus240/instructor/grade-calculation')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            MUS 240 Instructor Dashboard
          </h1>
          <p className="text-gray-600">
            Survey of African American Music - Dr. Kevin Phillip Johnson
          </p>
          <div className="flex items-center gap-4 mt-4">
            <Badge variant="secondary" className="bg-white/70">
              <GraduationCap className="h-4 w-4 mr-1" />
              {activeStudents.length} Students Enrolled
            </Badge>
            <Badge variant="outline" className="bg-white/70">
              <Brain className="h-4 w-4 mr-1" />
              AI-Enhanced Teaching
            </Badge>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {quickActions.map((action, index) => (
            <Card 
              key={index}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 border-0 bg-white/70 backdrop-blur-sm"
              onClick={action.action}
            >
              <CardContent className="p-6">
                <div className={`rounded-lg w-12 h-12 ${action.bgColor} flex items-center justify-center mb-4`}>
                  <action.icon className={`h-6 w-6 ${action.color}`} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Students Section */}
        <Card className="border-0 bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Student Management
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/classes/mus240/instructor/students')}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Messages
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/50"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {filteredStudents.map((student) => (
                <div 
                  key={student.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-white/50 hover:bg-white/70 transition-colors cursor-pointer"
                  onClick={() => navigate(`/classes/mus240/instructor/student/${student.student_id}`)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src="" />
                      <AvatarFallback>
                        {student.gw_profiles?.full_name?.split(' ').map(n => n[0]).join('') || 'ST'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium hover:text-blue-600 transition-colors">
                        {student.gw_profiles?.full_name || 'Name not provided'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {student.gw_profiles?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
            {filteredStudents.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No students found matching your search.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};