// Semester Week Utilities
// Universal helpers for calculating week numbers and date ranges from semester data

import { addDays, startOfDay, differenceInCalendarWeeks, isWithinInterval, parseISO, format } from 'date-fns';

export interface SemesterWeek {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  isPast: boolean;
  isFuture: boolean;
}

export interface SemesterData {
  id: string;
  start_date: string;
  end_date: string;
  exception_dates?: string[];
}

/**
 * Calculates all weeks for a given semester
 * Week 1 starts on the semester start date
 * Each week is 7 days (Monday-Sunday by default)
 */
export const calculateSemesterWeeks = (
  semester: SemesterData,
  totalWeeks: number = 16
): SemesterWeek[] => {
  const today = startOfDay(new Date());
  const semesterStart = startOfDay(parseISO(semester.start_date));
  
  const weeks: SemesterWeek[] = [];
  
  for (let i = 0; i < totalWeeks; i++) {
    const weekStart = addDays(semesterStart, i * 7);
    const weekEnd = addDays(weekStart, 6);
    
    const isCurrent = isWithinInterval(today, { start: weekStart, end: weekEnd });
    const isPast = today > weekEnd;
    const isFuture = today < weekStart;
    
    weeks.push({
      weekNumber: i + 1,
      startDate: weekStart,
      endDate: weekEnd,
      isCurrent,
      isPast,
      isFuture,
    });
  }
  
  return weeks;
};

/**
 * Gets the current week number based on semester start date
 * Returns 0 if before semester, or week count + 1 if after semester
 */
export const getCurrentWeekNumber = (semester: SemesterData): number => {
  const today = startOfDay(new Date());
  const semesterStart = startOfDay(parseISO(semester.start_date));
  const semesterEnd = startOfDay(parseISO(semester.end_date));
  
  if (today < semesterStart) return 0;
  if (today > semesterEnd) return -1; // After semester
  
  const weeksDiff = differenceInCalendarWeeks(today, semesterStart, { weekStartsOn: 1 });
  return weeksDiff + 1; // 1-indexed
};

/**
 * Gets start and end dates for a specific week number
 */
export const getWeekDates = (
  semester: SemesterData,
  weekNumber: number
): { startDate: Date; endDate: Date } => {
  const semesterStart = startOfDay(parseISO(semester.start_date));
  const weekStart = addDays(semesterStart, (weekNumber - 1) * 7);
  const weekEnd = addDays(weekStart, 6);
  
  return { startDate: weekStart, endDate: weekEnd };
};

/**
 * Formats a week's date range for display
 */
export const formatWeekDateRange = (startDate: Date, endDate: Date): string => {
  const startMonth = format(startDate, 'MMM');
  const endMonth = format(endDate, 'MMM');
  
  if (startMonth === endMonth) {
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'd')}`;
  }
  return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`;
};

/**
 * Checks if a date falls within an exception period (holidays, breaks)
 */
export const isExceptionDate = (
  date: Date,
  exceptionDates: string[]
): boolean => {
  const dateStr = format(date, 'yyyy-MM-dd');
  return exceptionDates.includes(dateStr);
};

/**
 * Determines which week a given date belongs to
 */
export const getWeekForDate = (
  date: Date,
  semester: SemesterData
): number | null => {
  const targetDate = startOfDay(date);
  const semesterStart = startOfDay(parseISO(semester.start_date));
  const semesterEnd = startOfDay(parseISO(semester.end_date));
  
  if (targetDate < semesterStart || targetDate > semesterEnd) {
    return null;
  }
  
  const weeksDiff = differenceInCalendarWeeks(targetDate, semesterStart, { weekStartsOn: 1 });
  return weeksDiff + 1;
};

/**
 * Sorts modules with current week first, then descending by week number
 */
export const sortModulesByCurrentFirst = <T extends { week_number?: number; start_date?: string; end_date?: string }>(
  modules: T[],
  semester?: SemesterData
): T[] => {
  const today = startOfDay(new Date());
  
  const isCurrentWeek = (module: T): boolean => {
    if (module.start_date && module.end_date) {
      const start = startOfDay(parseISO(module.start_date));
      const end = startOfDay(parseISO(module.end_date));
      return isWithinInterval(today, { start, end });
    }
    
    // Fallback: calculate from semester if available
    if (semester && module.week_number) {
      const { startDate, endDate } = getWeekDates(semester, module.week_number);
      return isWithinInterval(today, { start: startDate, end: endDate });
    }
    
    return false;
  };
  
  return [...modules].sort((a, b) => {
    const aIsCurrent = isCurrentWeek(a);
    const bIsCurrent = isCurrentWeek(b);
    
    // Current week always first
    if (aIsCurrent && !bIsCurrent) return -1;
    if (!aIsCurrent && bIsCurrent) return 1;
    
    // Then sort by week number descending (most recent first)
    const weekA = a.week_number || 0;
    const weekB = b.week_number || 0;
    return weekB - weekA;
  });
};
