
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface UserContract {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  signature_status: string;
  artist_signed_at: string | null;
  admin_signed_at: string | null;
}

export const useUserContracts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<UserContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserContracts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch contracts where user is involved (either as creator or signee)
      const { data, error } = await supabase
        .from('contracts_v2')
        .select(`
          id,
          title,
          content,
          status,
          created_at,
          contract_signatures_v2!inner (
            status,
            artist_signed_at,
            admin_signed_at
          )
        `)
        .or(`created_by.eq.${user.id},contract_signatures_v2.artist_signature_data.not.is.null`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedContracts = (data || []).map(contract => ({
        id: contract.id,
        title: contract.title,
        content: contract.content,
        status: contract.status,
        created_at: contract.created_at,
        signature_status: contract.contract_signatures_v2?.[0]?.status || 'pending',
        artist_signed_at: contract.contract_signatures_v2?.[0]?.artist_signed_at || null,
        admin_signed_at: contract.contract_signatures_v2?.[0]?.admin_signed_at || null,
      }));

      setContracts(transformedContracts);
    } catch (error) {
      console.error('Error fetching user contracts:', error);
      setError('Failed to load contracts');
      toast({
        title: "Error",
        description: "Failed to load contracts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserContracts();
  }, [user]);

  return {
    contracts,
    loading,
    error,
    refetch: fetchUserContracts,
  };
};
