import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Users, Search, GraduationCap, Edit3, Trash2, Filter, ArrowUpDown, SortAsc, SortDesc } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCourseTA } from '@/hooks/useCourseTA';
import { useUserRole } from '@/hooks/useUserRole';
import { ClasslistUploadDialog } from '@/components/academy/ClasslistUploadDialog';
import { useMus240SemesterSafe } from '@/contexts/Mus240SemesterContext';

interface Enrollment {
  id: string;
  student_profile_id: string | null;
  user_id: string | null;
  enrollment_status: string;
  enrolled_at: string;
  grade?: string;
  gw_student_profiles?: {
    full_name: string;
    email: string | null;
    student_id: string;
    academic_year: string;
  } | null;
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

export const EnrollmentManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isTA } = useCourseTA('MUS240');
  const { isAdmin } = useUserRole();
  const { currentSemester, availableSemesters } = useMus240SemesterSafe();

  // Defensive filtering: Radix SelectItem value cannot be an empty string
  const validSemesters = (availableSemesters || []).filter(
    (s) => typeof s.id === 'string' && s.id.trim() !== '',
  );
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);

  const validUsers = (availableUsers || []).filter(
    (u) => typeof u.user_id === 'string' && u.user_id.trim() !== '',
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('enrolled_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [courseId, setCourseId] = useState<string | null>(null);
  const { toast } = useToast();

  // Sync selectedSemester with context
  useEffect(() => {
    if (currentSemester && !selectedSemester) {
      setSelectedSemester(currentSemester);
    }
  }, [currentSemester, selectedSemester]);

  // Fetch the actual course UUID from the database
  useEffect(() => {
    const fetchCourseId = async () => {
      const { data } = await supabase
        .from('gw_courses')
        .select('id')
        .eq('course_code', 'MUS 240')
        .maybeSingle();
      if (data?.id) {
        setCourseId(data.id);
      }
    };
    fetchCourseId();
  }, []);

  useEffect(() => {
    if (courseId) {
      loadEnrollments();
    }
    loadAvailableUsers();
  }, [selectedSemester, courseId]);

  const loadEnrollments = async () => {
    if (!courseId) {
      setLoading(false);
      return;
    }
    
    try {
      // Query gw_course_enrollments for MUS 240 course
      const { data, error } = await supabase
        .from('gw_course_enrollments')
        .select(`
          id,
          student_profile_id,
          user_id,
          enrollment_status,
          enrolled_at,
          grade,
          gw_student_profiles!student_profile_id(
            full_name,
            email,
            student_id,
            academic_year
          )
        `)
        .eq('course_id', courseId)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;
      setEnrollments((data as any) || []);
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
          enrollment_status: 'enrolled'
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
          ? "Student is already enrolled in this semester" 
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

  const updateFinalGrade = async (enrollmentId: string, gradeValue: string) => {
    try {
      const { error } = await supabase
        .from('gw_course_enrollments')
        .update({ grade: gradeValue })
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
      // Search filter - check both gw_student_profiles and gw_profiles
      const studentName = enrollment.gw_student_profiles?.full_name || enrollment.gw_profiles?.full_name || '';
      const studentEmail = enrollment.gw_student_profiles?.email || enrollment.gw_profiles?.email || '';
      const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        studentEmail.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || enrollment.enrollment_status === statusFilter;
      
      // Grade filter
      const matchesGrade = gradeFilter === 'all' || 
        (gradeFilter === 'graded' && enrollment.grade) ||
        (gradeFilter === 'ungraded' && !enrollment.grade);
      
      return matchesSearch && matchesStatus && matchesGrade;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.gw_student_profiles?.full_name || a.gw_profiles?.full_name || '';
          bValue = b.gw_student_profiles?.full_name || b.gw_profiles?.full_name || '';
          break;
        case 'last_name':
          // Extract last name more reliably by trimming and splitting
          aValue = (a.gw_student_profiles?.full_name || a.gw_profiles?.full_name || '').trim().split(/\s+/).slice(-1)[0] || '';
          bValue = (b.gw_student_profiles?.full_name || b.gw_profiles?.full_name || '').trim().split(/\s+/).slice(-1)[0] || '';
          break;
        case 'email':
          aValue = a.gw_student_profiles?.email || a.gw_profiles?.email || '';
          bValue = b.gw_student_profiles?.email || b.gw_profiles?.email || '';
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

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header - stacked on mobile */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl md:text-2xl font-bold">Course Enrollment</h3>
          <p className="text-sm md:text-base text-muted-foreground">Manage student enrollments for MUS 240</p>
        </div>
        <div className="flex gap-2">
          {courseId && (
            <ClasslistUploadDialog 
              courses={[{ id: courseId, title: 'MUS 240', course_code: 'MUS 240' }]}
              selectedCourseId={courseId}
              onUploadComplete={loadEnrollments}
            />
          )}
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9">
                <UserPlus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Add Student</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enroll Student in MUS 240</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Student</label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {validUsers.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Semester</label>
                <Input value={selectedSemester} readOnly />
              </div>
              <Button onClick={addEnrollment} className="w-full">
                Enroll Student
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Search and filters - mobile responsive */}
      <div className="space-y-3">
        {/* Search + Semester - always visible */}
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
          </div>
          <Select value={selectedSemester} onValueChange={setSelectedSemester}>
            <SelectTrigger className="w-full sm:w-44 h-10">
              <SelectValue placeholder="Semester" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              {validSemesters.map((semester) => (
                <SelectItem key={semester.id} value={semester.id}>
                  <div className="flex items-center gap-2">
                    <span>{semester.label}</span>
                    {semester.isActive && (
                      <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Filters row - horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-9 text-sm">
                <SelectValue placeholder="Status" />
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
            <SelectTrigger className="w-28 h-9 text-sm flex-shrink-0">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="graded">Graded</SelectItem>
              <SelectItem value="ungraded">Ungraded</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-28 h-9 text-sm">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Full Name</SelectItem>
                <SelectItem value="last_name">Last Name</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="enrolled_at">Date</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="grade">Grade</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="h-9 px-2 flex-shrink-0"
          >
            {sortOrder === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Count */}
        <div className="text-sm text-muted-foreground">
          {filteredAndSortedEnrollments.length} of {enrollments.length} students
        </div>
      </div>

      {/* Student cards - mobile optimized */}
      <div className="grid gap-3 md:gap-4">
        {filteredAndSortedEnrollments.length === 0 ? (
          <Card>
            <CardContent className="p-6 md:p-8 text-center">
              <Users className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
              <h3 className="text-base md:text-lg font-semibold mb-2">No enrollments found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'No students match your search criteria.' : 'No students are enrolled in this semester.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedEnrollments.map((enrollment) => (
            <Card 
              key={enrollment.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/mus-240/instructor/student/${enrollment.student_profile_id || enrollment.user_id}`)}
            >
              <CardContent className="p-4 md:p-6">
                {/* Mobile layout: stacked */}
                <div className="flex flex-col gap-3 md:hidden">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-base truncate">
                        {enrollment.gw_student_profiles?.full_name || enrollment.gw_profiles?.full_name || 'Unknown Student'}
                      </h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {enrollment.gw_student_profiles?.email || enrollment.gw_profiles?.email}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 items-end flex-shrink-0">
                      <Badge variant={getStatusBadgeVariant(enrollment.enrollment_status)} className="text-xs">
                        {enrollment.enrollment_status}
                      </Badge>
                      {enrollment.grade && (
                        <Badge variant="outline" className="text-xs">
                          {enrollment.grade}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={enrollment.enrollment_status}
                      onValueChange={(value) => updateEnrollmentStatus(enrollment.id, value)}
                    >
                      <SelectTrigger className="flex-1 h-9 text-sm">
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
                      className="w-20 h-9 text-sm"
                    />
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeEnrollment(enrollment.id)}
                      className="h-9 w-9 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Desktop layout: horizontal */}
                <div className="hidden md:flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">
                        {enrollment.gw_student_profiles?.full_name || enrollment.gw_profiles?.full_name || 'Unknown Student'}
                      </h4>
                      <Badge variant={getStatusBadgeVariant(enrollment.enrollment_status)}>
                        {enrollment.enrollment_status}
                      </Badge>
                      {enrollment.grade && (
                        <Badge variant="outline">
                          Grade: {enrollment.grade}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {enrollment.gw_student_profiles?.email || enrollment.gw_profiles?.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                      placeholder="Final Grade"
                      value={enrollment.grade || ''}
                      onChange={(e) => updateFinalGrade(enrollment.id, e.target.value)}
                      className="w-24"
                    />
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeEnrollment(enrollment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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