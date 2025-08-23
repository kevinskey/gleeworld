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

        // First, try to get permissions from the permission groups system
        let permissionGroupGrants: ModuleGrant[] = [];
        
        try {
          // Get user's permission groups
          const { data: userGroupData, error: userGroupError } = await supabase
            .from('permission_group_users')
            .select('group_id')
            .eq('user_id', targetUserId);

          if (!userGroupError && userGroupData && userGroupData.length > 0) {
            console.log('🔧 useUserModuleGrants: User groups found:', userGroupData);
            
            // Get all permissions for these groups
            const groupIds = userGroupData.map(ug => ug.group_id);
            const { data: groupPermissionsData, error: groupPermissionsError } = await supabase
              .from('permission_group_permissions')
              .select('permission_id, permission_level')
              .in('group_id', groupIds);

            if (!groupPermissionsError && groupPermissionsData) {
              console.log('🔧 useUserModuleGrants: Group permissions:', groupPermissionsData);
              
              // Convert permissions to module grants
              const permissionToModuleMap: Record<string, { module_key: string; category: string }> = {
                'view_announcements': { module_key: 'communications', category: 'communications' },
                'view_public_calendar': { module_key: 'events', category: 'events' },
                'view_calendar': { module_key: 'events', category: 'events' },
                'manage_calendar': { module_key: 'events', category: 'events' },
                'view_library': { module_key: 'music-library', category: 'libraries' },
                'view_member_directory': { module_key: 'member-management', category: 'member-management' },
                'view_handbook': { module_key: 'glee-ledger', category: 'libraries' },
                'create_budgets': { module_key: 'budgets', category: 'finances' },
                'view_budgets': { module_key: 'budgets', category: 'finances' },
                'manage_budgets': { module_key: 'budgets', category: 'finances' },
                'view_attendance': { module_key: 'attendance', category: 'member-management' },
                'manage_attendance': { module_key: 'attendance', category: 'member-management' },
                'view_media_library': { module_key: 'media-library', category: 'libraries' },
                'manage_media_library': { module_key: 'media-library', category: 'libraries' },
                'view_tours': { module_key: 'tour-management', category: 'tours' },
                'manage_tours': { module_key: 'tour-management', category: 'tours' },
                'view_auditions': { module_key: 'auditions', category: 'member-management' },
                'manage_auditions': { module_key: 'auditions', category: 'member-management' },
                'view_receipts': { module_key: 'receipts-records', category: 'finances' },
                'manage_receipts': { module_key: 'receipts-records', category: 'finances' },
                'view_wellness': { module_key: 'wellness', category: 'member-management' },
                'manage_wellness': { module_key: 'wellness', category: 'member-management' },
                'manage_pr': { module_key: 'pr-coordinator', category: 'communications' },
                'send_emails': { module_key: 'email', category: 'communications' },
                'manage_hero': { module_key: 'hero-manager', category: 'system' },
                'view_merch_store': { module_key: 'merch-store', category: 'finances' },
                'manage_merch_store': { module_key: 'merch-store', category: 'finances' }
              };

              const moduleGrantsMap = new Map<string, ModuleGrant>();
              
              groupPermissionsData.forEach(permission => {
                const moduleInfo = permissionToModuleMap[permission.permission_id];
                if (moduleInfo) {
                  const existingGrant = moduleGrantsMap.get(moduleInfo.module_key);
                  const isManagePermission = permission.permission_id.includes('manage') || permission.permission_id.includes('create');
                  const canView = permission.permission_level === 'full' || permission.permission_level === 'view';
                  const canManage = isManagePermission && permission.permission_level === 'full';
                  
                  if (existingGrant) {
                    // Merge permissions (highest level wins)
                    existingGrant.can_view = existingGrant.can_view || canView;
                    existingGrant.can_manage = existingGrant.can_manage || canManage;
                  } else {
                    moduleGrantsMap.set(moduleInfo.module_key, {
                      module_key: moduleInfo.module_key,
                      module_name: moduleInfo.module_key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                      can_view: canView,
                      can_manage: canManage,
                      category: moduleInfo.category
                    });
                  }
                }
              });

              permissionGroupGrants = Array.from(moduleGrantsMap.values());
              console.log('🔧 useUserModuleGrants: Permission group grants:', permissionGroupGrants);
            }
          }
        } catch (permissionGroupError) {
          console.error('🔧 useUserModuleGrants: Permission group error:', permissionGroupError);
        }

        // If we have permission group grants, use them
        if (permissionGroupGrants.length > 0) {
          console.log('🔧 useUserModuleGrants: Using permission group grants');
          setGrants(permissionGroupGrants);
          setLoading(false);
          return;
        }

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
            // The RPC returns array of tuples, need to parse them
            const parsedGrants: ModuleGrant[] = (data || []).map((item: any) => {
              try {
                // If it's a string in tuple format, parse it
                if (typeof item === 'string') {
                  const match = item.match(/\(([^,]+),([^,]+),([^,]+),([^,]+),([^)]+)\)/);
                  if (match) {
                    return {
                      module_key: match[1],
                      module_name: match[2],
                      can_view: match[3] === 't',
                      can_manage: match[4] === 't',
                      category: 'general'
                    };
                  }
                }
                // Otherwise assume it's an object
                return {
                  module_key: item.module_key || item.module_name || 'unknown',
                  module_name: item.module_name || item.module_key || 'unknown',
                  can_view: item.can_view ?? item.has_access ?? true,
                  can_manage: item.can_manage ?? false,
                  category: item.category || 'general'
                };
              } catch (err) {
                console.error('🔧 useUserModuleGrants: Error parsing item:', item, err);
                return {
                  module_key: 'error',
                  module_name: 'error',
                  can_view: false,
                  can_manage: false,
                  category: 'general'
                };
              }
            }).filter(grant => grant.module_key !== 'error' && grant.module_key !== 'unknown');
            
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