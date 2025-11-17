import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { AssignInstructorDialog } from './AssignInstructorDialog';
import { CourseCard } from './CourseCard';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [termFilter, setTermFilter] = useState<string>('all');

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

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
      const { error } = await supabase
        .from('gw_courses' as any)
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      toast.success('Course deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['gw-all-courses'] });
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    }
  };

  const filteredCourses = courses?.filter(course => {
    const matchesSearch = 
      course.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.instructor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.term?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTerm = termFilter === 'all' || 
      course.term?.toLowerCase().includes(termFilter.toLowerCase());
    
    return matchesSearch && matchesTerm;
  }) || [];

  if (isLoading) {
    return <div className="text-center p-8">Loading courses...</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex gap-4">
          <Input
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
          <Select value={termFilter} onValueChange={setTermFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              <SelectItem value="fall">Fall</SelectItem>
              <SelectItem value="spring">Spring</SelectItem>
              <SelectItem value="summer">Summer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map(course => (
            <CourseCard
              key={course.id}
              id={course.id}
              code={course.code}
              title={course.title}
              term={course.term}
              instructorName={course.instructor_name || 'Unassigned'}
              assignmentCount={course.assignment_count}
              status={course.status}
              onViewCourse={() => navigate(`/grading/instructor/course/${course.id}`)}
              onOpenGradebook={() => navigate(`/grading/instructor/course/${course.id}/gradebook`)}
              onManageStudents={() => navigate(`/grading/instructor/course/${course.id}/students`)}
              onDelete={() => handleDeleteCourse(course.id)}
            />
          ))}
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No courses found matching your filters.
          </div>
        )}
      </div>


      {selectedCourse && (
        <AssignInstructorDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          courseId={selectedCourse.id}
          courseName={selectedCourse.code}
        />
      )}
    </>
  );
};
