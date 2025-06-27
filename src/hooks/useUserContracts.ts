
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
      console.log('useUserContracts: Fetching contracts for user:', user.id);

      // First, try to get contracts from contracts_v2 where user is the creator or involved in signatures
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts_v2')
        .select(`
          id,
          title,
          content,
          status,
          created_at
        `)
        .or(`created_by.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (contractsError) {
        console.error('useUserContracts: Error fetching contracts:', contractsError);
        throw contractsError;
      }

      console.log('useUserContracts: Found contracts:', contractsData?.length || 0);

      // For each contract, get signature status
      const enrichedContracts = await Promise.all(
        (contractsData || []).map(async (contract) => {
          console.log('useUserContracts: Processing contract:', contract.id);
          
          // Get signature record for this contract
          const { data: signatureData, error: signatureError } = await supabase
            .from('contract_signatures_v2')
            .select('status, artist_signed_at, admin_signed_at')
            .eq('contract_id', contract.id)
            .maybeSingle();

          if (signatureError && signatureError.code !== 'PGRST116') {
            console.error('useUserContracts: Error fetching signature for contract:', contract.id, signatureError);
          }

          console.log('useUserContracts: Signature data for contract', contract.id, ':', signatureData);

          return {
            id: contract.id,
            title: contract.title,
            content: contract.content,
            status: contract.status,
            created_at: contract.created_at,
            signature_status: signatureData?.status || 'pending',
            artist_signed_at: signatureData?.artist_signed_at || null,
            admin_signed_at: signatureData?.admin_signed_at || null,
          };
        })
      );

      console.log('useUserContracts: Final enriched contracts:', enrichedContracts);
      setContracts(enrichedContracts);
    } catch (error) {
      console.error('useUserContracts: Error in fetchUserContracts:', error);
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
