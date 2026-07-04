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
      const groupsRes = await supabase
        .from('gw_message_groups')
        .select('id, name, group_type, created_at')
        .neq('group_type', 'direct');

      if (groupsRes.error) throw groupsRes.error;

      const groupIds = (groupsRes.data ?? []).map((group) => group.id);

      // gw_group_members (like gw_message_groups) has no tenant_id column and
      // its RLS policy currently lets any authenticated user read every row
      // across every tenant. Until a platform migration adds tenant scoping
      // to these tables, we bound this query to only the group ids we just
      // fetched (`.in('group_id', groupIds)`) instead of selecting the whole
      // table, and skip the query entirely when there are no groups. This
      // does not fix the RLS gap — the groups themselves are still
      // tenant-filtered downstream in PeopleHub (see GroupsList) by
      // cross-referencing member ids against the tenant-scoped people
      // directory.
      const membersRes = groupIds.length
        ? await supabase.from('gw_group_members').select('group_id, user_id').in('group_id', groupIds)
        : { data: [], error: null };

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
