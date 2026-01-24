import React from 'react';
import { GraduationCap } from 'lucide-react';
import { useCourseGrade } from '@/hooks/useCourseGrade';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface CourseGradeStatProps {
  courseId: string;
  className?: string;
}

export const CourseGradeStat: React.FC<CourseGradeStatProps> = ({ courseId, className }) => {
  const { letterGrade, percentage, gradedCount, assignmentCount, loading } = useCourseGrade(courseId);

  return (
    <TooltipProvider>
      <div className={cn("px-4 py-4 border-b border-border bg-gradient-to-b from-primary/10 to-transparent", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-3 cursor-help">
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col">
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
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            <p>{gradedCount} of {assignmentCount} assignments graded</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
