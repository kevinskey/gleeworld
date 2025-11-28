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

interface Enrollment {
  id: string;
  student_id: string;
  semester: string;
  enrollment_status: string;
  enrolled_at: string;
  final_grade?: string;
  instructor_notes?: string;
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
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('Fall 2025');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('enrolled_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  useEffect(() => {
    loadEnrollments();
    loadAvailableUsers();
  }, [selectedSemester]);

  const loadEnrollments = async () => {
    try {
      const { data, error } = await supabase
        .from('mus240_enrollments')
        .select(`
          *,
          gw_profiles!student_id(
            full_name,
            email
          )
        `)
        .eq('semester', selectedSemester)
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
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('mus240_enrollments')
        .insert({
          student_id: selectedUser,
          semester: selectedSemester,
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
        .from('mus240_enrollments')
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
        .from('mus240_enrollments')
        .update({ final_grade: grade })
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
        .from('mus240_enrollments')
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
      // Search filter
      const matchesSearch = enrollment.gw_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enrollment.gw_profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || enrollment.enrollment_status === statusFilter;
      
      // Grade filter
      const matchesGrade = gradeFilter === 'all' || 
        (gradeFilter === 'graded' && enrollment.final_grade) ||
        (gradeFilter === 'ungraded' && !enrollment.final_grade);
      
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
          // Extract last name more reliably by trimming and splitting
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
          aValue = a.final_grade || '';
          bValue = b.final_grade || '';
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Course Enrollment Management</h3>
          <p className="text-muted-foreground">Manage student enrollments for MUS 240</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Student
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
                    {availableUsers.map((user) => (
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

      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
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
          <Select value={selectedSemester} onValueChange={setSelectedSemester}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Fall 2025">Fall 2025</SelectItem>
              <SelectItem value="Spring 2025">Spring 2025</SelectItem>
              <SelectItem value="Fall 2025">Fall 2025</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-4 items-center">
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
                {searchTerm ? 'No students match your search criteria.' : 'No students are enrolled in this semester.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedEnrollments.map((enrollment) => (
            <Card 
              key={enrollment.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/mus-240/instructor/student/${enrollment.student_id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">
                        {enrollment.gw_profiles?.full_name || 'Unknown Student'}
                      </h4>
                      <Badge variant={getStatusBadgeVariant(enrollment.enrollment_status)}>
                        {enrollment.enrollment_status}
                      </Badge>
                      {enrollment.final_grade && (
                        <Badge variant="outline">
                          Grade: {enrollment.final_grade}
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
                      value={enrollment.final_grade || ''}
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