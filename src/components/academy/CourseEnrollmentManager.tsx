import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Users, Search, GraduationCap, Trash2, Filter, ArrowUpDown, SortAsc, SortDesc } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClasslistUploadDialog } from '@/components/academy/ClasslistUploadDialog';

interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  role: string;
  enrollment_status: string;
  enrolled_at: string;
  grade?: string;
  final_percentage?: number;
  credit_hours?: number;
  registration_status?: string;
  academic_level?: string;
  gw_profiles?: {
    full_name: string;
    email: string;
  } | null;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
}

interface CourseEnrollmentManagerProps {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  term?: string;
}

export const CourseEnrollmentManager: React.FC<CourseEnrollmentManagerProps> = ({
  courseId,
  courseCode,
  courseTitle,
  term
}) => {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('enrolled_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  useEffect(() => {
    if (courseId) {
      loadEnrollments();
      loadAvailableUsers();
    }
  }, [courseId]);

  const loadEnrollments = async () => {
    try {
      setLoading(true);
      
      // First get enrollments
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('gw_course_enrollments')
        .select('*')
        .eq('course_id', courseId)
        .order('enrolled_at', { ascending: false });

      if (enrollmentError) throw enrollmentError;
      
      if (!enrollmentData || enrollmentData.length === 0) {
        setEnrollments([]);
        return;
      }

      // Get unique user IDs and fetch their profiles
      const userIds = [...new Set(enrollmentData.map(e => e.user_id))];
      const { data: profileData, error: profileError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      if (profileError) throw profileError;

      // Create a lookup map for profiles
      const profileMap = new Map(
        (profileData || []).map(p => [p.user_id, { full_name: p.full_name, email: p.email }])
      );

      // Merge enrollment data with profile data
      const mergedData = enrollmentData.map(enrollment => ({
        ...enrollment,
        gw_profiles: profileMap.get(enrollment.user_id) || { full_name: null, email: null }
      }));

      setEnrollments(mergedData as any);
    } catch (error) {
      console.error('Error loading enrollments:', error);
      toast({
        title: "Error",
        description: "Failed to load enrollments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const addEnrollment = async () => {
    if (!selectedUser || !courseId) return;

    try {
      const { error } = await supabase
        .from('gw_course_enrollments')
        .insert({
          user_id: selectedUser,
          course_id: courseId,
          role: 'student',
          enrollment_status: 'enrolled',
          enrolled_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Student enrolled successfully"
      });

      setShowAddDialog(false);
      setSelectedUser('');
      loadEnrollments();
    } catch (error: any) {
      console.error('Error adding enrollment:', error);
      toast({
        title: "Error",
        description: error.message?.includes('duplicate') 
          ? "Student is already enrolled in this course" 
          : "Failed to enroll student",
        variant: "destructive"
      });
    }
  };

  const updateEnrollmentStatus = async (enrollmentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('gw_course_enrollments')
        .update({ enrollment_status: status })
        .eq('id', enrollmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Enrollment status updated"
      });

      loadEnrollments();
    } catch (error) {
      console.error('Error updating enrollment:', error);
      toast({
        title: "Error",
        description: "Failed to update enrollment status",
        variant: "destructive"
      });
    }
  };

  const updateFinalGrade = async (enrollmentId: string, grade: string) => {
    try {
      const { error } = await supabase
        .from('gw_course_enrollments')
        .update({ grade })
        .eq('id', enrollmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Final grade updated"
      });

      loadEnrollments();
    } catch (error) {
      console.error('Error updating grade:', error);
      toast({
        title: "Error",
        description: "Failed to update final grade",
        variant: "destructive"
      });
    }
  };

  const removeEnrollment = async (enrollmentId: string) => {
    if (!confirm('Are you sure you want to remove this enrollment?')) return;

    try {
      const { error } = await supabase
        .from('gw_course_enrollments')
        .delete()
        .eq('id', enrollmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Enrollment removed"
      });

      loadEnrollments();
    } catch (error) {
      console.error('Error removing enrollment:', error);
      toast({
        title: "Error",
        description: "Failed to remove enrollment",
        variant: "destructive"
      });
    }
  };

  const filteredAndSortedEnrollments = enrollments
    .filter(enrollment => {
      const matchesSearch = enrollment.gw_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enrollment.gw_profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || enrollment.enrollment_status === statusFilter;
      
      const matchesGrade = gradeFilter === 'all' || 
        (gradeFilter === 'graded' && enrollment.grade) ||
        (gradeFilter === 'ungraded' && !enrollment.grade);
      
      return matchesSearch && matchesStatus && matchesGrade;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.gw_profiles?.full_name || '';
          bValue = b.gw_profiles?.full_name || '';
          break;
        case 'last_name':
          aValue = (a.gw_profiles?.full_name || '').trim().split(/\s+/).slice(-1)[0] || '';
          bValue = (b.gw_profiles?.full_name || '').trim().split(/\s+/).slice(-1)[0] || '';
          break;
        case 'email':
          aValue = a.gw_profiles?.email || '';
          bValue = b.gw_profiles?.email || '';
          break;
        case 'status':
          aValue = a.enrollment_status;
          bValue = b.enrollment_status;
          break;
        case 'grade':
          aValue = a.grade || '';
          bValue = b.grade || '';
          break;
        case 'enrolled_at':
        default:
          aValue = new Date(a.enrolled_at);
          bValue = new Date(b.enrolled_at);
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'enrolled': return 'default';
      case 'completed': return 'secondary';
      case 'dropped': return 'destructive';
      case 'withdrawn': return 'outline';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <GraduationCap className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading enrollments...</p>
        </div>
      </div>
    );
  }

  const courseSlug = courseCode.toLowerCase().replace(' ', '-');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-2xl font-bold">Course Enrollment Management</h3>
          <p className="text-muted-foreground">
            Manage student enrollments for {courseCode} {term ? `(${term})` : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ClasslistUploadDialog 
            courses={[{ id: courseId, title: courseTitle, course_code: courseCode }]}
            selectedCourseId={courseId}
            onUploadComplete={loadEnrollments}
          />
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enroll Student in {courseCode}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Student</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.full_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addEnrollment} className="w-full">
                  Enroll Student
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="enrolled">Enrolled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="dropped">Dropped</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              <SelectItem value="graded">Graded</SelectItem>
              <SelectItem value="ungraded">Ungraded</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Full Name</SelectItem>
                <SelectItem value="last_name">Last Name</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="enrolled_at">Enrollment Date</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="grade">Grade</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1"
          >
            {sortOrder === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
            {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          </Button>
          
          <div className="ml-auto text-sm text-muted-foreground">
            {filteredAndSortedEnrollments.length} of {enrollments.length} students
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredAndSortedEnrollments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No enrollments found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'No students match your search criteria.' : 'No students are enrolled in this course yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedEnrollments.map((enrollment) => (
            <Card 
              key={enrollment.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/${courseSlug}/instructor/student/${enrollment.user_id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h4 className="font-semibold">
                        {enrollment.gw_profiles?.full_name || 'Unknown Student'}
                      </h4>
                      <Badge variant={getStatusBadgeVariant(enrollment.enrollment_status)}>
                        {enrollment.enrollment_status}
                      </Badge>
                      {enrollment.grade && (
                        <Badge variant="outline">
                          Grade: {enrollment.grade}
                        </Badge>
                      )}
                      {enrollment.academic_level && (
                        <Badge variant="secondary">
                          {enrollment.academic_level}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {enrollment.gw_profiles?.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={enrollment.enrollment_status}
                      onValueChange={(value) => updateEnrollmentStatus(enrollment.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enrolled">Enrolled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="dropped">Dropped</SelectItem>
                        <SelectItem value="withdrawn">Withdrawn</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Input
                      placeholder="Grade"
                      value={enrollment.grade || ''}
                      onChange={(e) => updateFinalGrade(enrollment.id, e.target.value)}
                      className="w-20"
                    />
                    
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeEnrollment(enrollment.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default CourseEnrollmentManager;
