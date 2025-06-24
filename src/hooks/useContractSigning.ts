import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SignatureField {
  id: string;
  label: string;
  type: 'signature' | 'initials' | 'date' | 'text' | 'username';
  required: boolean;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  font_size: number;
  font?: string;
  text_align?: 'left' | 'center' | 'right';
  default_value?: string;
}

interface Contract {
  id: string;
  title: string;
  content: string;
  created_at: string;
  header_image_url?: string;
  email_message?: string;
  recipient_email?: string;
  recipient_name?: string;
}

interface SignatureRecord {
  id: string;
  contract_id: string;
  artist_id: string;
  status: 'pending_artist_signature' | 'pending_admin_signature' | 'completed';
  created_at: string;
  updated_at: string;
  signed_by_artist_at: string | null;
  signed_by_admin_at: string | null;
  embedded_signatures: any;
}

interface W9Form {
  id: string;
  user_id: string;
  storage_path: string;
  submitted_at: string;
  status: string;
  form_data: any;
  created_at: string;
  updated_at: string;
}

export const useContractSigning = (contractId: string | undefined) => {
  const [contract, setContract] = useState<Contract | null>(null);
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
  const [signatureRecord, setSignatureRecord] = useState<SignatureRecord | null>(null);
  const [completedFields, setCompletedFields] = useState<{ [fieldId: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [embeddedSignatures, setEmbeddedSignatures] = useState<any>(null);
  const [w9Status, setW9Status] = useState<'required' | 'completed' | 'not_required'>('not_required');
  const [w9Form, setW9Form] = useState<W9Form | null>(null);
  const { user } = useAuth();

  const fetchContract = useCallback(async () => {
    if (!contractId) {
      console.log('useContractSigning - No contract ID provided.');
      setLoading(false);
      return;
    }

    try {
      console.log('useContractSigning - Fetching contract:', contractId);
      setLoading(true);

      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (contractError) {
        console.error('useContractSigning - Error fetching contract:', contractError);
        throw contractError;
      }

      if (!contractData) {
        console.log('useContractSigning - Contract not found:', contractId);
        setContract(null);
        setLoading(false);
        return;
      }

      console.log('useContractSigning - Contract data:', contractData);
      setContract(contractData);

      const { data: signatureFieldsData, error: signatureFieldsError } = await supabase
        .from('signature_fields')
        .select('*')
        .eq('contract_id', contractId);

      if (signatureFieldsError) {
        console.error('useContractSigning - Error fetching signature fields:', signatureFieldsError);
        throw signatureFieldsError;
      }

      console.log('useContractSigning - Signature fields data:', signatureFieldsData);
      setSignatureFields(signatureFieldsData || []);

      // Fetch signature record
      const { data: signatureRecordData, error: signatureRecordError } = await supabase
        .from('signature_records')
        .select('*')
        .eq('contract_id', contractId)
        .eq('artist_id', user?.id)
        .single();

      if (signatureRecordError) {
        console.error('useContractSigning - Error fetching signature record:', signatureRecordError);
        // Do not throw error, as signature record might not exist yet
      }

      console.log('useContractSigning - Signature record data:', signatureRecordData);
      setSignatureRecord(signatureRecordData || null);

      setLoading(false);
    } catch (error) {
      console.error('useContractSigning - Error in fetchContract:', error);
      setContract(null);
      setSignatureFields([]);
      setSignatureRecord(null);
      setLoading(false);
    }
  }, [contractId, user?.id]);

  const checkW9Status = useCallback(async () => {
    if (!user?.id) {
      console.log('useContractSigning - No user for W9 check, setting not_required');
      setW9Status('not_required');
      setW9Form(null);
      return;
    }

    try {
      console.log('useContractSigning - Checking W9 status for user:', user.id);
      
      // Force a fresh query by adding a timestamp to avoid any caching
      const { data: w9Forms, error } = await supabase
        .from('w9_forms')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('useContractSigning - Error checking W9 status:', error);
        setW9Status('required'); // Default to required if there's an error
        setW9Form(null);
        return;
      }

      console.log('useContractSigning - W9 forms query result:', w9Forms);
      console.log('useContractSigning - W9 forms count:', w9Forms?.length || 0);

      if (!w9Forms || w9Forms.length === 0) {
        console.log('useContractSigning - No W9 forms found, status: required');
        setW9Status('required');
        setW9Form(null);
      } else {
        console.log('useContractSigning - W9 form found, status: completed');
        setW9Status('completed');
        setW9Form(w9Forms[0]);
      }
    } catch (error) {
      console.error('useContractSigning - Unexpected error in W9 check:', error);
      setW9Status('required');
      setW9Form(null);
    }
  }, [user?.id]);

  const handleFieldComplete = (fieldId: string, value: string) => {
    console.log(`useContractSigning - Field ${fieldId} completed with value:`, value);
    setCompletedFields(prev => ({ ...prev, [fieldId]: value }));
  };

  const isAdminOrAgentField = (field: SignatureField) => {
    const adminOrAgentFieldTypes = ['date', 'text', 'username'];
    return adminOrAgentFieldTypes.includes(field.type);
  };

  const isArtistDateField = (field: SignatureField) => {
    return field.type === 'date' && !isAdminOrAgentField(field);
  };

  const isContractSigned = () => {
    return signatureRecord?.status === 'completed' && signatureRecord?.embedded_signatures;
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
      setW9Status('not_required');
      setW9Form(null);
    }
  }, [contract, user, checkW9Status]);

  useEffect(() => {
    console.log('useContractSigning - Auth state changed, fetching contract and signature record.');
    fetchContract();
  }, [fetchContract]);

  return {
    contract,
    signatureFields,
    signatureRecord,
    completedFields,
    loading,
    signing,
    embeddedSignatures,
    handleFieldComplete,
    isAdminOrAgentField,
    isArtistDateField,
    isContractSigned,
    w9Status,
    w9Form,
    generateCombinedPDF,
  };
};
