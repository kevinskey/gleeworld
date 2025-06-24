
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { useState } from "react";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Don't show signature fields if already signed
  if (signatureRecord?.status === 'pending_admin_signature' || signatureRecord?.status === 'completed') {
    return null;
  }

  // Don't show admin fields during artist signing phase
  if (isAdminOrAgentField(field)) {
    return null;
  }

  const isCompleted = !!completedFields[field.id];
  
  const handleSignatureSubmit = async () => {
    if (!currentSignature || currentSignature === 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==') {
      console.log('No valid signature to submit');
      toast({
        title: "No Signature",
        description: "Please provide a signature before submitting",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    console.log('Starting signature submission for field', field.id);

    try {
      // Complete the field locally first
      onFieldComplete(field.id, currentSignature);
      
      // Get contract ID from URL
      const pathParts = window.location.pathname.split('/');
      const contractId = pathParts[pathParts.length - 1];
      
      if (!contractId || contractId === 'contract-signing') {
        throw new Error('No contract ID found in URL');
      }

      console.log('Attempting to submit signature for contract:', contractId);

      // Call the artist-sign-contract function
      const { data, error } = await supabase.functions.invoke('artist-sign-contract', {
        body: {
          contractId: contractId,
          signatureData: currentSignature,
          dateSigned: new Date().toLocaleDateString()
        }
      });

      if (error) {
        console.error('Error submitting signature:', error);
        throw error;
      }

      console.log('Signature submitted successfully:', data);
      
      toast({
        title: "Signature Submitted!",
        description: "Your signature has been successfully recorded.",
      });

      // Reload the page to show updated status
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('Failed to submit signature:', error);
      toast({
        title: "Signature Failed",
        description: error.message || "Failed to submit signature. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
              disabled={isSubmitting}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setCurrentSignature(null)}
                disabled={isSubmitting || !currentSignature}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Clear
              </button>
              <button
                onClick={handleSignatureSubmit}
                disabled={!currentSignature || isSubmitting}
                className={`px-4 py-2 rounded transition-colors ${
                  currentSignature && !isSubmitting
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Signature'}
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
