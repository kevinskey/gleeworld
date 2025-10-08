import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface GroupInfo {
  group_id: string;
  group_name: string;
  project_topic: string;
  research_focus: string;
  max_members: number;
  member_count: number;
  members?: {
    student_id: string;
    student_name: string;
    role: string;
  }[];
}

export const useStudentGroupInfo = () => {
  const { user } = useAuth();
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroupInfo = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch the student's group membership
        const { data: membership, error: membershipError } = await supabase
          .from('mus240_group_memberships')
          .select('group_id, role')
          .eq('member_id', user.id)
          .limit(1)
          .maybeSingle();

        if (membershipError) throw membershipError;

        if (!membership) {
          setGroupInfo(null);
          return;
        }

        // Fetch group details
        const { data: group, error: groupError } = await supabase
          .from('mus240_project_groups')
          .select('*')
          .eq('id', membership.group_id)
          .single();

        if (groupError) throw groupError;

        // Fetch all group members
        const { data: members, error: membersError } = await supabase
          .from('mus240_group_memberships')
          .select('member_id, role')
          .eq('group_id', membership.group_id);

        if (membersError) throw membersError;

        const groupData: GroupInfo = {
          group_id: group.id,
          group_name: group.name,
          project_topic: group.description || '',
          research_focus: group.description || '',
          max_members: group.max_members,
          member_count: group.member_count,
          members: members?.map((m) => ({
            student_id: m.member_id,
            student_name: 'Member', // We'll fetch names separately if needed
            role: m.role || 'member'
          }))
        };

        setGroupInfo(groupData);
      } catch (err) {
        console.error('Error fetching group info:', err);
        setError('Failed to load group information');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupInfo();
  }, [user]);

  return { groupInfo, loading, error };
};