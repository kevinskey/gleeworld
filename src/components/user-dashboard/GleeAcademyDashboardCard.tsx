import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowRight, X, ChevronDown, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ACADEMY_COURSES } from '@/config/academyCourses';
import { useCourseContext } from '@/contexts/CourseContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Course badge images
import MUS070Badge from '@/assets/academy/MUS_070.png';
import MUS240Badge from '@/assets/academy/MUS_240.png';
import LH100Badge from '@/assets/academy/LH100.png';

// Map course codes to badge images
const COURSE_BADGES: Record<string, string> = {
  'MUS 070': MUS070Badge,
  'MUS 240': MUS240Badge,
  'LH 100': LH100Badge,
};

const COURSE_SLIDER_ORDER = ['MUS 070', 'MUS 240', 'LH 100', 'MUS 210', 'MUS 001', 'GLEE 101', 'GLEE 000'];

export const GleeAcademyDashboardCard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUserRole();
  const isAdmin = profile?.is_admin || profile?.is_super_admin;
  const {
    selectedCourseId,
    selectCourse,
    clearCourseSelection,
    isDefaultCourse
  } = useCourseContext();

  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  // Get courses with badges first, then others
  const activeCourses = useMemo(() => {
    const orderIndex = new Map(COURSE_SLIDER_ORDER.map((code, idx) => [code, idx] as const));

    return ACADEMY_COURSES
      .filter(course => course.isActive && COURSE_BADGES[course.courseCode]) // Only show courses with badges
      .slice()
      .sort((a, b) => {
        const ai = orderIndex.get(a.courseCode) ?? Number.MAX_SAFE_INTEGER;
        const bi = orderIndex.get(b.courseCode) ?? Number.MAX_SAFE_INTEGER;
        return ai - bi;
      });
  }, []);

  // Always start the horizontal slider at the left
  useEffect(() => {
    if (sliderRef.current) sliderRef.current.scrollLeft = 0;
  }, [isOpen]);

  const handleCourseClick = (course: typeof ACADEMY_COURSES[0]) => {
    if (!user) {
      toast.error('Please log in to access courses');
      return;
    }
    // Navigate directly to the course home page
    navigate(course.route);
  };

  const scrollSlider = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = 300;
      sliderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5 overflow-hidden">
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
                  {!isDefaultCourse && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={e => {
                        e.stopPropagation();
                        clearCourseSelection();
                      }} 
                      className="text-xs text-primary-foreground"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Exit Course View
                    </Button>
                  )}
                  <button 
                    onClick={e => {
                      e.stopPropagation();
                      navigate('/glee-academy');
                    }} 
                    className="text-sm flex items-center gap-1 transition-colors text-primary-foreground"
                  >
                    View All <ArrowRight className="h-4 w-4" />
                  </button>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-0 bg-[#1a3a5c] relative">
              {/* Navigation arrows - hidden on mobile */}
              <button 
                onClick={() => scrollSlider('left')}
                className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full p-2 transition-colors"
              >
                <ChevronLeft className="h-6 w-6 text-white" />
              </button>
              <button 
                onClick={() => scrollSlider('right')}
                className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full p-2 transition-colors"
              >
                <ChevronRight className="h-6 w-6 text-white" />
              </button>

              {/* Photo Slider */}
              <div 
                ref={sliderRef} 
                className="flex gap-4 sm:gap-6 overflow-x-auto py-6 px-4 sm:px-12 snap-x snap-mandatory scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
              >
                {activeCourses.map(course => {
                  const isSelected = selectedCourseId === course.id || (isDefaultCourse && course.id === 'a0000000-0000-0000-0000-000000000070');
                  const badgeImage = COURSE_BADGES[course.courseCode];
                  
                  return (
                    <div 
                      key={course.id} 
                      onClick={() => handleCourseClick(course)} 
                      className={`
                        flex-shrink-0 snap-center cursor-pointer 
                        transition-all duration-300 hover:scale-105 hover:brightness-110
                        ${isSelected ? 'ring-4 ring-amber-400 rounded-2xl scale-105' : ''}
                      `}
                    >
                      <img 
                        src={badgeImage} 
                        alt={`${course.courseCode} - ${course.title}`}
                        className="h-28 sm:h-44 md:h-52 w-auto object-contain drop-shadow-2xl"
                      />
                      {isSelected && (
                        <div className="text-center mt-2">
                          <span className="text-xs text-amber-400 font-semibold bg-black/30 px-3 py-1 rounded-full">
                            Active
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};
