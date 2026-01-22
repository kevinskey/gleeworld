import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GraduationCap, ArrowRight, X, Lock, ChevronDown, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ACADEMY_COURSES } from '@/config/academyCourses';
import { useCourseContext } from '@/contexts/CourseContext';
import { useCourseEnrollment } from '@/hooks/useCourseEnrollment';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Map course codes to badge images (add images here when available)
const COURSE_BADGES: Record<string, string> = {};

// Character limit for description to ensure uniform card height
const DESCRIPTION_CHAR_LIMIT = 120;

const COURSE_SLIDER_ORDER = ['MUS 070', 'MUS 240', 'LH 100', 'MUS 210', 'MUS 001', 'GLEE 101', 'GLEE 000'];

export const GleeAcademyDashboardCard = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const { profile } = useUserRole();
  const isAdmin = profile?.is_admin || profile?.is_super_admin;
  const {
    selectedCourseId,
    selectCourse,
    clearCourseSelection,
    isDefaultCourse
  } = useCourseContext();

  const sliderRef = useRef<HTMLDivElement | null>(null);

  const activeCourses = useMemo(() => {
    const orderIndex = new Map(COURSE_SLIDER_ORDER.map((code, idx) => [code, idx] as const));

    return ACADEMY_COURSES
      .filter(course => course.isActive)
      .slice()
      .sort((a, b) => {
        const ai = orderIndex.get(a.courseCode) ?? Number.MAX_SAFE_INTEGER;
        const bi = orderIndex.get(b.courseCode) ?? Number.MAX_SAFE_INTEGER;
        return ai - bi;
      });
  }, []);

  const [isOpen, setIsOpen] = useState(true);

  // Always start the horizontal slider at the left so MUS 070 is visible first
  useEffect(() => {
    if (sliderRef.current) sliderRef.current.scrollLeft = 0;
  }, [isOpen]);

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
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 px-3 sm:px-6 cursor-pointer transition-colors py-[20px] text-gray-50 bg-secondary">
              <div className="flex items-center justify-between py-[20px] px-[10px] bg-secondary">
                <div className="flex items-center gap-3">
                  
                  <div>
                    <CardTitle className="text-xl font-bold tracking-wide pl-[5px] bg-card text-card-foreground">GLEE ACADEMY</CardTitle>
                    <p className="text-xs pl-[5px] pt-[7px] text-primary-foreground">Spring 2026 Courses ({activeCourses.length})</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={e => {
                        e.stopPropagation();
                        navigate('/admin/academy-courses');
                      }} 
                      className="text-xs text-primary-foreground hover:bg-primary-foreground/10"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Edit Courses
                    </Button>
                  )}
                  {!isDefaultCourse && <Button variant="ghost" size="sm" onClick={e => {
                  e.stopPropagation();
                  clearCourseSelection();
                }} className="text-xs text-primary-foreground">
                      <X className="h-3 w-3 mr-1" />
                      Exit Course View
                    </Button>}
                  <button onClick={e => {
                  e.stopPropagation();
                  navigate('/glee-academy');
                }} className="text-sm flex items-center gap-1 transition-colors text-primary-foreground">
                    View All <ArrowRight className="h-4 w-4" />
                  </button>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-3 sm:px-6 bg-background py-6">
              <div ref={sliderRef} className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
              {activeCourses.map(course => {
                  const isSelected = selectedCourseId === course.id || (isDefaultCourse && course.id === 'a0000000-0000-0000-0000-000000000070');
                  const badgeImage = COURSE_BADGES[course.courseCode];
                  const truncatedDescription = course.description.length > DESCRIPTION_CHAR_LIMIT 
                    ? `${course.description.slice(0, DESCRIPTION_CHAR_LIMIT).trim()}...` 
                    : course.description;
                  
                  // If course has a badge image, render the badge version
                  if (badgeImage) {
                    return (
                      <div 
                        key={course.id} 
                        onClick={() => handleCourseClick(course)} 
                        className={`
                          flex-shrink-0 snap-start cursor-pointer 
                          transition-all duration-200 hover:scale-105
                          ${isSelected ? 'ring-2 ring-primary rounded-xl' : ''}
                        `}
                      >
                        <img 
                          src={badgeImage} 
                          alt={`${course.courseCode} - ${course.title}`}
                          className="h-24 sm:h-40 md:h-48 w-auto object-contain"
                        />
                      </div>
                    );
                  }
                  
                  // Fallback to text-based card for courses without badges
                  return (
                    <div 
                      key={course.id} 
                      onClick={() => handleCourseClick(course)} 
                      className={`
                        flex-shrink-0 snap-start cursor-pointer bg-white border rounded-xl 
                        shadow-lg hover:shadow-xl transition-all duration-200
                        /* Mobile: compact centered cards */
                        w-32 p-3 min-h-[100px] items-center justify-center text-center
                        /* Desktop: full cards with descriptions */
                        sm:w-72 sm:p-8 sm:min-h-[280px] sm:items-start sm:justify-start sm:text-left
                        flex flex-col
                        ${isSelected ? 'ring-2 ring-primary border-primary' : 'border-border/40'}
                      `}
                    >
                      {/* Course Code - Elegant serif style */}
                      <h3 
                        className="text-sm sm:text-2xl font-light tracking-wide text-foreground mb-1 sm:mb-2" 
                        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                      >
                        {course.courseCode}
                      </h3>

                      {/* Course Title - Italic style */}
                      <h4 className="text-xs sm:text-lg font-semibold text-[#003666] italic leading-snug line-clamp-2 sm:mb-4">
                        {course.title}
                      </h4>

                      {/* Description - Hidden on mobile, shown on desktop */}
                      <p className="hidden sm:block text-base text-muted-foreground leading-relaxed flex-1 mb-6 antialiased">
                        {truncatedDescription}
                      </p>

                      {/* Enter Course Button - Hidden on mobile (tap card instead) */}
                      <Button 
                        variant="outline" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCourseClick(course);
                        }}
                        className={`hidden sm:inline-flex w-fit px-6 py-2 rounded-full border-[#003666] text-[#003666] bg-transparent hover:bg-[#003666] hover:text-white transition-colors font-medium text-sm ${isSelected ? 'bg-[#003666] text-white' : ''}`}
                      >
                        {isSelected ? 'Active' : 'Enter Course'}
                      </Button>
                      
                      {/* Mobile: Show active indicator */}
                      {isSelected && (
                        <span className="sm:hidden text-[10px] mt-1 text-primary font-medium">Active</span>
                      )}
                    </div>
                  );
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