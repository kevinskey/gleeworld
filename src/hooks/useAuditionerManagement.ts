import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AuditionerProfile {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  audition_application?: {
    id: string;
    status: string;
    audition_time_slot: string;
    academic_year: string;
    voice_part_preference: string;
  };
}

export const useAuditionerManagement = () => {
  const { user } = useAuth();
  const [auditioners, setAuditioners] = useState<AuditionerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAuditioners = async () => {
    if (!user) return;

    try {
      // Get all users with "auditioner" role
      const { data: profiles, error: profilesError } = await supabase
        .from('gw_profiles')
        .select(`
          user_id,
          email,
          full_name,
          role,
          created_at
        `)
        .eq('role', 'auditioner');

      if (profilesError) throw profilesError;

      // Get their audition applications
      const userIds = profiles?.map(p => p.user_id) || [];
      const { data: applications, error: applicationsError } = await supabase
        .from('audition_applications')
        .select(`
          id,
          user_id,
          status,
          audition_time_slot,
          academic_year,
          voice_part_preference
        `)
        .in('user_id', userIds);

      if (applicationsError) throw applicationsError;

      // Combine data
      const combinedData = profiles?.map(profile => ({
        ...profile,
        audition_application: applications?.find(app => app.user_id === profile.user_id)
      })) || [];

      setAuditioners(combinedData);
    } catch (error) {
      console.error('Error fetching auditioners:', error);
      toast.error('Failed to load auditioners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditioners();
  }, [user]);

  return {
    auditioners,
    loading,
    refetch: fetchAuditioners
  };
};