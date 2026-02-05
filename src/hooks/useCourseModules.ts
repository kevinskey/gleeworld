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
  /** If true, uses legacy MUS-240 table (temporary during migration) */
  useLegacyMUS240?: boolean;
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

// MUS-240 course ID (temporary - for legacy table support)
const MUS_240_ID = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37';

export const useCourseModules = (options: UseCourseModulesOptions): UseCourseModulesReturn => {
  const { courseId, publishedOnly = false, useLegacyMUS240 = true } = options;
  
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { activeSemester, loading: semesterLoading } = useSemesters();
  
  // Determine if this course uses the legacy MUS-240 table
  const isLegacyMUS240 = useLegacyMUS240 && courseId === MUS_240_ID;
  
  const fetchModules = useCallback(async () => {
    if (!courseId || semesterLoading) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      let data: any[] = [];
      
      if (isLegacyMUS240) {
        // Use legacy mus240_module_settings table
        const { data: legacyData, error: legacyError } = await supabase
          .from('mus240_module_settings')
          .select('*')
          .order('week_number', { ascending: true });
        
        if (legacyError) throw legacyError;
        
        // Transform legacy data to unified format
        data = (legacyData || []).map(m => ({
          id: m.id,
          course_id: MUS_240_ID,
          module_id: m.module_id,
          title: m.title || `Week ${m.week_number}`,
          description: m.description,
          week_number: m.week_number || parseInt(m.module_id.replace('week-', '')) || 0,
          start_date: m.start_date,
          end_date: m.end_date,
          is_active: m.is_active ?? false,
          is_published: m.is_published ?? true,
          is_locked: m.is_locked ?? false,
          unlock_date: m.unlock_date,
          semester_id: m.semester_id,
          semester: m.semester,
          learning_objectives: m.learning_objectives,
          display_order: m.week_number,
          created_at: m.updated_at,
          updated_at: m.updated_at,
        }));
      } else {
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
      }
      
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
  }, [courseId, publishedOnly, isLegacyMUS240, activeSemester, semesterLoading]);
  
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
      const table = isLegacyMUS240 ? 'mus240_module_settings' : 'gw_course_modules';
      
      const { error } = await supabase
        .from(table)
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
  }, [isLegacyMUS240]);
  
  // Toggle locked status
  const toggleLocked = useCallback(async (moduleId: string, isLocked: boolean) => {
    try {
      const table = isLegacyMUS240 ? 'mus240_module_settings' : 'gw_course_modules';
      
      const { error } = await supabase
        .from(table)
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
  }, [isLegacyMUS240]);
  
  // Update module
  const updateModule = useCallback(async (moduleId: string, updates: Partial<CourseModule>) => {
    try {
      const table = isLegacyMUS240 ? 'mus240_module_settings' : 'gw_course_modules';
      
      const { error } = await supabase
        .from(table)
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
  }, [isLegacyMUS240]);
  
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
