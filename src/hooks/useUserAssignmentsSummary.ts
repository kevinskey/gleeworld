import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AssignmentSummary {
  total: number;
  completed: number;
  incomplete: number;
  overdue: number;
}

export const useUserAssignmentsSummary = () => {
  const [summary, setSummary] = useState<AssignmentSummary>({
    total: 0,
    completed: 0,
    incomplete: 0,
    overdue: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchAssignmentsSummary = async () => {
      try {
        setLoading(true);

        // Fetch sight reading assignments where the user is the target
        const { data: assignments, error } = await supabase
          .from('gw_sight_reading_assignments')
          .select('id, due_date, is_active, created_at')
          .eq('target_value', user.id);

        if (error) {
          console.error('Error fetching assignments:', error);
          return;
        }

        const now = new Date();
        let completed = 0;
        let overdue = 0;
        let incomplete = 0;

        (assignments || []).forEach(assignment => {
          if (!assignment.is_active) {
            completed++;
          } else {
            const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
            if (dueDate && now > dueDate) {
              overdue++;
            } else {
              incomplete++;
            }
          }
        });

        setSummary({
          total: assignments?.length || 0,
          completed,
          incomplete,
          overdue
        });
      } catch (error) {
        console.error('Error fetching assignments summary:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignmentsSummary();
  }, [user]);

  return { summary, loading };
};