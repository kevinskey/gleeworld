import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AuditionEntry {
  id: string;
  name: string;
  timeSlot: string;
  date: string;
  type: 'New Member' | 'Solo Audition' | 'Callback';
  status: 'Scheduled' | 'Callback' | 'Pending' | 'Completed';
  notes: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export const useAuditionManagement = () => {
  const [auditions, setAuditions] = useState<AuditionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAuditions = async () => {
    try {
      setLoading(true);
      
      // Fetch real audition data from the database
      const { data: auditionData, error } = await supabase
        .from('gw_auditions')
        .select(`
          id,
          first_name,
          last_name,
          email,
          audition_date,
          audition_time,
          status,
          additional_info,
          interested_in_leadership,
          is_soloist,
          created_at,
          updated_at
        `)
        .order('audition_date', { ascending: true });

      if (error) throw error;

      // Transform database data to match our interface
      const transformedAuditions: AuditionEntry[] = auditionData?.map(audition => ({
        id: audition.id,
        name: `${audition.first_name} ${audition.last_name}`,
        timeSlot: audition.audition_time || 'TBD',
        date: new Date(audition.audition_date).toISOString().split('T')[0],
        type: audition.is_soloist ? 'Solo Audition' : 'New Member',
        status: audition.status === 'pending' ? 'Scheduled' : 
                audition.status === 'approved' ? 'Completed' :
                audition.status === 'rejected' ? 'Pending' : 'Scheduled',
        notes: audition.additional_info || 'No additional notes',
        email: audition.email,
        created_at: audition.created_at,
        updated_at: audition.updated_at
      })) || [];

      setAuditions(transformedAuditions);
    } catch (error) {
      console.error('Error fetching auditions:', error);
      toast({
        title: "Error",
        description: "Failed to load audition data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAuditionStatus = async (auditionId: string, status: AuditionEntry['status']) => {
    try {
      // Update in database
      const dbStatus = status === 'Completed' ? 'approved' : 
                     status === 'Pending' ? 'rejected' : 'pending';
      
      const { error } = await supabase
        .from('gw_auditions')
        .update({ status: dbStatus })
        .eq('id', auditionId);

      if (error) throw error;

      // Update local state
      setAuditions(prev => prev.map(audition => 
        audition.id === auditionId ? { ...audition, status } : audition
      ));

      toast({
        title: "Status Updated",
        description: `Audition status changed to ${status}`,
      });
    } catch (error) {
      console.error('Error updating audition status:', error);
      toast({
        title: "Error",
        description: "Failed to update audition status",
        variant: "destructive",
      });
    }
  };

  const addNotes = async (auditionId: string, notes: string) => {
    try {
      // Update in database
      const { error } = await supabase
        .from('gw_auditions')
        .update({ additional_info: notes })
        .eq('id', auditionId);

      if (error) throw error;

      // Update local state
      setAuditions(prev => prev.map(audition => 
        audition.id === auditionId ? { ...audition, notes } : audition
      ));

      toast({
        title: "Notes Updated",
        description: "Audition notes have been saved",
      });
    } catch (error) {
      console.error('Error updating notes:', error);
      toast({
        title: "Error",
        description: "Failed to update notes",
        variant: "destructive",
      });
    }
  };

  const rescheduleAudition = async (auditionId: string, newDate: string, newTime: string) => {
    try {
      // Update in database
      const { error } = await supabase
        .from('gw_auditions')
        .update({ 
          audition_date: new Date(newDate).toISOString(),
          audition_time: newTime
        })
        .eq('id', auditionId);

      if (error) throw error;

      // Update local state
      setAuditions(prev => prev.map(audition => 
        audition.id === auditionId ? { 
          ...audition, 
          date: newDate,
          timeSlot: newTime 
        } : audition
      ));

      toast({
        title: "Audition Rescheduled",
        description: "Audition has been rescheduled successfully",
      });
    } catch (error) {
      console.error('Error rescheduling audition:', error);
      toast({
        title: "Error",
        description: "Failed to reschedule audition",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAuditions();
  }, []);

  return {
    auditions,
    loading,
    fetchAuditions,
    updateAuditionStatus,
    addNotes,
    rescheduleAudition
  };
};