
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SignatureField {
  id: number;
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
  status: string;
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
  const [completedFields, setCompletedFields] = useState<{ [fieldId: number]: string }>({});
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

      // Try multiple tables to find the contract
      let contractData = null;
      let contractError = null;

      // First try contracts_v2 table
      const { data: contractsV2Data, error: contractsV2Error } = await supabase
        .from('contracts_v2')
        .select('*')
        .eq('id', contractId)
        .maybeSingle();

      if (contractsV2Data) {
        contractData = contractsV2Data;
      } else if (!contractsV2Error || contractsV2Error.code === 'PGRST116') {
        // If not found in contracts_v2, try contracts table
        const { data: contractsData, error: contractsError2 } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', contractId)
          .maybeSingle();

        if (contractsData) {
          contractData = contractsData;
        } else {
          contractError = contractsError2;
        }
      } else {
        contractError = contractsV2Error;
      }

      if (contractError && contractError.code !== 'PGRST116') {
        console.error('useContractSigning - Error fetching contract:', contractError);
        throw contractError;
      }

      if (!contractData) {
        console.log('useContractSigning - Contract not found in any table:', contractId);
        setContract(null);
        setLoading(false);
        return;
      }

      console.log('useContractSigning - Contract data found:', contractData);
      setContract(contractData);

      // Create mock signature fields since we don't have a signature_fields table
      const mockSignatureFields: SignatureField[] = [
        {
          id: 1,
          label: 'Artist Signature',
          type: 'signature',
          required: true,
          page: 1,
          x: 100,
          y: 400,
          width: 200,
          height: 50,
          font_size: 12
        },
        {
          id: 2,
          label: 'Date Signed',
          type: 'date',
          required: true,
          page: 1,
          x: 350,
          y: 400,
          width: 150,
          height: 30,
          font_size: 12
        }
      ];

      console.log('useContractSigning - Using mock signature fields');
      setSignatureFields(mockSignatureFields);

      // Check for signature record in contract_signatures table
      const { data: signatureRecordData, error: signatureRecordError } = await supabase
        .from('contract_signatures')
        .select('*')
        .eq('contract_id', contractId)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (signatureRecordError && signatureRecordError.code !== 'PGRST116') {
        console.error('useContractSigning - Error fetching signature record:', signatureRecordError);
      }

      console.log('useContractSigning - Signature record data:', signatureRecordData);
      
      // Transform the contract_signatures data to match SignatureRecord interface
      if (signatureRecordData) {
        const transformedRecord: SignatureRecord = {
          id: signatureRecordData.id,
          contract_id: signatureRecordData.contract_id,
          artist_id: signatureRecordData.user_id,
          status: signatureRecordData.status as 'pending_artist_signature' | 'pending_admin_signature' | 'completed',
          created_at: signatureRecordData.created_at,
          updated_at: signatureRecordData.updated_at,
          signed_by_artist_at: signatureRecordData.user_signed_at,
          signed_by_admin_at: signatureRecordData.admin_signed_at,
          embedded_signatures: null
        };
        setSignatureRecord(transformedRecord);
      } else {
        setSignatureRecord(null);
      }

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

  const handleFieldComplete = (fieldId: number, value: string) => {
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
