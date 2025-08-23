import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ExecutiveBoardMember {
  user_id: string;
  position: string;
  full_name: string;
  email: string;
}

export const useExecutiveBoardMembers = () => {
  const [members, setMembers] = useState<ExecutiveBoardMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        
        // Fetch from the actual database table
        const { data: execMembers, error } = await supabase
          .from('gw_executive_board_members')
          .select(`
            user_id,
            position,
            gw_profiles!inner(
              full_name,
              email
            )
          `)
          .eq('is_active', true);

        if (error) {
          console.error('Error fetching exec board members:', error);
          setMembers([]);
          return;
        }

        const formattedMembers = execMembers?.map(member => ({
          user_id: member.user_id || '',
          position: member.position,
          full_name: (member.gw_profiles as any)?.full_name || '',
          email: (member.gw_profiles as any)?.email || ''
        })) || [];

        setMembers(formattedMembers);
      } catch (error) {
        console.error('Error fetching executive board members:', error);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  return { members, loading };
};