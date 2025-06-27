
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
    console.log('useContractFetcher: Contract ID type:', typeof contractId);
    console.log('useContractFetcher: Contract ID length:', contractId.length);
    
    setLoading(true);
    setError(null);

    try {
      // Try contracts_v2 table first (primary table)
      console.log('useContractFetcher: Querying contracts_v2 table...');
      const { data: contractsV2Data, error: contractsV2Error } = await supabase
        .from('contracts_v2')
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

      console.log('useContractFetcher: contracts_v2 query result:', { 
        data: contractsV2Data, 
        error: contractsV2Error 
      });

      let contractData = contractsV2Data;
      let contractError = contractsV2Error;

      // If not found in contracts_v2, try contracts table as fallback
      if (!contractData && !contractError) {
        console.log('useContractFetcher: Not found in contracts_v2, trying contracts table...');
        const { data: contractsData, error: contractsError } = await supabase
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

        console.log('useContractFetcher: contracts query result:', { 
          data: contractsData, 
          error: contractsError 
        });

        contractData = contractsData;
        contractError = contractsError;
      }

      if (contractError) {
        console.error('useContractFetcher: Contract fetch error:', contractError);
        
        // Provide more specific error messages
        if (contractError.code === 'PGRST116') {
          setError('Contract not found. Please check the contract ID and try again.');
        } else if (contractError.message?.includes('JWT')) {
          setError('Authentication error. The contract link may have expired.');
        } else {
          setError(`Unable to load contract: ${contractError.message}`);
        }
        return;
      }

      if (!contractData) {
        console.warn('useContractFetcher: No contract found for ID:', contractId);
        setError('Contract not found. The contract may have been deleted or the link is incorrect.');
        return;
      }

      // Fetch signature record
      console.log('useContractFetcher: Fetching signature record...');
      const { data: signatureData, error: signatureError } = await supabase
        .from('contract_signatures_v2')
        .select('*')
        .eq('contract_id', contractId)
        .maybeSingle();

      console.log('useContractFetcher: Signature query result:', { 
        data: signatureData, 
        error: signatureError 
      });

      if (signatureError && signatureError.code !== 'PGRST116') {
        console.error('useContractFetcher: Signature fetch error:', signatureError);
        // Don't fail the whole request for signature errors, just log it
      }

      console.log('useContractFetcher: Successfully found contract:', {
        id: contractData.id,
        title: contractData.title,
        status: contractData.status,
        hasSignatureRecord: !!signatureData
      });
      
      setContract(contractData as Contract);
      setSignatureRecord(signatureData);
    } catch (err) {
      console.error('useContractFetcher: Catch block error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch contract';
      console.error('useContractFetcher: Error details:', {
        message: errorMessage,
        contractId,
        timestamp: new Date().toISOString()
      });
      
      // Provide user-friendly error messages
      if (errorMessage.includes('Failed to fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else if (errorMessage.includes('timeout')) {
        setError('Request timed out. Please try again.');
      } else {
        setError('Unable to load contract. Please try again or contact support.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
  }, [contractId]);

  return { contract, signatureRecord, loading, error, fetchContract };
};
