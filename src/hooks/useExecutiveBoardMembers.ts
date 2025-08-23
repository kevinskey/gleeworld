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
        
        // Get executive board members with their profile data
        const { data: execMembers, error } = await supabase
          .from('executive_board_members')
          .select(`
            user_id,
            position,
            profiles:user_id (
              full_name,
              email
            )
          `)
          .eq('is_active', true);

        if (error) throw error;

        const formattedMembers = execMembers?.map(member => ({
          user_id: member.user_id,
          position: member.position,
          full_name: member.profiles?.full_name || '',
          email: member.profiles?.email || ''
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