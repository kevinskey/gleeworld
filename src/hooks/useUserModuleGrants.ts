
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ModuleGrant } from '@/lib/authz';
import { UNIFIED_MODULES } from '@/config/unified-modules';
import { useToast } from '@/hooks/use-toast';

export function useUserModuleGrants(userId?: string) {
  const [grants, setGrants] = useState<ModuleGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    async function fetchGrants() {
      if (!userId) {
        setGrants([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('Fetching user module grants for user:', userId);

        const { data, error } = await supabase.rpc('get_user_modules', { 
          p_user: userId 
        });

        if (!cancelled) {
          if (error) {
            console.error('Error fetching user module grants:', error);
            setError(error.message);
            
            // Fallback to unified modules for executive board members
            const { data: profile } = await supabase
              .from('gw_profiles')
              .select('is_exec_board, exec_board_role, is_admin, is_super_admin')
              .eq('user_id', userId)
              .single();

            if (profile?.is_exec_board || profile?.is_admin || profile?.is_super_admin) {
              console.log('Using fallback modules for executive/admin user');
              const fallbackGrants = UNIFIED_MODULES
                .filter(module => module.isActive)
                .map(module => ({
                  module_key: module.id,
                  module_name: module.title,
                  category: module.category,
                  can_view: true,
                  can_manage: profile?.is_admin || profile?.is_super_admin || false
                }));
              setGrants(fallbackGrants);
            } else {
              setGrants([]);
            }
          } else {
            const moduleGrants = (data as ModuleGrant[] || []);
            console.log('Successfully fetched module grants:', moduleGrants.length);
            
            // If no grants but user is executive/admin, show warning and provide fallback
            if (moduleGrants.length === 0) {
              const { data: profile } = await supabase
                .from('gw_profiles')
                .select('is_exec_board, exec_board_role, is_admin, is_super_admin')
                .eq('user_id', userId)
                .single();

              if (profile?.is_exec_board || profile?.is_admin || profile?.is_super_admin) {
                console.warn('Executive/Admin user has no module grants - this may indicate a system issue');
                toast({
                  title: "Module Access Issue",
                  description: "Your module permissions may not be configured correctly. Contact IT support if this persists.",
                  variant: "destructive",
                });
                
                // Provide emergency fallback
                const fallbackGrants = UNIFIED_MODULES
                  .filter(module => module.isActive)
                  .slice(0, 10) // Limit to prevent overwhelming UI
                  .map(module => ({
                    module_key: module.id,
                    module_name: module.title,
                    category: module.category,
                    can_view: true,
                    can_manage: profile?.is_admin || profile?.is_super_admin || false
                  }));
                setGrants(fallbackGrants);
              } else {
                setGrants([]);
              }
            } else {
              setGrants(moduleGrants);
            }
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Unexpected error fetching user module grants:', err);
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
  }, [userId, toast]);

  const refetch = () => {
    if (userId) {
      setLoading(true);
      setError(null);
      // Trigger useEffect by updating dependency - we'll create a state variable for this
    }
  };

  return { 
    grants, 
    loading, 
    error,
    refetch 
  };
}
