
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Contract } from "@/hooks/useContracts";

export const useContractFetcher = (contractId: string) => {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContract = async () => {
      console.log('useContractFetcher: Starting fetch for contractId:', contractId);
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('contracts')
          .select(`
            id,
            title,
            content,
            status,
            created_at,
            updated_at,
            stipend_amount,
            contract_type,
            signed_document_url,
            admin_signature_url,
            signature_fields,
            contract_recipients_v2!inner(
              recipient_email,
              recipient_name,
              sent_at
            )
          `)
          .eq('id', contractId)
          .maybeSingle();

        console.log('useContractFetcher: Query result:', { data, fetchError });

        if (fetchError) {
          console.error('useContractFetcher: Fetch error:', fetchError);
          setError(fetchError.message);
          return;
        }

        if (!data) {
          console.warn('useContractFetcher: No contract found for ID:', contractId);
          setError('Contract not found');
          return;
        }

        console.log('useContractFetcher: Contract found:', data);
        setContract(data as Contract);
      } catch (err) {
        console.error('useContractFetcher: Catch block error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch contract');
      } finally {
        setLoading(false);
      }
    };

    if (contractId) {
      fetchContract();
    } else {
      console.warn('useContractFetcher: No contractId provided');
      setLoading(false);
      setError('No contract ID provided');
    }
  }, [contractId]);

  return { contract, loading, error };
};
