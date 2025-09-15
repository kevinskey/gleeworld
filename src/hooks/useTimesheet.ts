import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Timesheet {
  id: string;
  user_id: string;
  week_start_date: string;
  week_end_date: string;
  weekly_goal: string | null;
  goal_met: boolean | null;
  goal_evaluation: string | null;
  total_hours_worked: number;
  status: 'active' | 'submitted' | 'approved';
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  timesheet_id: string;
  check_in_time: string;
  check_out_time: string | null;
  break_duration_minutes: number;
  notes: string | null;
  total_hours: number | null;
  created_at: string;
  updated_at: string;
}

export const useTimesheet = () => {
  const { user } = useAuth();
  const [currentTimesheet, setCurrentTimesheet] = useState<Timesheet | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(false);

  // Get current week dates
  const getCurrentWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek); // Start on Sunday
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // End on Saturday
    
    return {
      start: startOfWeek.toISOString().split('T')[0],
      end: endOfWeek.toISOString().split('T')[0]
    };
  };

  // Initialize or get current week timesheet
  const initializeTimesheet = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { start, end } = getCurrentWeekDates();

      // Check if timesheet exists for current week
      const { data: existingTimesheet, error: fetchError } = await supabase
        .from('gw_timesheets')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start_date', start)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingTimesheet) {
        setCurrentTimesheet(existingTimesheet as Timesheet);
      } else {
        // Create new timesheet for current week
        const { data: newTimesheet, error: createError } = await supabase
          .from('gw_timesheets')
          .insert({
            user_id: user.id,
            week_start_date: start,
            week_end_date: end,
            status: 'active'
          })
          .select()
          .single();

        if (createError) throw createError;
        setCurrentTimesheet(newTimesheet as Timesheet);
      }
    } catch (error) {
      console.error('Error initializing timesheet:', error);
      toast.error('Failed to initialize timesheet');
    } finally {
      setLoading(false);
    }
  };

  // Load time entries for current timesheet
  const loadTimeEntries = async () => {
    if (!currentTimesheet) return;

    try {
      const { data, error } = await supabase
        .from('gw_time_entries')
        .select('*')
        .eq('timesheet_id', currentTimesheet.id)
        .order('check_in_time', { ascending: false });

      if (error) throw error;

      setTimeEntries(data || []);
      
      // Find active entry (no check-out time)
      const active = data?.find(entry => !entry.check_out_time);
      setActiveEntry(active || null);
    } catch (error) {
      console.error('Error loading time entries:', error);
    }
  };

  // Check in
  const checkIn = async (notes?: string) => {
    if (!user || !currentTimesheet || activeEntry) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_time_entries')
        .insert({
          user_id: user.id,
          timesheet_id: currentTimesheet.id,
          check_in_time: new Date().toISOString(),
          notes: notes || null
        })
        .select()
        .single();

      if (error) throw error;

      setActiveEntry(data);
      await loadTimeEntries();
      toast.success('Checked in successfully!');
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error('Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  // Check out
  const checkOut = async (breakMinutes: number = 0, notes?: string) => {
    if (!activeEntry) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('gw_time_entries')
        .update({
          check_out_time: new Date().toISOString(),
          break_duration_minutes: breakMinutes,
          notes: notes || activeEntry.notes
        })
        .eq('id', activeEntry.id);

      if (error) throw error;

      setActiveEntry(null);
      await loadTimeEntries();
      toast.success('Checked out successfully!');
    } catch (error) {
      console.error('Error checking out:', error);
      toast.error('Failed to check out');
    } finally {
      setLoading(false);
    }
  };

  // Update weekly goal
  const updateWeeklyGoal = async (goal: string) => {
    if (!currentTimesheet) return;

    try {
      const { error } = await supabase
        .from('gw_timesheets')
        .update({ weekly_goal: goal })
        .eq('id', currentTimesheet.id);

      if (error) throw error;

      setCurrentTimesheet(prev => prev ? { ...prev, weekly_goal: goal } : null);
      toast.success('Weekly goal updated!');
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error('Failed to update goal');
    }
  };

  // Submit weekly evaluation
  const submitWeeklyEvaluation = async (goalMet: boolean, evaluation: string) => {
    if (!currentTimesheet) return;

    try {
      const { error } = await supabase
        .from('gw_timesheets')
        .update({
          goal_met: goalMet,
          goal_evaluation: evaluation,
          status: 'submitted'
        })
        .eq('id', currentTimesheet.id);

      if (error) throw error;

      setCurrentTimesheet(prev => prev ? {
        ...prev,
        goal_met: goalMet,
        goal_evaluation: evaluation,
        status: 'submitted'
      } : null);
      
      toast.success('Weekly evaluation submitted!');
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      toast.error('Failed to submit evaluation');
    }
  };

  // Calculate total worked hours for display
  const getTotalWorkedHours = () => {
    return timeEntries.reduce((total, entry) => {
      return total + (entry.total_hours || 0);
    }, 0);
  };

  // Check if it's end of week (Saturday)
  const isEndOfWeek = () => {
    return new Date().getDay() === 6; // Saturday
  };

  useEffect(() => {
    if (user) {
      initializeTimesheet();
    }
  }, [user]);

  useEffect(() => {
    if (currentTimesheet) {
      loadTimeEntries();
    }
  }, [currentTimesheet]);

  return {
    currentTimesheet,
    timeEntries,
    activeEntry,
    loading,
    checkIn,
    checkOut,
    updateWeeklyGoal,
    submitWeeklyEvaluation,
    getTotalWorkedHours,
    isEndOfWeek,
    refreshTimesheet: initializeTimesheet
  };
};