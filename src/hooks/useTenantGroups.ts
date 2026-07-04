// Tenant groups — non-direct messaging groups (gw_message_groups), surfaced in
// the People hub's Groups tab. Membership is resolved client-side from
// gw_group_members so the same group list can drive both the roster count
// and the inline member expansion.
// Spec: docs/superpowers/plans/2026-07-04-contacts-groups.md Task 5
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TenantGroup {
  id: string;
  name: string;
  group_type: string;
  member_count: number;
  member_ids: string[];
}

const FALLBACK_NAME = 'Untitled group';

export function useTenantGroups(): { data: TenantGroup[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['tenant-groups'],
    queryFn: async (): Promise<TenantGroup[]> => {
      const [groupsRes, membersRes] = await Promise.all([
        supabase
          .from('gw_message_groups')
          .select('id, name, group_type, created_at')
          .neq('group_type', 'direct'),
        supabase.from('gw_group_members').select('group_id, user_id'),
      ]);

      if (groupsRes.error) throw groupsRes.error;
      if (membersRes.error) throw membersRes.error;

      const membersByGroup = new Map<string, string[]>();
      for (const row of membersRes.data ?? []) {
        if (!row.group_id || !row.user_id) continue;
        const bucket = membersByGroup.get(row.group_id) ?? [];
        bucket.push(row.user_id);
        membersByGroup.set(row.group_id, bucket);
      }

      return (groupsRes.data ?? [])
        .map((group) => {
          const memberIds = membersByGroup.get(group.id) ?? [];
          return {
            id: group.id,
            name: group.name?.trim() || FALLBACK_NAME,
            group_type: group.group_type,
            member_count: memberIds.length,
            member_ids: memberIds,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 60 * 1000,
  });

  return { data: data ?? [], isLoading };
}
