
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useContractFetcher } from "./useContractFetcher";
import { useSignatureFields } from "./useSignatureFields";

export const useContractSigning = (contractId: string | undefined) => {
  const [signing, setSigning] = useState(false);
  // Initialize as empty array and ensure it never becomes null
  const [embeddedSignatures, setEmbeddedSignatures] = useState<any[]>([]);
  const { user } = useAuth();

  const {
    contract,
    signatureRecord,
    loading,
    error,
    fetchContract
  } = useContractFetcher(contractId);

  const {
    signatureFields,
    completedFields,
    initializeMockSignatureFields,
    handleFieldComplete,
    isAdminOrAgentField,
    isArtistDateField
  } = useSignatureFields();

  const isContractSigned = () => {
    return signatureRecord?.status === 'completed' && signatureRecord?.embedded_signatures;
  };

  const handleSignContract = async (signatureData: string) => {
    if (!contractId || !user?.id) {
      console.error('useContractSigning - Contract ID or User ID is missing');
      return;
    }

    setSigning(true);
    try {
      const { data, error } = await supabase.functions.invoke('artist-sign-contract', {
        body: {
          contractId: contractId,
          signatureData: signatureData,
          dateSigned: new Date().toLocaleDateString()
        }
      });

      if (error) {
        console.error('useContractSigning - Error signing contract:', error);
        throw error;
      }

      console.log('useContractSigning - Contract signed successfully:', data);
      await fetchContract(); // Refresh contract data
    } catch (error) {
      console.error('useContractSigning - Failed to sign contract:', error);
      throw error;
    } finally {
      setSigning(false);
    }
  };

  // Extract embedded signatures from signature record with enhanced null safety
  useEffect(() => {
    console.log('useContractSigning - Processing signature record:', signatureRecord);
    
    // Always ensure we have a valid array, never null
    if (signatureRecord?.embedded_signatures) {
      console.log('useContractSigning - Processing embedded signatures:', signatureRecord.embedded_signatures);
      
      if (Array.isArray(signatureRecord.embedded_signatures)) {
        console.log('useContractSigning - Setting embedded signatures array:', signatureRecord.embedded_signatures.length, 'items');
        setEmbeddedSignatures([...signatureRecord.embedded_signatures]); // Create new array to prevent mutations
      } else {
        // If it's not an array, try to parse it if it's a string
        try {
          if (typeof signatureRecord.embedded_signatures === 'string') {
            const parsed = JSON.parse(signatureRecord.embedded_signatures);
            if (Array.isArray(parsed)) {
              console.log('useContractSigning - Setting parsed embedded signatures array:', parsed.length, 'items');
              setEmbeddedSignatures([...parsed]); // Create new array
            } else {
              console.warn('useContractSigning - Parsed embedded_signatures is not an array:', parsed);
              setEmbeddedSignatures([]); // Ensure it's an empty array, not null
            }
          } else {
            console.warn('useContractSigning - embedded_signatures is not an array or string:', signatureRecord.embedded_signatures);
            setEmbeddedSignatures([]); // Ensure it's an empty array, not null
          }
        } catch (error) {
          console.error('useContractSigning - Failed to parse embedded signatures:', error);
          setEmbeddedSignatures([]); // Ensure it's an empty array, not null
        }
      }
    } else {
      console.log('useContractSigning - No embedded signatures found, ensuring empty array');
      setEmbeddedSignatures([]); // Ensure it's an empty array, not null
    }
  }, [signatureRecord]);

  useEffect(() => {
    if (contract) {
      initializeMockSignatureFields();
    }
  }, [contract, initializeMockSignatureFields]);

  // Triple safety check: ensure we always return a valid array, never null or undefined
  const safeEmbeddedSignatures = Array.isArray(embeddedSignatures) ? embeddedSignatures : [];
  
  console.log('useContractSigning - Final return values:', {
    hasContract: !!contract,
    signatureFieldsLength: signatureFields?.length || 0,
    completedFieldsCount: Object.keys(completedFields || {}).length,
    embeddedSignaturesLength: safeEmbeddedSignatures.length,
    embeddedSignaturesType: typeof safeEmbeddedSignatures,
    embeddedSignaturesIsArray: Array.isArray(safeEmbeddedSignatures)
  });

  return {
    contract,
    signatureFields: Array.isArray(signatureFields) ? signatureFields : [],
    signatureRecord,
    completedFields: completedFields || {},
    loading,
    signing,
    error,
    embeddedSignatures: safeEmbeddedSignatures,
    handleFieldComplete,
    handleSignContract,
    isAdminOrAgentField,
    isArtistDateField,
    isContractSigned,
  };
};
