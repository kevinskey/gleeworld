import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ModuleGrant } from '@/lib/authz';

export function useUserModuleGrants(userId?: string) {
  const [grants, setGrants] = useState<ModuleGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchGrants() {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔧 useUserModuleGrants: fetchGrants called with userId:', userId);

        // If no userId, try to get current user
        let targetUserId = userId;
        if (!targetUserId) {
          const { data: { user } } = await supabase.auth.getUser();
          targetUserId = user?.id;
          console.log('🔧 useUserModuleGrants: Got current user ID:', targetUserId);
        }

        if (!targetUserId) {
          console.log('🔧 useUserModuleGrants: No user ID available, returning empty grants');
          setGrants([]);
          setLoading(false);
          return;
        }

        // First check if user is admin/super-admin
        const { data: profileData } = await supabase
          .from('gw_profiles')
          .select('is_admin, is_super_admin, role')
          .eq('user_id', targetUserId)
          .single();

        console.log('🔧 useUserModuleGrants: User profile:', profileData);

        // If super admin, grant access to all modules
        if (profileData?.is_super_admin || profileData?.role === 'super-admin') {
          console.log('🔧 useUserModuleGrants: User is super admin, granting all modules');
          const { data: allModules } = await supabase
            .from('gw_modules')
            .select('key, name, category')
            .eq('is_active', true);

          const allGrants: ModuleGrant[] = (allModules || []).map(module => ({
            module_key: module.key || module.name,
            module_name: module.name,
            can_view: true,
            can_manage: true,
            category: module.category || 'general'
          }));

          setGrants(allGrants);
          setLoading(false);
          return;
        }

        // Query user module permissions
        const { data: userPermissions, error: permError } = await supabase
          .from('gw_user_module_permissions')
          .select('module_id')
          .eq('user_id', targetUserId)
          .eq('is_active', true);

        if (!cancelled) {
          if (permError) {
            console.error('🔧 useUserModuleGrants: Permission query error:', permError);
            setError(permError.message);
            setGrants([]);
          } else {
            console.log('🔧 useUserModuleGrants: User permissions data:', userPermissions);

            const moduleIds = (userPermissions || [])
              .map((p: any) => p.module_id)
              .filter(Boolean);

            if (moduleIds.length === 0) {
              console.log('🔧 useUserModuleGrants: No permissions found, returning empty grants');
              setGrants([]);
              setLoading(false);
              return;
            }

            // Handle legacy aliases and split UUID vs text keys
            const LEGACY_ALIAS: Record<string, string> = {
              attendance: 'attendance-management',
              calendar: 'calendar-management'
            };
            const isUuid = (v: string) => /^[0-9a-fA-F-]{36}$/.test(v);

            const uuidIds = moduleIds.filter((id: string) => isUuid(id));
            const textIdsSet = new Set<string>();
            for (const id of moduleIds) {
              if (!isUuid(id)) {
                textIdsSet.add(id);
                if (LEGACY_ALIAS[id]) textIdsSet.add(LEGACY_ALIAS[id]);
              }
            }

            // Fetch corresponding modules by UUID and by key (with aliases)
            let modulesData: any[] = [];
            // By UUID ids
            if (uuidIds.length > 0) {
              const { data, error } = await supabase
                .from('gw_modules')
                .select('id, key, name, category, is_active')
                .in('id', uuidIds)
                .eq('is_active', true);
              if (error) {
                console.error('🔧 useUserModuleGrants: Modules fetch (by id) error:', error);
              } else {
                modulesData = data || [];
              }
            }
            // By key ids (including legacy aliases)
            const keyIds = Array.from(textIdsSet);
            if (keyIds.length > 0) {
              const { data, error } = await supabase
                .from('gw_modules')
                .select('id, key, name, category, is_active')
                .in('key', keyIds)
                .eq('is_active', true);
              if (error) {
                console.error('🔧 useUserModuleGrants: Modules fetch (by key) error:', error);
              } else {
                modulesData = [...modulesData, ...(data || [])];
              }
            }

            const moduleById = new Map((modulesData || []).map((m: any) => [m.id, m]));
            const moduleByKey = new Map((modulesData || []).map((m: any) => [m.key, m]));

            // Map permissions to grants (all assigned modules have view + manage)
            const parsedGrants: ModuleGrant[] = (userPermissions || []).map((item: any) => {
              const rawId = item.module_id;
              // Try to find module by ID first, then by key, then by legacy alias
              const module = moduleById.get(rawId) || moduleByKey.get(rawId) || moduleByKey.get(LEGACY_ALIAS[rawId]);
              const resolvedKey = module?.key || module?.id || LEGACY_ALIAS[rawId] || rawId;
              return {
                module_key: resolvedKey,
                module_name: module?.name || resolvedKey,
                can_view: true,
                can_manage: true,
                category: module?.category || 'general'
              };
            }).filter(grant => grant.module_key);

            console.log('🔧 useUserModuleGrants: Parsed grants:', parsedGrants);
            setGrants(parsedGrants);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('🔧 useUserModuleGrants: Unexpected error:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
          setGrants([]);
          setLoading(false);
        }
      }
    }

    fetchGrants();

    // Set up real-time subscription for instant updates
    let cleanup: (() => void) | undefined;
    let targetUserId = userId;
    if (!targetUserId) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.id) {
          targetUserId = user.id;
          cleanup = setupSubscription(targetUserId);
        }
      });
    } else {
      cleanup = setupSubscription(targetUserId);
    }

    function setupSubscription(uid: string) {
      const channel = supabase
        .channel(`user_module_permissions:${uid}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'gw_user_module_permissions',
            filter: `user_id=eq.${uid}`
          },
          (payload) => {
            console.log('🔧 useUserModuleGrants: Real-time update received:', payload);
            fetchGrants();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    return () => {
      cancelled = true;
      try { cleanup?.(); } catch {}
    };
  }, [userId]);

  const refetch = () => {
    if (userId) {
      setLoading(true);
      setError(null);
      // Trigger useEffect by updating dependency
    }
  };

  return { 
    grants, 
    loading, 
    error,
    refetch 
  };
}