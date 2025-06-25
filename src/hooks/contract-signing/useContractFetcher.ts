
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Contract } from "@/types/contractSigning";

export const useContractFetcher = (contractId: string | undefined) => {
  const [contract, setContract] = useState<Contract | null>(null);
  const [signatureRecord, setSignatureRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContract = async () => {
    if (!contractId) {
      console.warn('useContractFetcher: No contractId provided');
      setLoading(false);
      setError('No contract ID provided');
      return;
    }

    console.log('useContractFetcher: Starting fetch for contractId:', contractId);
    setLoading(true);
    setError(null);

    try {
      // Query the contracts table with only existing columns
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select(`
          id,
          title,
          content,
          status,
          created_at,
          updated_at,
          created_by
        `)
        .eq('id', contractId)
        .maybeSingle();

      console.log('useContractFetcher: Contracts query result:', { contractData, contractError });

      if (contractError) {
        console.error('useContractFetcher: Contract fetch error:', contractError);
        setError(contractError.message);
        return;
      }

      if (!contractData) {
        console.warn('useContractFetcher: No contract found for ID:', contractId);
        setError('Contract not found');
        return;
      }

      // Fetch signature record
      const { data: signatureData, error: signatureError } = await supabase
        .from('contract_signatures_v2')
        .select('*')
        .eq('contract_id', contractId)
        .maybeSingle();

      console.log('useContractFetcher: Signature query result:', { signatureData, signatureError });

      if (signatureError && signatureError.code !== 'PGRST116') {
        console.error('useContractFetcher: Signature fetch error:', signatureError);
      }

      console.log('useContractFetcher: Contract found:', contractData);
      setContract(contractData as Contract);
      setSignatureRecord(signatureData);
    } catch (err) {
      console.error('useContractFetcher: Catch block error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch contract');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
  }, [contractId]);

  return { contract, signatureRecord, loading, error, fetchContract };
};
