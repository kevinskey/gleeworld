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
        console.log('🔍 Fetching executive board members...');
        
        // Get executive board members
        const { data: boardMembers, error: boardError } = await supabase
          .from('gw_executive_board_members')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (boardError) {
          console.error('Error fetching board members:', boardError);
          setMembers([]);
          return;
        }

        console.log('📋 Raw board members:', boardMembers);

        // Remove duplicates by keeping the most recent entry for each position
        const uniqueMembers = boardMembers?.reduce((acc, member) => {
          const existing = acc.find(m => m.position === member.position);
          if (!existing) {
            // If position doesn't exist yet, add it
            return [...acc, member];
          } else {
            // If position exists, keep the one with the latest created_at
            const existingDate = new Date(existing.created_at);
            const currentDate = new Date(member.created_at);
            if (currentDate > existingDate) {
              // Replace with newer entry
              return [...acc.filter(m => m.position !== member.position), member];
            }
            // Keep existing (it's newer)
            return acc;
          }
        }, [] as typeof boardMembers) || [];

        console.log('🎯 Unique members after deduplication:', uniqueMembers);

        // Get profile data for each unique member
        const memberProfiles = await Promise.all(
          uniqueMembers.map(async (member) => {
            const { data: profile } = await supabase
              .from('gw_profiles')
              .select('full_name, email')
              .eq('user_id', member.user_id)
              .maybeSingle();
            
            console.log(`👤 Profile for ${member.position}:`, profile);
            
            return {
              user_id: member.user_id,
              position: member.position,
              full_name: profile?.full_name || 'Unknown',
              email: profile?.email || ''
            };
          })
        );

        console.log('✅ Final member profiles:', memberProfiles);
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