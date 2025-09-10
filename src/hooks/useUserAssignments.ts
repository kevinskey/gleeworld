import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Assignment {
  id: string;
  title: string;
  due_date: string | null;
  is_active: boolean;
  created_at: string;
  description?: string;
}

interface AssignmentLists {
  due: Assignment[];
  completed: Assignment[];
}

export const useUserAssignments = () => {
  const [assignments, setAssignments] = useState<AssignmentLists>({
    due: [],
    completed: []
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchAssignments = async () => {
      try {
        setLoading(true);

        // Fetch sight reading assignments where the user is the target
        const { data: assignmentData, error } = await supabase
          .from('gw_sight_reading_assignments')
          .select('id, title, due_date, is_active, created_at, description')
          .eq('target_value', user.id)
          .order('due_date', { ascending: true });

        if (error) {
          console.error('Error fetching assignments:', error);
          return;
        }

        const now = new Date();
        const due: Assignment[] = [];
        const completed: Assignment[] = [];

        (assignmentData || []).forEach(assignment => {
          if (!assignment.is_active) {
            completed.push(assignment);
          } else {
            due.push(assignment);
          }
        });

        setAssignments({ due, completed });
      } catch (error) {
        console.error('Error fetching assignments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [user]);

  return { assignments, loading };
};