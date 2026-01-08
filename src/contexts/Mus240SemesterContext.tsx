import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Semester {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface Mus240SemesterContextType {
  currentSemester: string;
  setCurrentSemester: (semester: string) => void;
  availableSemesters: Semester[];
  isLoading: boolean;
}

const Mus240SemesterContext = createContext<Mus240SemesterContextType | undefined>(undefined);

const SEMESTER_STORAGE_KEY = 'mus240_selected_semester';

export const Mus240SemesterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentSemester, setCurrentSemesterState] = useState<string>('');
  const [availableSemesters, setAvailableSemesters] = useState<Semester[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        const { data, error } = await supabase
          .from('gw_semesters')
          .select('*')
          .order('year', { ascending: false })
          .order('term', { ascending: true });

        if (error) throw error;

        const formattedSemesters: Semester[] = (data || []).map(s => ({
          id: `${s.term} ${s.year}`,
          label: `${s.term} ${s.year}`,
          startDate: s.start_date,
          endDate: s.end_date,
          isActive: s.is_active
        }));

        setAvailableSemesters(formattedSemesters);

        // Determine which semester to select
        const savedSemester = localStorage.getItem(SEMESTER_STORAGE_KEY);
        const activeSemester = formattedSemesters.find(s => s.isActive);
        
        if (savedSemester && formattedSemesters.some(s => s.id === savedSemester)) {
          setCurrentSemesterState(savedSemester);
        } else if (activeSemester) {
          setCurrentSemesterState(activeSemester.id);
        } else if (formattedSemesters.length > 0) {
          setCurrentSemesterState(formattedSemesters[0].id);
        }
      } catch (err) {
        console.error('Error fetching semesters:', err);
        // Fallback to empty state
        setAvailableSemesters([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSemesters();
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
      currentSemester: '',
      setCurrentSemester: () => {},
      availableSemesters: [],
      isLoading: true,
    };
  }
  return context;
};
