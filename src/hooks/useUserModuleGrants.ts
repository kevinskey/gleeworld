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
              setGrants([]);
              setLoading(false);
              return;
            }

            // Fetch corresponding modules to get stable keys/names/categories
            // NOTE: module_id in permissions can be either UUID or key string
            const { data: modulesData, error: modulesError } = await supabase
              .from('gw_modules')
              .select('id, key, name, category, is_active')
              .or(`id.in.(${moduleIds.join(',')}),key.in.(${moduleIds.join(',')})`)
              .eq('is_active', true);

            if (modulesError) {
              console.error('🔧 useUserModuleGrants: Modules fetch error:', modulesError);
            }

            const moduleById = new Map((modulesData || []).map((m: any) => [m.id, m]));
            const moduleByKey = new Map((modulesData || []).map((m: any) => [m.key, m]));

            // Map permissions to grants (all assigned modules have view + manage)
            const parsedGrants: ModuleGrant[] = (userPermissions || []).map((item: any) => {
              // Try to find module by ID first, then by key
              const module = moduleById.get(item.module_id) || moduleByKey.get(item.module_id);
              return {
                module_key: module?.key || module?.id || item.module_id,
                module_name: module?.name || module?.key || item.module_id,
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

    return () => {
      cancelled = true;
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