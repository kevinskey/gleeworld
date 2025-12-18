import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, ArrowRight, X, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ACADEMY_COURSES } from '@/config/academyCourses';
import { useCourseContext } from '@/contexts/CourseContext';
import { useCourseEnrollment } from '@/hooks/useCourseEnrollment';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const GleeAcademyDashboardCard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedCourseId, selectCourse, clearCourseSelection, isDefaultCourse } = useCourseContext();
  const activeCourses = ACADEMY_COURSES.filter(course => course.isActive);
  
  const [notEnrolledDialog, setNotEnrolledDialog] = React.useState<{
    open: boolean;
    courseCode: string;
    courseName: string;
    courseId: string;
  }>({ open: false, courseCode: '', courseName: '', courseId: '' });

  const handleCourseClick = async (course: typeof ACADEMY_COURSES[0]) => {
    if (!user) {
      toast.error('Please log in to access courses');
      return;
    }

    // MUS 070 (Glee Club) - always accessible to members, just clear selection
    if (course.id === 'a0000000-0000-0000-0000-000000000070') {
      clearCourseSelection();
      return;
    }

    // For other courses, we need to check enrollment
    // Set the course context - the components will handle showing appropriate content
    selectCourse(course.id);
    toast.success(`Switched to ${course.courseCode}`);
  };

  const handleRequestAccess = () => {
    // Navigate to the course page where they can request enrollment
    navigate(`/academy/${notEnrolledDialog.courseCode.toLowerCase().replace(' ', '-')}`);
    setNotEnrolledDialog({ open: false, courseCode: '', courseName: '', courseId: '' });
  };

  return (
    <div className="w-full">
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader className="pb-3 px-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-wide">GLEE ACADEMY</CardTitle>
                <p className="text-xs text-muted-foreground">Spring 2026 Courses</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isDefaultCourse && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCourseSelection}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3 mr-1" />
                  Exit Course View
                </Button>
              )}
              <button 
                onClick={() => navigate('/glee-academy')}
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                View All <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {activeCourses.map((course) => {
              const IconComponent = course.icon;
              const isSelected = selectedCourseId === course.id || 
                (isDefaultCourse && course.id === 'a0000000-0000-0000-0000-000000000070');
              
              return (
                <button
                  key={course.id}
                  onClick={() => handleCourseClick(course)}
                  className={`group flex flex-col items-center p-3 rounded-lg border transition-all duration-200 ${
                    isSelected 
                      ? 'bg-primary/20 border-primary ring-2 ring-primary/30' 
                      : 'bg-card hover:bg-primary/10 border-border hover:border-primary/30'
                  }`}
                >
                  <div className={`p-2 rounded-full mb-2 transition-colors ${
                    isSelected ? 'bg-primary/30' : 'bg-primary/10 group-hover:bg-primary/20'
                  }`}>
                    <IconComponent className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-center text-foreground">
                    {course.courseCode}
                  </span>
                  <span className="text-[10px] text-muted-foreground text-center line-clamp-1 mt-0.5">
                    {course.title}
                  </span>
                  {isSelected && (
                    <span className="text-[8px] text-primary font-medium mt-1">ACTIVE</span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Not Enrolled Dialog */}
      <Dialog open={notEnrolledDialog.open} onOpenChange={(open) => setNotEnrolledDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-500" />
              Course Access Required
            </DialogTitle>
            <DialogDescription>
              You are not currently enrolled in <strong>{notEnrolledDialog.courseCode} - {notEnrolledDialog.courseName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Would you like to view the course details and request enrollment?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setNotEnrolledDialog(prev => ({ ...prev, open: false }))}>
                Cancel
              </Button>
              <Button onClick={handleRequestAccess}>
                View Course Details
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
