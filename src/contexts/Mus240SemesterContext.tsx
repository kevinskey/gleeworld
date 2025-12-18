import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DEFAULT_SEMESTER, getAvailableSemesters, Semester } from '@/config/mus240SemesterConfig';

interface Mus240SemesterContextType {
  currentSemester: string;
  setCurrentSemester: (semester: string) => void;
  availableSemesters: Semester[];
  isLoading: boolean;
}

const Mus240SemesterContext = createContext<Mus240SemesterContextType | undefined>(undefined);

const SEMESTER_STORAGE_KEY = 'mus240_selected_semester';

export const Mus240SemesterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentSemester, setCurrentSemesterState] = useState<string>(DEFAULT_SEMESTER);
  const [isLoading, setIsLoading] = useState(true);
  const availableSemesters = getAvailableSemesters();

  useEffect(() => {
    // Load saved semester preference from localStorage
    const savedSemester = localStorage.getItem(SEMESTER_STORAGE_KEY);
    if (savedSemester && availableSemesters.some(s => s.id === savedSemester)) {
      setCurrentSemesterState(savedSemester);
    }
    setIsLoading(false);
  }, []);

  const setCurrentSemester = (semester: string) => {
    setCurrentSemesterState(semester);
    localStorage.setItem(SEMESTER_STORAGE_KEY, semester);
  };

  return (
    <Mus240SemesterContext.Provider
      value={{
        currentSemester,
        setCurrentSemester,
        availableSemesters,
        isLoading,
      }}
    >
      {children}
    </Mus240SemesterContext.Provider>
  );
};

export const useMus240Semester = () => {
  const context = useContext(Mus240SemesterContext);
  if (context === undefined) {
    throw new Error('useMus240Semester must be used within a Mus240SemesterProvider');
  }
  return context;
};

// Hook for components that may be outside the provider (uses default)
export const useMus240SemesterSafe = () => {
  const context = useContext(Mus240SemesterContext);
  if (context === undefined) {
    return {
      currentSemester: DEFAULT_SEMESTER,
      setCurrentSemester: () => {},
      availableSemesters: getAvailableSemesters(),
      isLoading: false,
    };
  }
  return context;
};
