
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SignatureField {
  id: number;
  label: string;
  type: 'signature' | 'date' | 'text' | 'initials' | 'username';
  page: number;
  x: number;
  y: number;
  required: boolean;
}

interface Contract {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
}

interface SignatureRecord {
  id: string;
  status: string;
  artist_signature_data?: string;
  admin_signature_data?: string;
  artist_signed_at?: string;
  admin_signed_at?: string;
  date_signed?: string;
}

export const useContractSigning = (contractId?: string) => {
  const [contract, setContract] = useState<Contract | null>(null);
  const [signatureRecord, setSignatureRecord] = useState<SignatureRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
  const [completedFields, setCompletedFields] = useState<Record<number, string>>({});
  const { toast } = useToast();

  // Default signature fields for the contract
  const defaultSignatureFields: SignatureField[] = [
    {
      id: 1,
      label: "Artist Signature",
      type: "signature",
      page: 1,
      x: 50,
      y: 100,
      required: true
    },
    {
      id: 2,
      label: "Date Signed",
      type: "date",
      page: 1,
      x: 50,
      y: 60,
      required: true
    }
  ];

  useEffect(() => {
    if (contractId) {
      fetchContractData();
      setSignatureFields(defaultSignatureFields);
    }
  }, [contractId]);

  const fetchContractData = async () => {
    try {
      setLoading(true);
      
      // Fetch contract details
      const { data: contractData, error: contractError } = await supabase
        .from('contracts_v2')
        .select('*')
        .eq('id', contractId)
        .single();

      if (contractError) {
        console.error('Error fetching contract:', contractError);
        toast({
          title: "Error",
          description: "Failed to load contract",
          variant: "destructive",
        });
        return;
      }

      setContract(contractData);

      // Fetch existing signature record
      const { data: signatureData, error: signatureError } = await supabase
        .from('contract_signatures_v2')
        .select('*')
        .eq('contract_id', contractId)
        .maybeSingle();

      if (signatureError) {
        console.error('Error fetching signature record:', signatureError);
      } else if (signatureData) {
        setSignatureRecord(signatureData);
        
        // Populate completed fields based on existing signature data
        const completed: Record<number, string> = {};
        if (signatureData.artist_signature_data) {
          completed[1] = signatureData.artist_signature_data;
        }
        if (signatureData.date_signed) {
          completed[2] = signatureData.date_signed;
        }
        setCompletedFields(completed);
      }

    } catch (error) {
      console.error('Error in fetchContractData:', error);
      toast({
        title: "Error",
        description: "Failed to load contract data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldComplete = async (fieldId: number, value: string) => {
    setCompletedFields(prev => ({
      ...prev,
      [fieldId]: value
    }));

    // If this is the signature field and we have both signature and date, submit the signing
    if (fieldId === 1) { // Signature field
      const updatedFields = { ...completedFields, [fieldId]: value };
      
      // Check if we have both signature and date
      const hasSignature = updatedFields[1];
      const hasDate = updatedFields[2] || new Date().toLocaleDateString();
      
      if (hasSignature) {
        // Auto-set date if not provided
        if (!updatedFields[2]) {
          const today = new Date().toLocaleDateString();
          setCompletedFields(prev => ({ ...prev, 2: today }));
          updatedFields[2] = today;
        }
        
        await submitArtistSignature(hasSignature, updatedFields[2]);
      }
    }
  };

  const submitArtistSignature = async (signatureData: string, dateSigned: string) => {
    if (!contractId) return;

    try {
      setSigning(true);
      console.log('Submitting artist signature for contract:', contractId);

      const { data, error } = await supabase.functions.invoke('artist-sign-contract', {
        body: {
          contractId,
          signatureData,
          dateSigned
        }
      });

      if (error) {
        console.error('Error calling artist-sign-contract function:', error);
        throw error;
      }

      if (data?.error) {
        console.error('Function returned error:', data.error);
        throw new Error(data.error);
      }

      console.log('Artist signature submitted successfully:', data);

      // Refresh the contract data to get updated status
      await fetchContractData();

      toast({
        title: "Success",
        description: "Your signature has been recorded. The contract is now pending admin approval.",
      });

    } catch (error) {
      console.error('Error submitting artist signature:', error);
      toast({
        title: "Error",
        description: "Failed to submit signature. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
  };

  const isAdminOrAgentField = (field: SignatureField) => {
    return field.label.toLowerCase().includes('admin') || 
           field.label.toLowerCase().includes('agent') ||
           field.label.toLowerCase().includes('manager');
  };

  const isArtistDateField = (field: SignatureField) => {
    return field.type === 'date' && 
           (field.label.toLowerCase().includes('artist') || 
            field.label.toLowerCase().includes('date'));
  };

  return {
    contract,
    signatureRecord,
    loading,
    signing,
    signatureFields,
    completedFields,
    handleFieldComplete,
    isAdminOrAgentField,
    isArtistDateField
  };
};
