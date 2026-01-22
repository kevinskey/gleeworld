import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { useMus240SemesterSafe } from '@/contexts/Mus240SemesterContext';

interface Mus240SemesterSelectorProps {
  className?: string;
  showLabel?: boolean;
}

export const Mus240SemesterSelector: React.FC<Mus240SemesterSelectorProps> = ({ 
  className = '',
  showLabel = true 
}) => {
  const { currentSemester, setCurrentSemester, availableSemesters, isLoading } = useMus240SemesterSafe();

  // Filter out any semesters with empty/invalid ids to prevent Radix Select error
  const validSemesters = availableSemesters.filter(s => s.id && s.id.trim() !== '');

  // Don't render the Select until we have valid semesters to show
  if (isLoading || validSemesters.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showLabel && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Semester:</span>
          </div>
        )}
        <span className="text-sm text-muted-foreground">
          {isLoading ? 'Loading...' : 'No semesters'}
        </span>
      </div>
    );
  }

  // Ensure currentSemester is valid; if not, don't pass it to Select (let placeholder show)
  const selectValue = validSemesters.some(s => s.id === currentSemester) ? currentSemester : undefined;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Semester:</span>
        </div>
      )}
      <Select value={selectValue} onValueChange={setCurrentSemester}>
        <SelectTrigger className="w-[140px] h-8 text-sm bg-popover">
          <SelectValue placeholder="Select semester" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          {validSemesters.map((semester) => (
            <SelectItem key={semester.id} value={semester.id}>
              <div className="flex items-center gap-2">
                <span>{semester.label}</span>
                {semester.isActive && (
                  <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                    Active
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
