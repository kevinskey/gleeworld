import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AuditionLog {
  id: string;
  user_id?: string;
  audition_id?: string;
  applicant_name: string;
  applicant_email: string;
  audition_date: string;
  audition_time: string;
  voice_part?: string;
  application_data: any;
  grade_data: any;
  status: 'scheduled' | 'completed' | 'graded' | 'no_show';
  graded_by?: string;
  graded_at?: string;
  notes?: string;
  is_reviewed: boolean;
  created_at: string;
  updated_at: string;
}

export const useAuditionLogs = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditionLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAuditionLogs = async () => {
    try {
      setLoading(true);
      
      // First, check if there are any logs in the new table
      const { data: existingLogs, error: logsError } = await supabase
        .from('gw_audition_logs')
        .select('*')
        .order('audition_date', { ascending: false });

      if (logsError) throw logsError;

      // If no logs exist, try to migrate from the existing gw_auditions table
      if (!existingLogs || existingLogs.length === 0) {
        await migrateExistingAuditions();
        
        // Fetch again after migration
        const { data: newLogs, error: newLogsError } = await supabase
          .from('gw_audition_logs')
          .select('*')
          .order('audition_date', { ascending: false });

        if (newLogsError) throw newLogsError;
        setLogs((newLogs || []) as AuditionLog[]);
      } else {
        setLogs(existingLogs as AuditionLog[]);
      }
    } catch (error) {
      console.error('Error loading audition logs:', error);
      toast({
        title: "Error",
        description: "Failed to load audition logs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const migrateExistingAuditions = async () => {
    try {
      // Check if gw_auditions table exists and has data
      const { data: existingAuditions, error: auditionsError } = await supabase
        .from('gw_auditions')
        .select('*');

      if (auditionsError) {
        console.log('No existing auditions to migrate:', auditionsError);
        return;
      }

      if (existingAuditions && existingAuditions.length > 0) {
        // Transform the existing audition data to match our new structure
        const logsToInsert = existingAuditions.map((audition: any) => ({
          audition_id: audition.id,
          applicant_name: `${audition.first_name} ${audition.last_name}`,
          applicant_email: audition.email,
          audition_date: audition.audition_date.split('T')[0], // Extract date part
          audition_time: audition.audition_time || '09:00',
          voice_part: audition.voice_part,
          application_data: {
            first_name: audition.first_name,
            last_name: audition.last_name,
            phone_number: audition.phone_number,
            additional_info: audition.additional_info,
            is_soloist: audition.is_soloist,
            status: audition.status
          },
          grade_data: {},
          status: audition.status === 'approved' ? 'graded' : 
                 audition.status === 'pending' ? 'scheduled' : 'completed',
          notes: audition.additional_info,
          is_reviewed: audition.status !== 'pending',
          user_id: audition.user_id
        }));

        // Insert the migrated data
        const { error: insertError } = await supabase
          .from('gw_audition_logs')
          .insert(logsToInsert);

        if (insertError) {
          console.error('Error migrating auditions:', insertError);
        } else {
          console.log(`Successfully migrated ${logsToInsert.length} auditions`);
        }
      }
    } catch (error) {
      console.error('Error during migration:', error);
    }
  };

  const updateLogStatus = async (logId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('gw_audition_logs')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', logId);

      if (error) throw error;
      
      await loadAuditionLogs();
      toast({
        title: "Success",
        description: "Status updated successfully"
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const saveGradeData = async (logId: string, gradeData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('gw_audition_logs')
        .update({
          grade_data: gradeData,
          status: 'graded',
          graded_by: user?.id,
          graded_at: new Date().toISOString(),
          is_reviewed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', logId);

      if (error) throw error;

      await loadAuditionLogs();
      toast({
        title: "Success",
        description: "Audition graded successfully"
      });
    } catch (error) {
      console.error('Error saving grade:', error);
      toast({
        title: "Error",
        description: "Failed to save grade",
        variant: "destructive"
      });
    }
  };

  const addSampleData = async () => {
    try {
      const sampleLogs = [
        {
          applicant_name: "Sarah Johnson",
          applicant_email: "sarah.johnson@spelman.edu",
          audition_date: "2025-02-15",
          audition_time: "10:00",
          voice_part: "Soprano 1",
          application_data: {
            first_name: "Sarah",
            last_name: "Johnson",
            phone_number: "404-555-0123",
            additional_info: "I have been singing in my church choir for 5 years and was the lead soprano in my high school musical.",
            is_soloist: true,
            class_year: "Sophomore",
            major: "Music Education"
          },
          grade_data: {},
          status: "scheduled",
          notes: "Strong vocal background, church choir experience",
          is_reviewed: false
        },
        {
          applicant_name: "Maya Patel",
          applicant_email: "maya.patel@spelman.edu",
          audition_date: "2025-02-15",
          audition_time: "10:15",
          voice_part: "Alto 2",
          application_data: {
            first_name: "Maya",
            last_name: "Patel",
            phone_number: "678-555-0456",
            additional_info: "New to formal choir but passionate about music. Quick learner.",
            is_soloist: false,
            class_year: "Freshman",
            major: "Psychology"
          },
          grade_data: {},
          status: "completed",
          notes: "Eager to learn, good pitch recognition",
          is_reviewed: false
        },
        {
          applicant_name: "Zoe Williams",
          applicant_email: "zoe.williams@spelman.edu",
          audition_date: "2025-02-15",
          audition_time: "10:30",
          voice_part: "Soprano 2",
          application_data: {
            first_name: "Zoe",
            last_name: "Williams",
            phone_number: "470-555-0789",
            additional_info: "Former member of Atlanta Youth Choir. Love to perform.",
            is_soloist: true,
            class_year: "Junior",
            major: "English"
          },
          grade_data: {
            vocal_score: "8",
            musicality_score: "9",
            stage_presence_score: "8",
            overall_score: "8",
            feedback: "Excellent vocal technique and stage presence. Strong addition to the ensemble.",
            recommendation: "accept"
          },
          status: "graded",
          notes: "Outstanding audition, clear accept",
          is_reviewed: true,
          graded_at: new Date().toISOString()
        }
      ];

      const { error } = await supabase
        .from('gw_audition_logs')
        .insert(sampleLogs);

      if (error) throw error;

      await loadAuditionLogs();
      toast({
        title: "Success",
        description: "Sample audition logs added successfully"
      });
    } catch (error) {
      console.error('Error adding sample data:', error);
      toast({
        title: "Error",
        description: "Failed to add sample data",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadAuditionLogs();
  }, []);

  const deleteAuditionLog = async (logId: string) => {
    try {
      const { error } = await supabase
        .from('gw_audition_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
      
      // Reload logs after deletion
      await loadAuditionLogs();
      toast({
        title: "Success",
        description: "Audition log deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting audition log:', error);
      toast({
        title: "Error",
        description: "Failed to delete audition log",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    logs,
    loading,
    updateLogStatus,
    saveGradeData,
    addSampleData,
    deleteAuditionLog
  };
};