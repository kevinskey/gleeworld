import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CourseGroup {
  id: string;
  course_id: string;
  name: string;
  description: string | null;
  group_type: string;
  leader_id: string | null;
  leader_name?: string | null;
  max_members: number | null;
  semester: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface CourseGroupMember {
  id: string;
  group_id: string;
  member_id: string;
  role: 'leader' | 'member';
  joined_at: string;
  full_name?: string | null;
  email?: string | null;
  voice_part?: string | null;
}

export function useCourseGroups(courseId: string | undefined) {
  const [groups, setGroups] = useState<CourseGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    if (!courseId) {
      setGroups([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: groupRows, error: gErr } = await supabase
        .from('gw_course_groups')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (gErr) throw gErr;

      const ids = (groupRows || []).map((g) => g.id);
      const leaderIds = (groupRows || []).map((g) => g.leader_id).filter(Boolean) as string[];

      const counts: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: memberRows } = await supabase
          .from('gw_course_group_memberships')
          .select('group_id')
          .in('group_id', ids);
        (memberRows || []).forEach((m: any) => {
          counts[m.group_id] = (counts[m.group_id] || 0) + 1;
        });
      }

      const leaders: Record<string, string> = {};
      if (leaderIds.length > 0) {
        const { data: leaderRows } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, email')
          .in('user_id', leaderIds);
        (leaderRows || []).forEach((l: any) => {
          leaders[l.user_id] = l.full_name || l.email || 'Unnamed';
        });
      }

      setGroups(
        (groupRows || []).map((g: any) => ({
          ...g,
          member_count: counts[g.id] || 0,
          leader_name: g.leader_id ? leaders[g.leader_id] || null : null,
        }))
      );
    } catch (e: any) {
      console.error('useCourseGroups fetch error', e);
      setError(e.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = async (payload: {
    name: string;
    description?: string | null;
    group_type?: string;
    leader_id?: string | null;
    max_members?: number | null;
    semester?: string | null;
  }) => {
    if (!courseId) return null;
    const { data, error } = await supabase
      .from('gw_course_groups')
      .insert({
        course_id: courseId,
        name: payload.name,
        description: payload.description || null,
        group_type: payload.group_type || 'sectional',
        leader_id: payload.leader_id || null,
        max_members: payload.max_members ?? null,
        semester: payload.semester || null,
      })
      .select()
      .maybeSingle();
    if (error) {
      toast.error(`Failed to create group: ${error.message}`);
      return null;
    }
    toast.success(`Group "${payload.name}" created`);
    await fetchGroups();
    return data;
  };

  const updateGroup = async (id: string, patch: Partial<CourseGroup>) => {
    const { error } = await supabase
      .from('gw_course_groups')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast.error(`Failed to update group: ${error.message}`);
      return false;
    }
    toast.success('Group updated');
    await fetchGroups();
    return true;
  };

  const deleteGroup = async (id: string) => {
    const { error } = await supabase.from('gw_course_groups').delete().eq('id', id);
    if (error) {
      toast.error(`Failed to delete group: ${error.message}`);
      return false;
    }
    toast.success('Group deleted');
    await fetchGroups();
    return true;
  };

  return {
    groups,
    loading,
    error,
    refetch: fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
  };
}

export function useCourseGroupMembers(groupId: string | undefined) {
  const [members, setMembers] = useState<CourseGroupMember[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!groupId) {
      setMembers([]);
      return;
    }
    setLoading(true);
    try {
      const { data: memberRows, error } = await supabase
        .from('gw_course_group_memberships')
        .select('*')
        .eq('group_id', groupId)
        .order('role', { ascending: true });
      if (error) throw error;

      const memberIds = (memberRows || []).map((m) => m.member_id);
      let profiles: Record<string, { full_name: string | null; email: string | null; voice_part: string | null }> = {};
      if (memberIds.length > 0) {
        const { data: profileRows } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, email, voice_part')
          .in('user_id', memberIds);
        (profileRows || []).forEach((p: any) => {
          profiles[p.user_id] = {
            full_name: p.full_name,
            email: p.email,
            voice_part: p.voice_part,
          };
        });
      }

      setMembers(
        (memberRows || []).map((m: any) => ({
          ...m,
          full_name: profiles[m.member_id]?.full_name || null,
          email: profiles[m.member_id]?.email || null,
          voice_part: profiles[m.member_id]?.voice_part || null,
        }))
      );
    } catch (e: any) {
      console.error('useCourseGroupMembers fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const addMember = async (memberId: string, role: 'leader' | 'member' = 'member') => {
    if (!groupId) return false;
    const { error } = await supabase
      .from('gw_course_group_memberships')
      .insert({ group_id: groupId, member_id: memberId, role });
    if (error) {
      toast.error(`Failed to add member: ${error.message}`);
      return false;
    }
    toast.success('Member added');
    await fetchMembers();
    return true;
  };

  const removeMember = async (membershipId: string) => {
    const { error } = await supabase
      .from('gw_course_group_memberships')
      .delete()
      .eq('id', membershipId);
    if (error) {
      toast.error(`Failed to remove member: ${error.message}`);
      return false;
    }
    toast.success('Member removed');
    await fetchMembers();
    return true;
  };

  const setMemberRole = async (membershipId: string, role: 'leader' | 'member') => {
    const { error } = await supabase
      .from('gw_course_group_memberships')
      .update({ role })
      .eq('id', membershipId);
    if (error) {
      toast.error(`Failed to update role: ${error.message}`);
      return false;
    }
    await fetchMembers();
    return true;
  };

  return {
    members,
    loading,
    refetch: fetchMembers,
    addMember,
    removeMember,
    setMemberRole,
  };
}
