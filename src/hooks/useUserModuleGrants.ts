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
      if (!userId) {
        setGrants([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.rpc('get_user_modules', { 
          p_user: userId 
        });

        if (!cancelled) {
          if (error) {
            console.error('Error fetching user module grants:', error);
            setError(error.message);
            setGrants([]);
          } else {
            setGrants(data as ModuleGrant[] || []);
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