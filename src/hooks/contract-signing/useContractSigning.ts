
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useContractFetcher } from "./useContractFetcher";
import { useW9Status } from "./useW9Status";
import { useSignatureFields } from "./useSignatureFields";

export const useContractSigning = (contractId: string | undefined) => {
  const [signing, setSigning] = useState(false);
  const [embeddedSignatures, setEmbeddedSignatures] = useState<any>(null);
  const { user } = useAuth();

  const {
    contract,
    signatureRecord,
    loading,
    error,
    fetchContract
  } = useContractFetcher(contractId);

  const {
    w9Status,
    w9Form,
    checkW9Status
  } = useW9Status();

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

  const generateCombinedPDF = async () => {
    if (!contractId || !user?.id) {
      console.error('useContractSigning - Contract ID or User ID is missing');
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-combined-pdf', {
        body: {
          contractId: contractId,
          userId: user.id,
        },
      });

      if (error) {
        console.error('useContractSigning - Error generating combined PDF:', error);
        throw error;
      }

      console.log('useContractSigning - Combined PDF generation successful:', data);
      return data;
    } catch (error) {
      console.error('useContractSigning - Failed to generate combined PDF:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (contract && user) {
      console.log('useContractSigning - Contract and user available, checking W9 status');
      checkW9Status();
    } else {
      console.log('useContractSigning - No contract or user, resetting W9 status');
    }
  }, [contract, user, checkW9Status]);

  useEffect(() => {
    if (contract) {
      initializeMockSignatureFields();
    }
  }, [contract, initializeMockSignatureFields]);

  return {
    contract,
    signatureFields,
    signatureRecord,
    completedFields,
    loading,
    signing,
    error,
    embeddedSignatures,
    handleFieldComplete,
    handleSignContract,
    isAdminOrAgentField,
    isArtistDateField,
    isContractSigned,
    w9Status,
    w9Form,
    generateCombinedPDF,
  };
};
