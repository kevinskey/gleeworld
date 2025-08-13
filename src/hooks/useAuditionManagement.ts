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
      
      // Fetch real audition data from the correct table
      const { data: auditionData, error } = await supabase
        .from('audition_applications')
        .select(`
          id,
          full_name,
          email,
          audition_time_slot,
          status,
          notes,
          created_at,
          updated_at,
          voice_part_preference,
          academic_year
        `)
        .order('audition_time_slot', { ascending: true });

      if (error) throw error;

      // Transform database data to match our interface
      const transformedAuditions: AuditionEntry[] = auditionData?.map(audition => {
        const auditionDate = audition.audition_time_slot ? new Date(audition.audition_time_slot) : new Date();
        const timeSlot = auditionDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });
        
        return {
          id: audition.id,
          name: audition.full_name,
          timeSlot: timeSlot,
          date: auditionDate.toISOString().split('T')[0],
          type: (audition.voice_part_preference === 'Solo' ? 'Solo Audition' : 'New Member') as AuditionEntry['type'],
          status: audition.status === 'submitted' ? 'Scheduled' : 
                  audition.status === 'confirmed' ? 'Completed' :
                  audition.status === 'cancelled' ? 'Pending' : 'Scheduled',
          notes: audition.notes || 'No additional notes',
          email: audition.email,
          created_at: audition.created_at,
          updated_at: audition.updated_at
        };
      }) || [];

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
      const dbStatus = status === 'Completed' ? 'confirmed' : 
                     status === 'Pending' ? 'submitted' : 'submitted';
      
      const { error } = await supabase
        .from('audition_applications')
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
        .from('audition_applications')
        .update({ notes: notes })
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
      // Create new datetime combining date and time
      const newDateTime = new Date(`${newDate}T${newTime}`);
      
      // Update in database
      const { error } = await supabase
        .from('audition_applications')
        .update({ 
          audition_time_slot: newDateTime.toISOString()
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

  const addAudition = async (auditionData: {
    first_name: string;
    last_name: string;
    email: string;
    audition_date: string;
    audition_time: string;
    status?: 'pending' | 'approved' | 'rejected';
    additional_info?: string;
    is_soloist?: boolean;
    phone?: string;
    user_id?: string;
    personality_description?: string;
  }) => {
    try {
      const insertData = {
        ...auditionData,
        status: auditionData.status || 'pending',
        user_id: auditionData.user_id || '',
        phone: auditionData.phone || '',
        personality_description: auditionData.personality_description || ''
      };

      const { data, error } = await supabase
        .from('gw_auditions')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      // Transform and add to local state
      const newAudition: AuditionEntry = {
        id: data.id,
        name: `${data.first_name} ${data.last_name}`,
        timeSlot: data.audition_time || 'TBD',
        date: new Date(data.audition_date).toISOString().split('T')[0],
        type: data.is_soloist ? 'Solo Audition' : 'New Member',
        status: data.status === 'pending' ? 'Scheduled' : 
                data.status === 'approved' ? 'Completed' :
                data.status === 'rejected' ? 'Pending' : 'Scheduled',
        notes: data.additional_info || 'No additional notes',
        email: data.email,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      setAuditions(prev => [...prev, newAudition]);

      toast({
        title: "Audition Added",
        description: "New audition has been added successfully",
      });

      return newAudition;
    } catch (error) {
      console.error('Error adding audition:', error);
      toast({
        title: "Error",
        description: "Failed to add audition",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteAudition = async (auditionId: string) => {
    try {
      console.log('🗑️ Attempting to delete audition from audition_applications:', auditionId);
      const { error } = await supabase
        .from('audition_applications')
        .delete()
        .eq('id', auditionId);

      console.log('🗑️ Delete operation result:', { error });

      if (error) throw error;

      // Remove from local state
      setAuditions(prev => prev.filter(audition => audition.id !== auditionId));

      toast({
        title: "Audition Deleted",
        description: "Audition has been deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting audition:', error);
      toast({
        title: "Error",
        description: "Failed to delete audition",
        variant: "destructive",
      });
    }
  };

  const updateAudition = async (auditionId: string, updateData: {
    first_name?: string;
    last_name?: string;
    email?: string;
    audition_date?: string;
    audition_time?: string;
    status?: 'pending' | 'approved' | 'rejected';
    additional_info?: string;
    is_soloist?: boolean;
    phone?: string;
    personality_description?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('gw_auditions')
        .update(updateData)
        .eq('id', auditionId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setAuditions(prev => prev.map(audition => {
        if (audition.id === auditionId) {
          return {
            ...audition,
            name: data.first_name && data.last_name ? `${data.first_name} ${data.last_name}` : audition.name,
            timeSlot: data.audition_time || audition.timeSlot,
            date: data.audition_date ? new Date(data.audition_date).toISOString().split('T')[0] : audition.date,
            type: data.is_soloist !== undefined ? (data.is_soloist ? 'Solo Audition' : 'New Member') : audition.type,
            status: data.status ? (data.status === 'pending' ? 'Scheduled' : 
                     data.status === 'approved' ? 'Completed' :
                     data.status === 'rejected' ? 'Pending' : 'Scheduled') : audition.status,
            notes: data.additional_info || audition.notes,
            email: data.email || audition.email,
            updated_at: data.updated_at
          };
        }
        return audition;
      }));

      toast({
        title: "Audition Updated",
        description: "Audition has been updated successfully",
      });

      return data;
    } catch (error) {
      console.error('Error updating audition:', error);
      toast({
        title: "Error",
        description: "Failed to update audition",
        variant: "destructive",
      });
      throw error;
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
    rescheduleAudition,
    addAudition,
    deleteAudition,
    updateAudition
  };
};