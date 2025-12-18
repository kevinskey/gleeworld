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
  const { currentSemester, setCurrentSemester, availableSemesters } = useMus240SemesterSafe();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Semester:</span>
        </div>
      )}
      <Select value={currentSemester} onValueChange={setCurrentSemester}>
        <SelectTrigger className="w-[140px] h-8 text-sm">
          <SelectValue placeholder="Select semester" />
        </SelectTrigger>
        <SelectContent>
          {availableSemesters.map((semester) => (
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
