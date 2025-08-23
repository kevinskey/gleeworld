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
        
        // Get executive board members
        const { data: boardMembers, error: boardError } = await supabase
          .from('gw_executive_board_members')
          .select('*')
          .eq('is_active', true);
        
        if (boardError) {
          console.error('Error fetching board members:', boardError);
          setMembers([]);
          return;
        }

        // Get profile data for each member
        const memberProfiles = await Promise.all(
          (boardMembers || []).map(async (member) => {
            const { data: profile } = await supabase
              .from('gw_profiles')
              .select('full_name, email')
              .eq('user_id', member.user_id)
              .maybeSingle();
            
            return {
              user_id: member.user_id,
              position: member.position,
              full_name: profile?.full_name || '',
              email: profile?.email || ''
            };
          })
        );

        setMembers(memberProfiles);
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