import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const TOUR_GROUP_NAME = 'Tour 26';
const TOUR_GROUP_DESCRIPTION = 'Confirmed Tour 26 roster messenger group';

export const CreateTourGroupButton = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [existingGroupId, setExistingGroupId] = useState<string | null>(null);

  const loadExistingGroup = useCallback(async () => {
    const { data, error } = await supabase
      .from('messenger_groups' as any)
      .select('id')
      .eq('name', TOUR_GROUP_NAME)
      .maybeSingle();

    if (error) {
      console.error('Error loading Tour 26 messenger group:', error);
      return null;
    }

    const groupId = data?.id ?? null;
    setExistingGroupId(groupId);
    return groupId;
  }, []);

  useEffect(() => {
    loadExistingGroup();
  }, [loadExistingGroup]);

  const syncMemberCount = async (groupId: string) => {
    const { count, error } = await supabase
      .from('messenger_group_members' as any)
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId);

    if (error) {
      console.error('Error counting Tour 26 members:', error);
      return;
    }

    if (typeof count === 'number') {
      const { error: updateError } = await supabase
        .from('messenger_groups' as any)
        .update({ member_count: count })
        .eq('id', groupId);

      if (updateError) {
        console.error('Error updating Tour 26 member count:', updateError);
      }
    }
  };

  const handleCreateOrSync = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: roster, error: rosterError } = await supabase
        .from('gw_tour_roster')
        .select('user_id')
        .eq('status', 'confirmed');

      if (rosterError) throw rosterError;

      const rosterUserIds = Array.from(
        new Set((roster || []).map((member) => member.user_id).filter(Boolean)),
      );

      if (rosterUserIds.length === 0) {
        toast.error('No confirmed members on the tour roster');
        return;
      }

      let groupId = existingGroupId ?? (await loadExistingGroup());
      const groupAlreadyExists = Boolean(groupId);

      if (!groupId) {
        const { data: newGroup, error: createError } = await supabase
          .from('messenger_groups' as any)
          .insert({
            name: TOUR_GROUP_NAME,
            description: TOUR_GROUP_DESCRIPTION,
            is_active: true,
            member_count: 0,
            created_by: user.id,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        groupId = newGroup.id;
        setExistingGroupId(groupId);
      }

      const { data: existingMembers, error: membersError } = await supabase
        .from('messenger_group_members' as any)
        .select('id, user_id, role')
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      const existingIds = new Set((existingMembers || []).map((member: any) => member.user_id));
      const newMembers = rosterUserIds
        .filter((userId) => !existingIds.has(userId))
        .map((userId) => ({
          group_id: groupId,
          user_id: userId,
          role: userId === user.id ? 'admin' : 'member',
        }));

      if (!existingIds.has(user.id) && !rosterUserIds.includes(user.id)) {
        newMembers.push({
          group_id: groupId,
          user_id: user.id,
          role: 'admin',
        });
      }

      if (newMembers.length > 0) {
        const { error: insertError } = await supabase
          .from('messenger_group_members' as any)
          .insert(newMembers);

        if (insertError) throw insertError;
      }

      const creatorMembership = (existingMembers || []).find((member: any) => member.user_id === user.id);
      if (creatorMembership && creatorMembership.role !== 'admin') {
        const { error: promoteError } = await supabase
          .from('messenger_group_members' as any)
          .update({ role: 'admin' })
          .eq('id', creatorMembership.id);

        if (promoteError) throw promoteError;
      }

      const rosterSet = new Set(rosterUserIds);
      const membersToRemove = (existingMembers || [])
        .filter((member: any) => !rosterSet.has(member.user_id) && member.user_id !== user.id)
        .map((member: any) => member.id);

      if (membersToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('messenger_group_members' as any)
          .delete()
          .in('id', membersToRemove);

        if (removeError) throw removeError;
      }

      await syncMemberCount(groupId);
      toast.success(
        groupAlreadyExists
          ? `Tour 26 synced with ${rosterUserIds.length} confirmed roster members`
          : `Tour 26 created with ${rosterUserIds.length} confirmed roster members`,
      );
    } catch (error: any) {
      console.error('Error creating/syncing Tour 26 messenger group:', error);
      toast.error(error.message || 'Failed to sync Tour 26 messenger group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 text-xs"
      onClick={handleCreateOrSync}
      disabled={loading}
    >
      {existingGroupId ? (
        <>
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Sync Tour 26
        </>
      ) : (
        <>
          <MessageSquarePlus className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Create Tour 26
        </>
      )}
    </Button>
  );
};
