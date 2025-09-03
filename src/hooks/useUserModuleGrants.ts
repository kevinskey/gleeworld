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

        // For now, skip the complex permission groups integration due to type issues
        // TODO: Fix types and re-enable this integration later

        // Fallback: Try the RPC function
        const { data, error } = await supabase.rpc('get_user_modules', { 
          p_user: targetUserId 
        });

        if (!cancelled) {
          if (error) {
            console.error('🔧 useUserModuleGrants: RPC error:', error);
            setError(error.message);
            setGrants([]);
          } else {
            console.log('🔧 useUserModuleGrants: RPC data:', data);
            // The RPC returns array of objects with module data
            const parsedGrants: ModuleGrant[] = (data || []).map((item: any) => {
              return {
                module_key: item.module_key || item.module_name || 'unknown',
                module_name: item.module_name || item.module_key || 'unknown',
                can_view: item.can_view ?? true,
                can_manage: item.can_manage ?? item.can_edit ?? false,
                category: item.category || 'general'
              };
            }).filter(grant => grant.module_key !== 'unknown');
            
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