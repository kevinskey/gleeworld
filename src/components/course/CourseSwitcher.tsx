/**
 * Universal Course Switcher Component
 * 
 * Used in instructor consoles to switch between courses the user has access to.
 * Provides consistent navigation across all course management interfaces.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ACADEMY_COURSES, AcademyCourse } from '@/config/academyCourses';

interface CourseSwitcherProps {
  currentCourse: AcademyCourse;
  /** Target route pattern - use {slug} as placeholder */
  routePattern?: string;
  /** Only show courses the user instructs */
  instructedOnly?: boolean;
  /** Callback when switching courses */
  onSwitch?: (course: AcademyCourse) => void;
  /** Close mobile sidebar after switch */
  onClose?: () => void;
  /** Variant styling */
  variant?: 'default' | 'compact';
  className?: string;
}

const courseToSlug = (course: AcademyCourse): string => {
  return course.courseCode.toLowerCase().replace(' ', '-');
};

export const CourseSwitcher: React.FC<CourseSwitcherProps> = ({
  currentCourse,
  routePattern = '/{slug}/instructor/console',
  instructedOnly = false,
  onSwitch,
  onClose,
  variant = 'default',
  className,
}) => {
  const navigate = useNavigate();
  
  // Get available courses (active only)
  const availableCourses = ACADEMY_COURSES.filter(c => c.isActive);
  
  const handleCourseSelect = (course: AcademyCourse) => {
    if (course.id === currentCourse.id) return;
    
    const slug = courseToSlug(course);
    const targetRoute = routePattern.replace('{slug}', slug);
    
    onSwitch?.(course);
    onClose?.();
    navigate(targetRoute);
  };
  
  const isCompact = variant === 'compact';
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div 
          className={cn(
            "cursor-pointer transition-colors",
            isCompact 
              ? "px-3 py-2 rounded-lg hover:bg-accent" 
              : "px-3 py-3 bg-primary text-primary-foreground hover:bg-primary/90",
            className
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className={cn(
              "font-bold",
              isCompact ? "text-base text-foreground" : "text-lg xl:text-xl text-primary-foreground"
            )}>
              {currentCourse.courseCode}
            </h2>
            <ChevronDown className={cn(
              "h-4 w-4 flex-shrink-0",
              isCompact ? "text-muted-foreground" : "text-primary-foreground"
            )} />
          </div>
          <p className={cn(
            "text-xs mt-1",
            isCompact ? "text-muted-foreground" : "text-primary-foreground/90 xl:text-sm"
          )}>
            {currentCourse.title}
          </p>
          {!isCompact && currentCourse.instructor?.name && (
            <p className="text-[10px] mt-0.5 xl:mt-1 text-primary-foreground/80 xl:text-sm">
              {currentCourse.instructor.name}
            </p>
          )}
        </div>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-64">
        {availableCourses.map(course => (
          <DropdownMenuItem
            key={course.id}
            onClick={() => handleCourseSelect(course)}
            className={cn(
              "flex flex-col items-start gap-0.5 py-2 cursor-pointer",
              course.id === currentCourse.id && "bg-accent"
            )}
          >
            <span className="font-semibold">{course.courseCode}</span>
            <span className="text-xs text-muted-foreground">{course.title}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Convenience component for instructor console sidebar
export const InstructorCourseSwitcher: React.FC<Omit<CourseSwitcherProps, 'routePattern'>> = (props) => (
  <CourseSwitcher {...props} routePattern="/{slug}/instructor/console" />
);

// Convenience component for student view switching
export const StudentCourseSwitcher: React.FC<Omit<CourseSwitcherProps, 'routePattern'>> = (props) => (
  <CourseSwitcher {...props} routePattern="/academy/{slug}" variant="compact" />
);
