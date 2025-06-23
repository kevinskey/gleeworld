
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logActivity, ACTIVITY_TYPES, RESOURCE_TYPES } from "@/utils/activityLogger";

interface Contract {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
}

interface SignatureField {
  id: number;
  label: string;
  type: 'signature' | 'date' | 'text' | 'initials' | 'username';
  page: number;
  x: number;
  y: number;
  required: boolean;
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

export const useContractSigning = (contractId: string | undefined) => {
  const [contract, setContract] = useState<Contract | null>(null);
  const [signatureRecord, setSignatureRecord] = useState<SignatureRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
  const [completedFields, setCompletedFields] = useState<Record<number, string>>({});
  const { toast } = useToast();

  const extractSignatureFieldsFromContract = (content: string): SignatureField[] => {
    try {
      const signatureFieldsMatch = content.match(/Signature Fields: (\[.*?\])/);
      if (signatureFieldsMatch) {
        const fieldsData = JSON.parse(signatureFieldsMatch[1]);
        console.log("Found signature fields in content:", fieldsData);
        return fieldsData;
      }
    } catch (error) {
      console.error("Error parsing signature fields from content:", error);
    }

    console.log("Using default signature fields");
    return [
      {
        id: 1,
        label: "Artist Signature",
        type: 'signature',
        page: 1,
        x: 50,
        y: 50,
        required: true
      },
      {
        id: 2,
        label: "Date Signed",
        type: 'date',
        page: 1,
        x: 350,
        y: 50,
        required: true
      }
    ];
  };

  const isAdminOrAgentField = (field: SignatureField): boolean => {
    const label = field.label.toLowerCase();
    return label.includes('admin') || label.includes('agent');
  };

  const isArtistDateField = (field: SignatureField): boolean => {
    if (field.type !== 'date') return false;
    const label = field.label.toLowerCase();
    return (
      label.includes('artist') || 
      label.includes('date signed') || 
      (field.id === 2 && !isAdminOrAgentField(field))
    );
  };

  const handleFieldComplete = (fieldId: number, value: string) => {
    console.log('Field completed:', fieldId, 'with value type:', typeof value, 'length:', value?.length);
    setCompletedFields(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
    const updatedFields = { ...completedFields, [fieldId]: value };
    
    const artistRequiredFields = signatureFields.filter(f => 
      f.required && !isAdminOrAgentField(f)
    );
    
    const allArtistFieldsCompleted = artistRequiredFields.every(f => updatedFields[f.id]);
    
    if (allArtistFieldsCompleted && !signing) {
      handleArtistSign(updatedFields);
    }
  };

  const handleArtistSign = async (fieldsToUse = completedFields) => {
    const artistRequiredFields = signatureFields.filter(f => 
      f.required && !isAdminOrAgentField(f)
    );
    
    const currentDate = new Date().toLocaleDateString();
    const updatedCompletedFields = { ...fieldsToUse };
    
    signatureFields.forEach(field => {
      if (isArtistDateField(field) && 
          field.required && 
          !updatedCompletedFields[field.id]) {
        updatedCompletedFields[field.id] = currentDate;
        console.log('Auto-filled artist date field', field.id, 'with current date:', currentDate);
      }
    });
    
    setCompletedFields(updatedCompletedFields);
    
    const missingArtistFields = artistRequiredFields.filter(f => !updatedCompletedFields[f.id]);

    console.log('Attempting to sign contract (Artist phase)');
    console.log('Artist required fields:', artistRequiredFields.map(f => f.id));
    console.log('Completed fields:', Object.keys(updatedCompletedFields));
    console.log('Missing artist fields:', missingArtistFields.map(f => f.id));

    if (missingArtistFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please complete: ${missingArtistFields.map(f => f.label).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    if (!contract) return;

    setSigning(true);
    try {
      console.log("Calling artist-sign-contract function...");
      
      const artistSignatureField = signatureFields.find(f => 
        f.type === 'signature' && !isAdminOrAgentField(f)
      );
      
      const artistDateField = signatureFields.find(f => isArtistDateField(f));
      
      const signatureData = artistSignatureField ? updatedCompletedFields[artistSignatureField.id] : '';
      const dateSigned = artistDateField ? updatedCompletedFields[artistDateField.id] : currentDate;
      
      console.log('Artist signature data present:', !!signatureData);
      console.log('Artist signature data length:', signatureData?.length || 0);
      console.log('Date signed:', dateSigned);
      
      const { data, error } = await supabase.functions.invoke('artist-sign-contract', {
        body: {
          contractId: contract.id,
          artistSignatureData: signatureData,
          dateSigned: dateSigned,
        }
      });

      if (error) {
        console.error('Error from edge function:', error);
        throw error;
      }

      console.log('Artist contract signing completed:', data);

      await logActivity({
        actionType: ACTIVITY_TYPES.CONTRACT_SIGNED,
        resourceType: RESOURCE_TYPES.CONTRACT,
        resourceId: contract.id,
        details: {
          contractTitle: contract.title,
          dateSigned: dateSigned,
          signaturePhase: 'artist',
          signatureFieldsCompleted: Object.keys(updatedCompletedFields).length
        }
      });

      toast({
        title: "Artist Signature Complete!",
        description: "Your signature has been recorded. The contract is now pending admin approval.",
      });

      setSignatureRecord({
        id: data.signatureId,
        status: 'pending_admin_signature',
        artist_signature_data: signatureData,
        artist_signed_at: new Date().toISOString(),
        date_signed: dateSigned
      });
      
    } catch (error) {
      console.error('Error signing contract:', error);
      toast({
        title: "Error",
        description: "Failed to sign contract. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
  };

  const fetchContract = async () => {
    if (!contractId) {
      console.log("No contract ID provided in URL");
      setLoading(false);
      return;
    }

    console.log("Fetching contract with ID:", contractId);

    try {
      const { data, error } = await supabase
        .from('contracts_v2')
        .select('*')
        .eq('id', contractId)
        .single();

      if (error) {
        console.error('Error fetching contract:', error);
        toast({
          title: "Error",
          description: "Contract not found",
          variant: "destructive",
        });
        return;
      }

      console.log("Contract found:", data);
      setContract(data);
      
      const { data: sigData } = await supabase
        .from('contract_signatures_v2')
        .select('*')
        .eq('contract_id', contractId)
        .single();

      if (sigData) {
        console.log("Found existing signature record:", sigData);
        setSignatureRecord(sigData);
      }
      
      const extractedFields = extractSignatureFieldsFromContract(data.content);
      console.log("Extracted signature fields:", extractedFields);
      setSignatureFields(extractedFields);
      
      await logActivity({
        actionType: ACTIVITY_TYPES.CONTRACT_VIEWED,
        resourceType: RESOURCE_TYPES.CONTRACT,
        resourceId: contractId,
        details: {
          contractTitle: data.title,
          contractStatus: data.status,
          signatureFieldsCount: extractedFields.length
        }
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load contract",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
  }, [contractId]);

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
