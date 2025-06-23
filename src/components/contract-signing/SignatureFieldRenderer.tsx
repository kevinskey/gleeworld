
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { useState } from "react";

interface SignatureField {
  id: number;
  label: string;
  type: 'signature' | 'date' | 'text' | 'initials' | 'username';
  page: number;
  x: number;
  y: number;
  required: boolean;
}

interface SignatureFieldRendererProps {
  field: SignatureField;
  completedFields: Record<number, string>;
  signatureRecord: any;
  isAdminOrAgentField: (field: SignatureField) => boolean;
  onFieldComplete: (fieldId: number, value: string) => void;
}

export const SignatureFieldRenderer = ({ 
  field, 
  completedFields, 
  signatureRecord, 
  isAdminOrAgentField, 
  onFieldComplete 
}: SignatureFieldRendererProps) => {
  const [currentSignature, setCurrentSignature] = useState<string | null>(null);

  // Don't show signature fields if already signed
  if (signatureRecord?.status === 'pending_admin_signature' || signatureRecord?.status === 'completed') {
    return null;
  }

  // Don't show admin fields during artist signing phase
  if (isAdminOrAgentField(field)) {
    return null;
  }

  const isCompleted = !!completedFields[field.id];
  
  if (field.type === 'signature') {
    return (
      <div className="my-6 p-4 border-2 border-gray-300 rounded-lg bg-gray-50">
        <div className="mb-2 font-medium text-gray-700">{field.label}</div>
        {isCompleted ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700">
            ✓ Signature completed
          </div>
        ) : (
          <div className="space-y-3">
            <SignatureCanvas 
              onSignatureChange={(signature) => {
                console.log('Signature captured for field', field.id, signature ? 'with data' : 'cleared');
                setCurrentSignature(signature);
              }}
              disabled={false}
            />
            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (currentSignature && currentSignature !== 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==') {
                    console.log('Completing signature for field', field.id);
                    onFieldComplete(field.id, currentSignature);
                  } else {
                    console.log('No valid signature to complete');
                  }
                }}
                disabled={!currentSignature}
                className={`px-4 py-2 rounded transition-colors ${
                  currentSignature 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Complete Signature
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  if (field.type === 'date') {
    return (
      <div className="my-4 p-3 border border-gray-300 rounded bg-gray-50">
        <div className="mb-2 font-medium text-gray-700">{field.label}</div>
        {isCompleted ? (
          <div className="text-gray-900 font-medium">{completedFields[field.id]}</div>
        ) : (
          <div className="flex gap-2">
            <input
              type="date"
              onChange={(e) => onFieldComplete(field.id, e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded"
            />
            <button 
              onClick={() => onFieldComplete(field.id, new Date().toLocaleDateString())}
              className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
            >
              Today
            </button>
          </div>
        )}
      </div>
    );
  }
  
  return null;
};
