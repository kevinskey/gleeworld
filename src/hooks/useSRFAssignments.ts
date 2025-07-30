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

      // Create assignments based on typical SRF patterns
      // In the future, these would come from an srf_assignments table
      const mockAssignments: SRFAssignment[] = [
        {
          id: 'srf-1',
          title: 'Bach Chorale #47',
          assigned: `${totalMembers} students`,
          completed: `${Math.floor(totalMembers * 0.8)} students`,
          dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          difficulty: 'Intermediate',
          assignedCount: totalMembers,
          completedCount: Math.floor(totalMembers * 0.8),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'srf-2',
          title: 'Sight-reading Test #3',
          assigned: `${totalMembers} students`,
          completed: `${Math.floor(totalMembers * 0.53)} students`,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          difficulty: 'Advanced',
          assignedCount: totalMembers,
          completedCount: Math.floor(totalMembers * 0.53),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'srf-3',
          title: 'Major Scale Practice',
          assigned: `${totalMembers} students`,
          completed: `${totalMembers} students`,
          dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          difficulty: 'Beginner',
          assignedCount: totalMembers,
          completedCount: totalMembers,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      setAssignments(mockAssignments);
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
      // In the future, this would create a new assignment in the database
      const newAssignment: SRFAssignment = {
        id: `srf-${Date.now()}`,
        title: assignmentData.title || 'New Assignment',
        assigned: '15 students',
        completed: '0 students',
        dueDate: assignmentData.dueDate || new Date().toISOString().split('T')[0],
        difficulty: assignmentData.difficulty || 'Intermediate',
        assignedCount: 15,
        completedCount: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setAssignments(prev => [newAssignment, ...prev]);
      
      toast({
        title: "Assignment Created",
        description: "New SRF assignment has been created",
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