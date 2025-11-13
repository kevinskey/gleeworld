import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, UserPlus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ManageStudentsViewProps {
  courseId: string;
}

interface Course {
  id: string;
  code: string;
  title: string;
  description?: string;
  term?: string;
}


interface EnrolledStudent {
  enrollment_id: string;
  student_id: string;
  full_name: string;
  email: string;
  enrollment_role: string;
  profile_role: string;
}

export const ManageStudentsView: React.FC<ManageStudentsViewProps> = ({ courseId }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [emailInput, setEmailInput] = useState('');

  // Fetch course details
  const { data: course, isLoading: courseLoading, error: courseError } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_courses' as any)
        .select('*')
        .eq('id', courseId)
        .single();
      
      if (error) throw error;
      return data as unknown as Course;
    }
  });

  // Fetch enrolled students
  const { data: students, isLoading: studentsLoading, error: studentsError } = useQuery({
    queryKey: ['enrolled-students', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_enrollments' as any)
        .select(`
          id,
          student_id,
          role,
          gw_profiles!gw_enrollments_student_id_fkey (
            full_name,
            email,
            role
          )
        `)
        .eq('course_id', courseId);
      
      if (error) throw error;

      return (data || []).map((enrollment: any) => ({
        enrollment_id: enrollment.id,
        student_id: enrollment.student_id,
        full_name: enrollment.gw_profiles?.full_name || 'Unknown',
        email: enrollment.gw_profiles?.email || 'No email',
        enrollment_role: enrollment.role || 'student',
        profile_role: enrollment.gw_profiles?.role || 'visitor'
      })) as EnrolledStudent[];
    }
  });

  // Add student mutation
  const addStudentMutation = useMutation({
    mutationFn: async (email: string) => {
      // 1. Look up user in gw_profiles by email
      const { data: profileData, error: profileError } = await supabase
        .from('gw_profiles')
        .select('id, user_id, email')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (profileError) throw new Error('Error looking up user');
      if (!profileData || !profileData.user_id) {
        throw new Error('No user with that email exists. Please ensure the user has registered first.');
      }

      const userId = profileData.user_id;

      // 2. Check if already enrolled
      const { data: existingEnrollment } = await supabase
        .from('gw_enrollments' as any)
        .select('id')
        .eq('course_id', courseId)
        .eq('student_id', userId)
        .maybeSingle();

      if (existingEnrollment) {
        throw new Error('Student is already enrolled in this course');
      }

      // 3. Create enrollment
      const { error: enrollError } = await (supabase
        .from('gw_enrollments' as any)
        .insert({
          course_id: courseId,
          student_id: userId,
          role: 'student'
        }) as any);

      if (enrollError) throw enrollError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrolled-students', courseId] });
      toast.success('Student added successfully');
      setEmailInput('');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add student');
    }
  });

  // Remove student mutation
  const removeStudentMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await (supabase
        .from('gw_enrollments' as any)
        .delete()
        .eq('id', enrollmentId) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrolled-students', courseId] });
      toast.success('Student removed from course');
    },
    onError: () => {
      toast.error('Failed to remove student');
    }
  });

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    addStudentMutation.mutate(emailInput);
  };

  if (courseLoading || studentsLoading) {
    return <LoadingSpinner size="lg" text="Loading students..." />;
  }

  if (courseError || studentsError) {
    return (
      <ErrorState
        message={courseError?.message || studentsError?.message || 'Failed to load data'}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/grading/instructor/course/${courseId}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Course
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">{course?.code}</h1>
        <p className="text-muted-foreground">{course?.title}</p>
      </div>

      {/* Add Student Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Student by Email
          </CardTitle>
          <CardDescription>
            Enter the student's email address to enroll them in this course
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddStudent} className="flex gap-2">
            <Input
              type="email"
              placeholder="student@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              disabled={addStudentMutation.isPending}
              className="flex-1"
            />
            <Button type="submit" disabled={addStudentMutation.isPending}>
              {addStudentMutation.isPending ? 'Adding...' : 'Add Student'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Enrolled Students ({students?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!students || students.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No students enrolled yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Enrollment Role</TableHead>
                  <TableHead>Profile Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.enrollment_id}>
                    <TableCell className="font-medium">{student.full_name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">
                        {student.enrollment_role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-muted text-muted-foreground rounded-md text-sm">
                        {student.profile_role}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStudentMutation.mutate(student.enrollment_id)}
                        disabled={removeStudentMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
