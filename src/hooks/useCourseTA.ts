import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CourseTA {
  id: string;
  user_id: string;
  course_code: string;
  assigned_by: string | null;
  assigned_at: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useCourseTA = (courseCode: string = 'MUS240') => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isTA, setIsTA] = useState(false);
  const [loading, setLoading] = useState(true);
  const [taAssignment, setTaAssignment] = useState<CourseTA | null>(null);

  useEffect(() => {
    const checkTAStatus = async () => {
      if (!user) {
        setIsTA(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('course_teaching_assistants')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_code', courseCode)
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          console.error('Error checking TA status:', error);
          setIsTA(false);
        } else {
          setIsTA(!!data);
          setTaAssignment(data);
        }
      } catch (error) {
        console.error('Exception checking TA status:', error);
        setIsTA(false);
      } finally {
        setLoading(false);
      }
    };

    checkTAStatus();
  }, [user, courseCode]);

  const assignTA = async (userId: string, notes?: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to assign TAs',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('course_teaching_assistants')
        .insert({
          user_id: userId,
          course_code: courseCode,
          assigned_by: user.id,
          notes: notes || null,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'TA assigned successfully',
      });
      return true;
    } catch (error: any) {
      console.error('Error assigning TA:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign TA',
        variant: 'destructive',
      });
      return false;
    }
  };

  const removeTA = async (userId: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to remove TAs',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('course_teaching_assistants')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('course_code', courseCode);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'TA removed successfully',
      });
      return true;
    } catch (error: any) {
      console.error('Error removing TA:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove TA',
        variant: 'destructive',
      });
      return false;
    }
  };

  const getAllTAs = async () => {
    try {
      const { data, error } = await supabase
        .from('course_teaching_assistants')
        .select(`
          *,
          user:user_id (
            email
          )
        `)
        .eq('course_code', courseCode)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching TAs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch TAs',
        variant: 'destructive',
      });
      return [];
    }
  };

  return {
    isTA,
    loading,
    taAssignment,
    assignTA,
    removeTA,
    getAllTAs,
  };
};
