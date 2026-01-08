// MUS240 Semester Configuration
// Now fetched from gw_semesters database table
// This file provides legacy support and type definitions

export interface Semester {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

// Legacy support - these are now managed in the database via gw_semesters table
// Use useSemesters hook or Mus240SemesterContext for dynamic semester data

// Default semester for fallback (should match an active semester in DB)
export const DEFAULT_SEMESTER = 'Spring 2026';

// Legacy function - kept for backwards compatibility
// Components should use useMus240Semester() hook instead
export const getCurrentSemester = (): Semester => {
  return {
    id: DEFAULT_SEMESTER,
    label: DEFAULT_SEMESTER,
    startDate: '2026-01-14',
    endDate: '2026-05-08',
    isActive: true
  };
};

// Legacy function - kept for backwards compatibility
// Components should use useMus240Semester() hook instead
export const getAvailableSemesters = (): Semester[] => {
  return [getCurrentSemester()];
};
