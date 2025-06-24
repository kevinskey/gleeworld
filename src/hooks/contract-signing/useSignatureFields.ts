
import { useState } from "react";
import type { SignatureField } from "@/types/contractSigning";

export const useSignatureFields = () => {
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
  const [completedFields, setCompletedFields] = useState<{ [fieldId: number]: string }>({});

  const initializeMockSignatureFields = () => {
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

    console.log('useSignatureFields - Using mock signature fields');
    setSignatureFields(mockSignatureFields);
  };

  const handleFieldComplete = (fieldId: number, value: string) => {
    console.log(`useSignatureFields - Field ${fieldId} completed with value:`, value);
    setCompletedFields(prev => ({ ...prev, [fieldId]: value }));
  };

  const isAdminOrAgentField = (field: SignatureField) => {
    const adminOrAgentFieldTypes = ['date', 'text', 'username'];
    return adminOrAgentFieldTypes.includes(field.type);
  };

  const isArtistDateField = (field: SignatureField) => {
    return field.type === 'date' && !isAdminOrAgentField(field);
  };

  return {
    signatureFields,
    completedFields,
    initializeMockSignatureFields,
    handleFieldComplete,
    isAdminOrAgentField,
    isArtistDateField
  };
};
