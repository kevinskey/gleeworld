import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const CreateTourGroupButton = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [existingGroupId, setExistingGroupId] = useState<string | null>(null);

  useEffect(() => {
    const checkExisting = async () => {
      const { data } = await supabase
        .from('gw_message_groups')
        .select('id')
        .eq('name', 'Tour Group')
        .eq('group_type', 'general')
        .maybeSingle();
      if (data) setExistingGroupId(data.id);
    };
    checkExisting();
  }, []);

  const handleCreateOrSync = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Fetch confirmed roster members
      const { data: roster, error: rosterError } = await supabase
        .from('gw_tour_roster')
        .select('user_id')
        .eq('status', 'confirmed');

      if (rosterError) throw rosterError;
      if (!roster || roster.length === 0) {
        toast.error('No confirmed members on the tour roster');
        setLoading(false);
        return;
      }

      const rosterUserIds = roster.map(r => r.user_id);

      let groupId = existingGroupId;

      // 2. Create group if it doesn't exist
      if (!groupId) {
        const { data: newGroup, error: createError } = await supabase
          .from('gw_message_groups')
          .insert({
            name: 'Tour Group',
            description: 'Tour roster messaging group',
            group_type: 'general',
            created_by: user.id,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        groupId = newGroup.id;
        setExistingGroupId(groupId);
      }

      // 3. Get existing members
      const { data: existingMembers } = await supabase
        .from('gw_group_members')
        .select('user_id')
        .eq('group_id', groupId);

      const existingIds = new Set((existingMembers || []).map(m => m.user_id));

      // 4. Build member rows to insert (skip existing)
      const newMembers = rosterUserIds
        .filter(uid => !existingIds.has(uid))
        .map(uid => ({
          group_id: groupId!,
          user_id: uid,
          role: uid === user.id ? 'admin' : 'member',
        }));

      // Ensure creator is admin
      if (!existingIds.has(user.id) && !rosterUserIds.includes(user.id)) {
        newMembers.push({
          group_id: groupId!,
          user_id: user.id,
          role: 'admin',
        });
      }

      if (newMembers.length > 0) {
        const { error: insertError } = await supabase
          .from('gw_group_members')
          .insert(newMembers);

        if (insertError) throw insertError;
      }

      // 5. Remove members no longer on roster (except creator)
      const rosterSet = new Set(rosterUserIds);
      const toRemove = (existingMembers || [])
        .filter(m => !rosterSet.has(m.user_id) && m.user_id !== user.id)
        .map(m => m.user_id);

      if (toRemove.length > 0) {
        await supabase
          .from('gw_group_members')
          .delete()
          .eq('group_id', groupId!)
          .in('user_id', toRemove);
      }

      toast.success(
        existingGroupId
          ? `Tour Group synced — ${rosterUserIds.length} roster members`
          : `Tour Group created with ${rosterUserIds.length} members`
      );
    } catch (error: any) {
      console.error('Error creating/syncing tour group:', error);
      toast.error(error.message || 'Failed to create tour group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-xs gap-1.5"
      onClick={handleCreateOrSync}
      disabled={loading}
    >
      {existingGroupId ? (
        <>
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Sync Tour Group
        </>
      ) : (
        <>
          <MessageSquarePlus className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Create Tour Group
        </>
      )}
    </Button>
  );
};
