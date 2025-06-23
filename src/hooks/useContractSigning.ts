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

interface EmbeddedSignature {
  fieldId: number;
  signatureData: string;
  dateSigned: string;
  ipAddress?: string;
  timestamp: string;
  signerType?: 'artist' | 'admin';
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
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
  const [completedFields, setCompletedFields] = useState<Record<number, string>>({});
  const [embeddedSignatures, setEmbeddedSignatures] = useState<EmbeddedSignature[]>([]);
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

      // Parse embedded signatures from contract content
      const signatureMatch = contractData.content.match(/\[EMBEDDED_SIGNATURES\](.*?)\[\/EMBEDDED_SIGNATURES\]/s);
      if (signatureMatch) {
        try {
          const signatures = JSON.parse(signatureMatch[1]);
          setEmbeddedSignatures(signatures);
          
          // Populate completed fields based on embedded signatures
          const completed: Record<number, string> = {};
          signatures.forEach((sig: EmbeddedSignature) => {
            completed[sig.fieldId] = sig.signatureData;
          });
          setCompletedFields(completed);
        } catch (e) {
          console.error('Error parsing embedded signatures:', e);
        }
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

    // If this is the signature field, embed it in the document
    if (fieldId === 1) { // Signature field
      const updatedFields = { ...completedFields, [fieldId]: value };
      
      // Auto-set date if not provided
      if (!updatedFields[2]) {
        const today = new Date().toLocaleDateString();
        setCompletedFields(prev => ({ ...prev, 2: today }));
        updatedFields[2] = today;
      }
      
      await embedSignatureInDocument(value, updatedFields[2]);
    }
  };

  const embedSignatureInDocument = async (signatureData: string, dateSigned: string) => {
    if (!contractId || !contract) return;

    try {
      setSigning(true);
      console.log('Embedding signature in document for contract:', contractId);

      // Create new embedded signature for artist
      const newArtistSignature: EmbeddedSignature = {
        fieldId: 1,
        signatureData,
        dateSigned,
        timestamp: new Date().toISOString(),
        ipAddress: 'unknown',
        signerType: 'artist'
      };

      // Preserve existing admin signatures and only add/update artist signature
      const existingAdminSignatures = embeddedSignatures.filter(sig => sig.signerType === 'admin');
      const existingArtistSignatures = embeddedSignatures.filter(sig => sig.signerType !== 'admin');
      
      // Replace artist signatures with the new one, keep admin signatures unchanged
      const updatedSignatures = [
        ...existingAdminSignatures, // Keep all admin signatures
        newArtistSignature // Add/replace artist signature
      ];
      
      setEmbeddedSignatures(updatedSignatures);

      // Embed signatures in contract content
      let updatedContent = contract.content;
      
      // Remove existing embedded signatures section if it exists
      updatedContent = updatedContent.replace(/\[EMBEDDED_SIGNATURES\].*?\[\/EMBEDDED_SIGNATURES\]/s, '');
      
      // Add new embedded signatures section
      const signaturesSection = `\n\n[EMBEDDED_SIGNATURES]${JSON.stringify(updatedSignatures)}[/EMBEDDED_SIGNATURES]`;
      updatedContent += signaturesSection;

      // Only update status to pending_admin_signature if not already completed
      const newStatus = contract.status === 'completed' ? 'completed' : 'pending_admin_signature';

      // Update contract status and content
      const { error: updateError } = await supabase
        .from('contracts_v2')
        .update({ 
          content: updatedContent,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', contractId);

      if (updateError) {
        console.error('Error updating contract with embedded signature:', updateError);
        throw updateError;
      }

      console.log('Artist signature embedded successfully in document');

      // Refresh the contract data
      await fetchContractData();

      toast({
        title: "Success",
        description: "Your signature has been embedded in the contract document. Pending admin approval.",
      });

    } catch (error) {
      console.error('Error embedding signature in document:', error);
      toast({
        title: "Error",
        description: "Failed to embed signature. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
  };

  // Create a proper signature record based on contract status and embedded signatures
  const createSignatureRecord = (): SignatureRecord | null => {
    if (!contract) return null;

    const artistSignature = embeddedSignatures.find(sig => sig.fieldId === 1 && sig.signerType === 'artist');
    const adminSignature = embeddedSignatures.find(sig => sig.signerType === 'admin');
    
    return {
      id: contractId || 'mock-id',
      status: contract.status,
      artist_signature_data: artistSignature?.signatureData,
      artist_signed_at: artistSignature?.timestamp,
      date_signed: artistSignature?.dateSigned,
      admin_signature_data: adminSignature?.signatureData,
      admin_signed_at: adminSignature?.timestamp,
    };
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

  const isContractSigned = () => {
    return contract?.status === 'completed' || embeddedSignatures.length > 0;
  };

  return {
    contract,
    signatureRecord: createSignatureRecord(),
    loading,
    signing,
    signatureFields,
    completedFields,
    handleFieldComplete,
    isAdminOrAgentField,
    isArtistDateField,
    isContractSigned,
    embeddedSignatures
  };
};
