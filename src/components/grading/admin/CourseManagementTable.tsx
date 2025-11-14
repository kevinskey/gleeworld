import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, UserPlus, Eye, Calendar, User, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AssignInstructorDialog } from './AssignInstructorDialog';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const CourseManagementTable: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<any>(null);

  const { data: courses, isLoading } = useQuery({
    queryKey: ['gw-all-courses'],
    queryFn: async () => {
      // Fetch all courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('gw_courses' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;

      // Fetch instructor names
      const instructorIds = [...new Set((coursesData as any[])?.map((c: any) => c.created_by).filter(Boolean) || [])];
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .in('user_id', instructorIds);

      const profileMap = (profiles || []).reduce((acc: any, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {});

      // Fetch assignment counts for each course
      const { data: assignments } = await supabase
        .from('gw_assignments' as any)
        .select('course_id');

      const assignmentCounts = ((assignments as any[]) || []).reduce((acc: any, a: any) => {
        acc[a.course_id] = (acc[a.course_id] || 0) + 1;
        return acc;
      }, {});

      return ((coursesData as any[]) || []).map((course: any) => ({
        ...course,
        instructor_name: profileMap[course.created_by]?.full_name || profileMap[course.created_by]?.email,
        assignment_count: assignmentCounts[course.id] || 0,
      }));
    },
  });

  const handleAssignInstructor = (course: any) => {
    setSelectedCourse(course);
    setAssignDialogOpen(true);
  };

  const handleDeleteClick = (course: any) => {
    setCourseToDelete(course);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return;

    try {
      // Delete the course (cascade will handle related records if configured)
      const { error } = await supabase
        .from('gw_courses' as any)
        .delete()
        .eq('id', courseToDelete.id);

      if (error) throw error;

      toast.success(`Course ${courseToDelete.code} deleted successfully`);
      queryClient.invalidateQueries({ queryKey: ['gw-all-courses'] });
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    }
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading courses...</div>;
  }

  return (
    <>
      <div className="grid gap-4">
        {courses?.map((course) => (
          <Card key={course.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {course.code}
                  </CardTitle>
                  <CardDescription>{course.title}</CardDescription>
                </div>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {course.term || 'No term set'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Instructor: {course.instructor_name || 'Not assigned'}</span>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {course.assignment_count} assignment{course.assignment_count !== 1 ? 's' : ''}
              </div>

              {course.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {course.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/grading/instructor/course/${course.id}`)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Course
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAssignInstructor(course)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign Instructor
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteClick(course)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!courses || courses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No courses found. Create your first course to get started.</p>
          </CardContent>
        </Card>
      ) : null}

      {selectedCourse && (
        <AssignInstructorDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          courseId={selectedCourse.id}
          courseName={selectedCourse.code}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{courseToDelete?.code}</strong>?
              This will also delete all assignments and submissions associated with this course.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
