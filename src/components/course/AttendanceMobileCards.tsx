import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp, Check, X, Clock, AlertCircle, Minus, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface StudentData {
  student_id: string;
  student_name: string;
  records: Map<string, string | null>;
  totals: {
    present: number;
    absent: number;
    excused: number;
    late: number;
    rate: number;
  };
}

interface SessionData {
  id: string;
  date: string;
  title: string;
  week_number: number;
}

interface AttendanceMobileCardsProps {
  students: StudentData[];
  sessions: SessionData[];
  isInstructor: boolean;
  onCycleStatus?: (studentId: string, sessionId: string, currentStatus: string | null) => void;
  dirtyRecords: Map<string, string>;
  formatDate?: (dateStr: string) => Date;
  saving?: boolean;
  onSave?: () => void;
}

const STATUS_CONFIG = {
  present: { label: 'P', icon: Check, bg: 'bg-green-200 dark:bg-green-900/50', text: 'text-green-900 dark:text-green-200', border: 'border-green-400 dark:border-green-600' },
  absent: { label: 'A', icon: X, bg: 'bg-red-200 dark:bg-red-900/50', text: 'text-red-900 dark:text-red-200', border: 'border-red-400 dark:border-red-600' },
  excused: { label: 'E', icon: AlertCircle, bg: 'bg-blue-200 dark:bg-blue-900/50', text: 'text-blue-900 dark:text-blue-200', border: 'border-blue-400 dark:border-blue-600' },
  late: { label: 'L', icon: Clock, bg: 'bg-amber-200 dark:bg-amber-900/50', text: 'text-amber-900 dark:text-amber-200', border: 'border-amber-400 dark:border-amber-600' },
} as const;

const getStatusConfig = (status: string | null) => {
  if (status && status in STATUS_CONFIG) {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  }
  return { label: '-', icon: Minus, bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500 dark:text-slate-400', border: 'border-slate-300 dark:border-slate-600' };
};

export const AttendanceMobileCards: React.FC<AttendanceMobileCardsProps> = ({
  students,
  sessions,
  isInstructor,
  onCycleStatus,
  dirtyRecords,
  formatDate,
  saving,
  onSave,
}) => {
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const parseDate = (dateStr: string) => {
    if (formatDate) return formatDate(dateStr);
    return parseISO(dateStr);
  };

  const hasDirtyRecords = dirtyRecords.size > 0;

  return (
    <div className="relative">
      <div className={cn("space-y-2 p-3", hasDirtyRecords && isInstructor && "pb-20")}>
        {students.map((student) => {
          const isExpanded = expandedStudent === student.student_id;

          return (
            <div
              key={student.student_id}
              className="border rounded-lg bg-card overflow-hidden"
            >
              {/* Card header — always visible */}
              <button
                className="w-full flex items-center justify-between p-3 text-left active:bg-muted/50 touch-manipulation"
                onClick={() => setExpandedStudent(isExpanded ? null : student.student_id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">
                    {student.student_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-semibold px-1.5 py-0",
                        student.totals.rate >= 90
                          ? "border-green-400 text-green-700 dark:text-green-300"
                          : student.totals.rate >= 75
                          ? "border-amber-400 text-amber-700 dark:text-amber-300"
                          : "border-red-400 text-red-700 dark:text-red-300"
                      )}
                    >
                      {student.totals.rate}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      P:{student.totals.present} A:{student.totals.absent} E:{student.totals.excused} L:{student.totals.late}
                    </span>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
                )}
              </button>

              {/* Expanded session grid */}
              {isExpanded && (
                <div className="border-t px-3 pb-3 pt-2">
                  <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5">
                    {sessions.map((session) => {
                      const status = student.records.get(session.id) as string | null || null;
                      const config = getStatusConfig(status);
                      const isDirty = dirtyRecords.has(`${student.student_id}::${session.id}`);
                      const dateObj = parseDate(session.date);

                      return (
                        <button
                          key={session.id}
                          className={cn(
                            "flex flex-col items-center gap-0.5 rounded-lg p-1.5 border transition-all touch-manipulation",
                            config.bg,
                            config.border,
                            isDirty && "ring-2 ring-primary ring-offset-1",
                            isInstructor
                              ? "active:scale-95 cursor-pointer"
                              : "cursor-default"
                          )}
                          onClick={() =>
                            isInstructor &&
                            onCycleStatus?.(student.student_id, session.id, status)
                          }
                          disabled={!isInstructor}
                        >
                          <span className="text-[10px] text-muted-foreground leading-tight">
                            {format(dateObj, 'M/d')}
                          </span>
                          <span
                            className={cn(
                              "text-sm font-bold leading-none",
                              config.text
                            )}
                          >
                            {config.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky save footer for mobile */}
      {isInstructor && hasDirtyRecords && onSave && (
        <div className="sticky bottom-0 left-0 right-0 p-3 bg-background/95 backdrop-blur-sm border-t shadow-lg z-20">
          <Button
            className="w-full gap-2"
            onClick={onSave}
            disabled={saving}
          >
            <Save className="h-4 w-4" />
            Save Changes ({dirtyRecords.size})
          </Button>
        </div>
      )}
    </div>
  );
};
