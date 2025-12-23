import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GraduationCap, ArrowRight, X, Lock, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ACADEMY_COURSES } from '@/config/academyCourses';
import { useCourseContext } from '@/contexts/CourseContext';
import { useCourseEnrollment } from '@/hooks/useCourseEnrollment';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
export const GleeAcademyDashboardCard = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    selectedCourseId,
    selectCourse,
    clearCourseSelection,
    isDefaultCourse
  } = useCourseContext();
  const activeCourses = ACADEMY_COURSES.filter(course => course.isActive);
  const [isOpen, setIsOpen] = useState(true);
  const [notEnrolledDialog, setNotEnrolledDialog] = React.useState<{
    open: boolean;
    courseCode: string;
    courseName: string;
    courseId: string;
  }>({
    open: false,
    courseCode: '',
    courseName: '',
    courseId: ''
  });
  const [courseDialog, setCourseDialog] = React.useState<{
    open: boolean;
    course: typeof ACADEMY_COURSES[0] | null;
  }>({
    open: false,
    course: null
  });
  const handleCourseClick = async (course: typeof ACADEMY_COURSES[0]) => {
    if (!user) {
      toast.error('Please log in to access courses');
      return;
    }

    // Open the course dialog
    setCourseDialog({
      open: true,
      course
    });
  };
  const handleEnterCourse = () => {
    if (!courseDialog.course) return;
    const course = courseDialog.course;

    // MUS 070 (Glee Club) - always accessible to members, just clear selection
    if (course.id === 'a0000000-0000-0000-0000-000000000070') {
      clearCourseSelection();
    } else {
      // For other courses, set the course context
      selectCourse(course.id);
      toast.success(`Switched to ${course.courseCode}`);
    }
    setCourseDialog({
      open: false,
      course: null
    });
  };
  const handleViewCoursePage = () => {
    if (!courseDialog.course) return;
    navigate(courseDialog.course.route);
    setCourseDialog({
      open: false,
      course: null
    });
  };
  const handleRequestAccess = () => {
    // Navigate to the course page where they can request enrollment
    navigate(`/academy/${notEnrolledDialog.courseCode.toLowerCase().replace(' ', '-')}`);
    setNotEnrolledDialog({
      open: false,
      courseCode: '',
      courseName: '',
      courseId: ''
    });
  };
  return <div className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border border-border/30 bg-white shadow-sm overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardHeader className="p-0 cursor-pointer transition-colors" style={{ background: 'hsl(208, 100%, 33%)' }}>
              <div className="flex items-center justify-between py-4 px-6">
                <div className="flex items-center gap-3">
                  <div>
                    <CardTitle className="text-xl font-bold tracking-wide text-white">GLEE ACADEMY</CardTitle>
                    <p className="text-xs text-white/70 pt-1">Spring 2026 Courses ({activeCourses.length})</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isDefaultCourse && <Button variant="ghost" size="sm" onClick={e => {
                  e.stopPropagation();
                  clearCourseSelection();
                }} className="text-xs text-white/80 hover:text-white hover:bg-white/10">
                      <X className="h-3 w-3 mr-1" />
                      Exit Course View
                    </Button>}
                  <button onClick={e => {
                  e.stopPropagation();
                  navigate('/glee-academy');
                }} className="text-sm text-white hover:text-white/80 flex items-center gap-1 transition-colors">
                    View All <ArrowRight className="h-4 w-4" />
                  </button>
                  <ChevronDown className={`h-4 w-4 text-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-6 py-6 bg-white">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {activeCourses.map(course => {
                const IconComponent = course.icon;
                const isSelected = selectedCourseId === course.id || isDefaultCourse && course.id === 'a0000000-0000-0000-0000-000000000070';
                return <button key={course.id} onClick={() => handleCourseClick(course)} 
                  className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${isSelected ? 'border-[hsl(208,100%,33%)] bg-[hsl(208,100%,33%)]/5' : 'border-[hsl(208,100%,33%)]/30 hover:border-[hsl(208,100%,33%)] hover:bg-[hsl(208,100%,33%)]/5'}`}>
                      <div className={`p-2 rounded-full mb-2 transition-colors ${isSelected ? 'bg-[hsl(208,100%,33%)]' : 'bg-[hsl(208,100%,33%)]/10'}`}>
                        <IconComponent className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-[hsl(208,100%,33%)]'}`} />
                      </div>
                      <span className="text-xs font-semibold text-center text-[hsl(208,100%,33%)]">
                        {course.courseCode}
                      </span>
                      <span className="text-[10px] text-gray-500 text-center line-clamp-1 mt-0.5">
                        {course.title}
                      </span>
                      {isSelected && <span className="text-[8px] text-[hsl(208,100%,33%)] font-medium mt-1">ACTIVE</span>}
                    </button>;
              })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Not Enrolled Dialog */}
      <Dialog open={notEnrolledDialog.open} onOpenChange={open => setNotEnrolledDialog(prev => ({
      ...prev,
      open
    }))}>
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
              <Button variant="outline" onClick={() => setNotEnrolledDialog(prev => ({
              ...prev,
              open: false
            }))}>
                Cancel
              </Button>
              <Button onClick={handleRequestAccess}>
                View Course Details
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Course Details Dialog */}
      <Dialog open={courseDialog.open} onOpenChange={open => setCourseDialog(prev => ({
      ...prev,
      open
    }))}>
        <DialogContent className="sm:max-w-md">
          {courseDialog.course && <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    {React.createElement(courseDialog.course.icon, {
                  className: "h-6 w-6 text-primary"
                })}
                  </div>
                  <div>
                    <DialogTitle className="text-lg">{courseDialog.course.courseCode}</DialogTitle>
                    <DialogDescription className="text-sm">{courseDialog.course.title}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  {courseDialog.course.description}
                </p>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/50 rounded-lg p-2">
                    <span className="text-muted-foreground">Level:</span>
                    <span className="ml-1 font-medium">{courseDialog.course.level}</span>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="ml-1 font-medium">{courseDialog.course.duration}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {courseDialog.course.highlights.map(highlight => <span key={highlight} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {highlight}
                    </span>)}
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={handleViewCoursePage}>
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Course Page
                  </Button>
                  <Button className="flex-1" onClick={handleEnterCourse}>
                    <GraduationCap className="h-4 w-4 mr-1" />
                    Enter Course
                  </Button>
                </div>
              </div>
            </>}
        </DialogContent>
      </Dialog>
    </div>;
};