
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Contract, SignatureRecord } from "@/types/contractSigning";

export const useContractFetcher = (contractId: string | undefined) => {
  const [contract, setContract] = useState<Contract | null>(null);
  const [signatureRecord, setSignatureRecord] = useState<SignatureRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchContract = useCallback(async () => {
    if (!contractId) {
      console.log('useContractFetcher - No contract ID provided.');
      setLoading(false);
      return;
    }

    console.log('useContractFetcher - Starting contract fetch for ID:', contractId);
    console.log('useContractFetcher - Current user:', user?.id);

    try {
      setLoading(true);

      // Try multiple tables to find the contract
      let contractData = null;
      let contractError = null;

      console.log('useContractFetcher - Trying contracts_v2 table first...');
      
      // First try contracts_v2 table
      const { data: contractsV2Data, error: contractsV2Error } = await supabase
        .from('contracts_v2')
        .select('*')
        .eq('id', contractId)
        .maybeSingle();

      console.log('useContractFetcher - contracts_v2 query result:', {
        data: contractsV2Data,
        error: contractsV2Error,
        contractId: contractId
      });

      if (contractsV2Data) {
        contractData = contractsV2Data;
        console.log('useContractFetcher - Found contract in contracts_v2');
      } else if (!contractsV2Error || contractsV2Error.code === 'PGRST116') {
        console.log('useContractFetcher - Not found in contracts_v2, trying contracts table...');
        
        // If not found in contracts_v2, try contracts table
        const { data: contractsData, error: contractsError2 } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', contractId)
          .maybeSingle();

        console.log('useContractFetcher - contracts query result:', {
          data: contractsData,
          error: contractsError2,
          contractId: contractId
        });

        if (contractsData) {
          contractData = contractsData;
          console.log('useContractFetcher - Found contract in contracts table');
        } else {
          contractError = contractsError2;
        }
      } else {
        contractError = contractsV2Error;
      }

      // Also try generated_contracts table as a fallback
      if (!contractData) {
        console.log('useContractFetcher - Trying generated_contracts table as fallback...');
        const { data: generatedData, error: generatedError } = await supabase
          .from('generated_contracts')
          .select('*')
          .eq('id', contractId)
          .maybeSingle();

        console.log('useContractFetcher - generated_contracts query result:', {
          data: generatedData,
          error: generatedError,
          contractId: contractId
        });

        if (generatedData) {
          // Transform generated_contracts data to match Contract interface
          contractData = {
            id: generatedData.id,
            title: generatedData.event_name || 'Generated Contract',
            content: generatedData.contract_content || '',
            status: generatedData.status || 'draft',
            created_at: generatedData.created_at,
            updated_at: generatedData.updated_at
          };
          console.log('useContractFetcher - Found and transformed contract from generated_contracts');
        }
      }

      if (contractError && contractError.code !== 'PGRST116') {
        console.error('useContractFetcher - Error fetching contract:', contractError);
        throw contractError;
      }

      if (!contractData) {
        console.log('useContractFetcher - Contract not found in any table with ID:', contractId);
        console.log('useContractFetcher - Searched tables: contracts_v2, contracts, generated_contracts');
        setContract(null);
        setLoading(false);
        return;
      }

      console.log('useContractFetcher - Contract data found:', contractData);
      setContract(contractData);

      // Check for signature record with enhanced logging
      if (user?.id) {
        console.log('useContractFetcher - Checking for signature record...');
        
        // Check both contract_signatures_v2 and contract_signatures tables
        const { data: signaturesV2Data, error: signaturesV2Error } = await supabase
          .from('contract_signatures_v2')
          .select('*')
          .eq('contract_id', contractId)
          .maybeSingle();

        console.log('useContractFetcher - contract_signatures_v2 query result:', {
          data: signaturesV2Data,
          error: signaturesV2Error
        });

        if (signaturesV2Data) {
          // Transform the contract_signatures_v2 data to match SignatureRecord interface
          const transformedRecord: SignatureRecord = {
            id: signaturesV2Data.id,
            contract_id: signaturesV2Data.contract_id,
            artist_id: user.id,
            status: signaturesV2Data.status as 'pending_artist_signature' | 'pending_admin_signature' | 'completed',
            created_at: signaturesV2Data.created_at,
            updated_at: signaturesV2Data.updated_at,
            signed_by_artist_at: signaturesV2Data.artist_signed_at,
            signed_by_admin_at: signaturesV2Data.admin_signed_at,
            embedded_signatures: null
          };
          setSignatureRecord(transformedRecord);
          console.log('useContractFetcher - Signature record from v2 table:', transformedRecord);
        } else {
          // Also check original contract_signatures table
          const { data: signaturesData, error: signaturesError } = await supabase
            .from('contract_signatures')
            .select('*')
            .eq('contract_id', contractId)
            .eq('user_id', user.id)
            .maybeSingle();

          console.log('useContractFetcher - contract_signatures query result:', {
            data: signaturesData,
            error: signaturesError
          });

          if (signaturesData) {
            const transformedRecord: SignatureRecord = {
              id: signaturesData.id,
              contract_id: signaturesData.contract_id,
              artist_id: signaturesData.user_id,
              status: signaturesData.status as 'pending_artist_signature' | 'pending_admin_signature' | 'completed',
              created_at: signaturesData.created_at,
              updated_at: signaturesData.updated_at,
              signed_by_artist_at: signaturesData.user_signed_at,
              signed_by_admin_at: signaturesData.admin_signed_at,
              embedded_signatures: null
            };
            setSignatureRecord(transformedRecord);
            console.log('useContractFetcher - Signature record from original table:', transformedRecord);
          } else {
            setSignatureRecord(null);
            console.log('useContractFetcher - No signature record found in either table');
          }
        }

        if (signaturesV2Error && signaturesV2Error.code !== 'PGRST116') {
          console.error('useContractFetcher - Error fetching signature record:', signaturesV2Error);
        }
      } else {
        console.log('useContractFetcher - No user ID, skipping signature record check');
        setSignatureRecord(null);
      }

      setLoading(false);
      console.log('useContractFetcher - Contract fetch completed successfully');
    } catch (error) {
      console.error('useContractFetcher - Error in fetchContract:', error);
      console.error('useContractFetcher - Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      setContract(null);
      setSignatureRecord(null);
      setLoading(false);
    }
  }, [contractId, user?.id]);

  return {
    contract,
    signatureRecord,
    loading,
    fetchContract
  };
};
