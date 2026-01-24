import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ChevronRight } from 'lucide-react';
import { useCourseGrade } from '@/hooks/useCourseGrade';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface CourseGradeStatProps {
  courseId: string;
  className?: string;
}

export const CourseGradeStat: React.FC<CourseGradeStatProps> = ({ courseId, className }) => {
  const { letterGrade, percentage, stats, deductions, loading } = useCourseGrade(courseId);
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/grading/student/course/${courseId}`);
  };

  return (
    <TooltipProvider>
      <div 
        className={cn(
          "px-5 py-6 border-b border-border bg-gradient-to-b from-primary/10 to-transparent cursor-pointer hover:bg-primary/15 transition-colors group",
          className
        )}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Course Grade
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl lg:text-3xl font-bold text-foreground leading-none">
                    {loading ? '--' : `${percentage}%`}
                  </span>
                  <span className="text-lg lg:text-xl font-semibold text-primary">
                    {loading ? '' : letterGrade}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1 group-hover:text-primary transition-colors">
                  View breakdown <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            <p className="font-medium">Starts at 100%, deductions apply:</p>
            <p>Assignments: -{deductions.assignments}%</p>
            <p>Absences ({stats.absenceCount}): -{deductions.attendance}%</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
