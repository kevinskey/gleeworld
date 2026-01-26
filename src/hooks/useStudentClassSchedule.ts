import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AutoNotificationService } from '@/services/AutoNotificationService';

export interface ClassScheduleEntry {
  id: string;
  user_id: string;
  semester: string;
  course_name: string;
  course_code: string | null;
  days: string[];
  start_time: string;
  end_time: string;
  location: string | null;
  instructor_name: string | null;
  notes: string | null;
  has_conflict: boolean;
  conflict_details: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassScheduleInput {
  course_name: string;
  course_code?: string;
  days: string[];
  start_time: string;
  end_time: string;
  location?: string;
  instructor_name?: string;
  notes?: string;
}

export const useStudentClassSchedule = (semester: string = 'Spring 2026') => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<ClassScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSchedules = async (showLoadingState = true) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Only show loading state on initial load, not on refetches
      // This prevents the UI from flashing empty during navigation
      if (showLoadingState && schedules.length === 0) {
        setLoading(true);
      }
      
      const { data, error } = await supabase
        .from('student_class_schedules')
        .select('*')
        .eq('user_id', user.id)
        .eq('semester', semester)
        .order('start_time');

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching class schedules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load class schedules',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addSchedule = async (input: ClassScheduleInput) => {
    if (!user) return null;

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('student_class_schedules')
        .insert({
          user_id: user.id,
          semester,
          course_name: input.course_name,
          course_code: input.course_code || null,
          days: input.days,
          start_time: input.start_time,
          end_time: input.end_time,
          location: input.location || null,
          instructor_name: input.instructor_name || null,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      setSchedules(prev => [...prev, data]);
      
      if (data.has_conflict) {
        toast({
          title: '⚠️ Conflict Detected',
          description: data.conflict_details,
          variant: 'destructive',
        });
        
        // Notify admins about the conflict
        const { data: profile } = await supabase
          .from('gw_profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();
          
        if (profile?.full_name && data.conflict_details) {
          AutoNotificationService.notifyScheduleConflict(
            user.id,
            profile.full_name,
            data.conflict_details
          );
        }
      } else {
        toast({
          title: 'Success',
          description: 'Class added to your schedule',
        });
      }

      return data;
    } catch (error) {
      console.error('Error adding class schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to add class to schedule',
        variant: 'destructive',
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateSchedule = async (id: string, input: Partial<ClassScheduleInput>) => {
    if (!user) return false;

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('student_class_schedules')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setSchedules(prev => prev.map(s => s.id === id ? data : s));
      
      if (data.has_conflict) {
        toast({
          title: '⚠️ Conflict Detected',
          description: data.conflict_details,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Class schedule updated',
        });
      }

      return true;
    } catch (error) {
      console.error('Error updating class schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update class schedule',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!user) return false;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('student_class_schedules')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSchedules(prev => prev.filter(s => s.id !== id));
      toast({
        title: 'Success',
        description: 'Class removed from schedule',
      });
      return true;
    } catch (error) {
      console.error('Error deleting class schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove class',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const hasConflicts = schedules.some(s => s.has_conflict);
  const conflictCount = schedules.filter(s => s.has_conflict).length;

  // Use user.id as dependency instead of user object to prevent unnecessary refetches
  // when the user object reference changes but the actual user hasn't changed
  useEffect(() => {
    if (user?.id) {
      fetchSchedules();
    }
  }, [user?.id, semester]);

  return {
    schedules,
    loading,
    saving,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    refetch: fetchSchedules,
    hasConflicts,
    conflictCount,
  };
};
