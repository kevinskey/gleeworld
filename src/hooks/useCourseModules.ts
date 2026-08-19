// Universal Course Modules Hook
// Provides a consistent interface for fetching and managing course modules across ALL courses

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSemesters, Semester } from './useSemesters';
import { sortModulesByCurrentFirst, getCurrentWeekNumber, getWeekDates, formatWeekDateRange } from '@/utils/semesterWeekUtils';

export interface CourseModule {
  id: string;
  course_id: string;
  module_id: string;
  title: string;
  description: string | null;
  week_number: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  is_published: boolean;
  is_locked: boolean;
  unlock_date: string | null;
  semester_id: string | null;
  semester: string | null;
  learning_objectives: any | null;
  display_order: number | null;
  created_at: string;
  updated_at: string;
  // Computed properties
  isCurrent?: boolean;
  isPast?: boolean;
  isFuture?: boolean;
  dateRange?: string;
}

interface UseCourseModulesOptions {
  courseId: string;
  /** If true, only returns published modules (for student view) */
  publishedOnly?: boolean;
}

interface UseCourseModulesReturn {
  modules: CourseModule[];
  currentModule: CourseModule | null;
  currentWeekNumber: number;
  activeSemester: Semester | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  togglePublished: (moduleId: string, isPublished: boolean) => Promise<void>;
  toggleLocked: (moduleId: string, isLocked: boolean) => Promise<void>;
  updateModule: (moduleId: string, updates: Partial<CourseModule>) => Promise<void>;
}

export const useCourseModules = (options: UseCourseModulesOptions): UseCourseModulesReturn => {
  const { courseId, publishedOnly = false } = options;
  
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { activeSemester, loading: semesterLoading } = useSemesters();
  
  const fetchModules = useCallback(async () => {
    if (!courseId || semesterLoading) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      let data: any[] = [];
      
        // Use universal gw_course_modules table
        const { data: universalData, error: universalError } = await supabase
          .from('gw_course_modules')
          .select('*')
          .eq('course_id', courseId)
          .order('week_number', { ascending: true });
        
        if (universalError) throw universalError;
        
        data = (universalData || []).map(m => ({
          ...m,
          is_published: m.is_published ?? true,
        }));
      
      // Determine current week from semester
      const currentWeek = activeSemester 
        ? getCurrentWeekNumber({ 
            id: activeSemester.id, 
            start_date: activeSemester.start_date, 
            end_date: activeSemester.end_date 
          })
        : 0;
      
      // Enrich modules with computed properties
      const enrichedModules = data.map(m => {
        const isCurrent = m.week_number === currentWeek || (
          m.start_date && m.end_date && 
          new Date() >= new Date(m.start_date) && 
          new Date() <= new Date(m.end_date)
        );
        
        const isPast = m.week_number < currentWeek;
        const isFuture = m.week_number > currentWeek;
        
        // Calculate date range if not set
        let dateRange = '';
        if (m.start_date && m.end_date) {
          dateRange = formatWeekDateRange(new Date(m.start_date), new Date(m.end_date));
        } else if (activeSemester && m.week_number) {
          const { startDate, endDate } = getWeekDates(
            { id: activeSemester.id, start_date: activeSemester.start_date, end_date: activeSemester.end_date },
            m.week_number
          );
          dateRange = formatWeekDateRange(startDate, endDate);
        }
        
        return {
          ...m,
          isCurrent,
          isPast,
          isFuture,
          dateRange,
        };
      });
      
      // Filter if publishedOnly
      const filteredModules = publishedOnly 
        ? enrichedModules.filter(m => m.is_published)
        : enrichedModules;
      
      // Sort: current week first, then descending by week number
      const sortedModules = sortModulesByCurrentFirst(
        filteredModules,
        activeSemester ? { id: activeSemester.id, start_date: activeSemester.start_date, end_date: activeSemester.end_date } : undefined
      );
      
      setModules(sortedModules);
    } catch (err) {
      console.error('Error fetching course modules:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch modules');
    } finally {
      setIsLoading(false);
    }
  }, [courseId, publishedOnly, activeSemester, semesterLoading]);
  
  useEffect(() => {
    fetchModules();
  }, [fetchModules]);
  
  // Get current module
  const currentModule = modules.find(m => m.isCurrent) || null;
  
  // Get current week number
  const currentWeekNumber = activeSemester 
    ? getCurrentWeekNumber({ 
        id: activeSemester.id, 
        start_date: activeSemester.start_date, 
        end_date: activeSemester.end_date 
      })
    : 0;
  
  // Toggle published status
  const togglePublished = useCallback(async (moduleId: string, isPublished: boolean) => {
    try {
      const { error } = await supabase
        .from('gw_course_modules')
        .update({ is_published: isPublished, updated_at: new Date().toISOString() })
        .eq('id', moduleId);
      
      if (error) throw error;
      
      // Optimistic update
      setModules(prev => prev.map(m => 
        m.id === moduleId ? { ...m, is_published: isPublished } : m
      ));
    } catch (err) {
      console.error('Error toggling published status:', err);
      throw err;
    }
  }, []);
  
  // Toggle locked status
  const toggleLocked = useCallback(async (moduleId: string, isLocked: boolean) => {
    try {
      const { error } = await supabase
        .from('gw_course_modules')
        .update({ is_locked: isLocked, updated_at: new Date().toISOString() })
        .eq('id', moduleId);
      
      if (error) throw error;
      
      // Optimistic update
      setModules(prev => prev.map(m => 
        m.id === moduleId ? { ...m, is_locked: isLocked } : m
      ));
    } catch (err) {
      console.error('Error toggling locked status:', err);
      throw err;
    }
  }, []);
  
  // Update module
  const updateModule = useCallback(async (moduleId: string, updates: Partial<CourseModule>) => {
    try {
      const { error } = await supabase
        .from('gw_course_modules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', moduleId);
      
      if (error) throw error;
      
      // Optimistic update
      setModules(prev => prev.map(m => 
        m.id === moduleId ? { ...m, ...updates } : m
      ));
    } catch (err) {
      console.error('Error updating module:', err);
      throw err;
    }
  }, []);
  
  return {
    modules,
    currentModule,
    currentWeekNumber,
    activeSemester,
    isLoading: isLoading || semesterLoading,
    error,
    refetch: fetchModules,
    togglePublished,
    toggleLocked,
    updateModule,
  };
};
