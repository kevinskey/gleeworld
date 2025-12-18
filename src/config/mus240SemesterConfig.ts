// MUS240 Semester Configuration
// Available semesters for the course

export interface Semester {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export const MUS240_SEMESTERS: Semester[] = [
  {
    id: 'Fall 2025',
    label: 'Fall 2025',
    startDate: '2025-08-15',
    endDate: '2025-12-15',
    isActive: true, // Current active semester
  },
  {
    id: 'Spring 2026',
    label: 'Spring 2026',
    startDate: '2026-01-14',
    endDate: '2026-05-15',
    isActive: false, // Upcoming - fresh start
  },
];

// Get the current active semester
export const getCurrentSemester = (): Semester => {
  return MUS240_SEMESTERS.find(s => s.isActive) || MUS240_SEMESTERS[0];
};

// Get all available semesters for selection
export const getAvailableSemesters = (): Semester[] => {
  return MUS240_SEMESTERS;
};

// Default semester ID for queries
export const DEFAULT_SEMESTER = 'Fall 2025';
