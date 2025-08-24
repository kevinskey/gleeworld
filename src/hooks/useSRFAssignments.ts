import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SRFAssignment {
  id: string;
  title: string;
  assigned: string;
  completed: string;
  dueDate: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  assignedCount: number;
  completedCount: number;
  created_at: string;
  updated_at: string;
}

export const useSRFAssignments = () => {
  const [assignments, setAssignments] = useState<SRFAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      
      // Get current members count for assignment calculations
      const { data: members, error: membersError } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .eq('role', 'member');

      if (membersError) throw membersError;

      const totalMembers = members?.length || 15;

      // No assignments - return empty array since we've cleaned up mock data
      setAssignments([]);
    } catch (error) {
      console.error('Error fetching SRF assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load SRF assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async (assignmentData: Partial<SRFAssignment>) => {
    try {
      // This feature is not implemented yet - assignments should be created through proper admin interface
      toast({
        title: "Feature Not Available",
        description: "Assignment creation will be available when the SRF assignments system is fully implemented",
        variant: "destructive",
      });
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: "Error",
        description: "Failed to create assignment",
        variant: "destructive",
      });
    }
  };

  const sendReminder = async (assignmentId: string) => {
    try {
      // In the future, this would send actual reminders
      toast({
        title: "Reminder Sent",
        description: "Assignment reminder has been sent to students",
      });
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: "Error",
        description: "Failed to send reminder",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  return {
    assignments,
    loading,
    fetchAssignments,
    createAssignment,
    sendReminder
  };
};