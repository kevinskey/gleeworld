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

        // Remove duplicates by keeping the most recent entry for each position
        const uniqueMembers = boardMembers?.reduce((acc, member) => {
          const existing = acc.find(m => m.position === member.position);
          if (!existing || new Date(member.created_at) > new Date(existing.created_at)) {
            return [...acc.filter(m => m.position !== member.position), member];
          }
          return acc;
        }, [] as typeof boardMembers) || [];

        // Get profile data for each unique member
        const memberProfiles = await Promise.all(
          uniqueMembers.map(async (member) => {
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