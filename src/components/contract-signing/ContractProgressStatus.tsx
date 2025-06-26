
interface EmbeddedSignature {
  fieldId: number;
  signatureData: string;
  dateSigned: string;
  ipAddress?: string;
  timestamp: string;
  signerType?: 'artist' | 'admin';
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

interface ContractProgressStatusProps {
  signatureRecord: any;
  signatureFields: SignatureField[];
  embeddedSignatures: EmbeddedSignature[];
  getCompletionProgress: () => string;
}

export const ContractProgressStatus = ({ 
  signatureRecord, 
  signatureFields = [], 
  embeddedSignatures = [], 
  getCompletionProgress 
}: ContractProgressStatusProps) => {
  // Ensure all props are properly defined with fallbacks
  const safeSignatureFields = Array.isArray(signatureFields) ? signatureFields : [];
  const safeEmbeddedSignatures = Array.isArray(embeddedSignatures) ? embeddedSignatures : [];
  
  // Only show progress if we have signature record and fields but no embedded signatures
  if (signatureRecord && safeSignatureFields.length > 0 && safeEmbeddedSignatures.length === 0) {
    return (
      <div className="text-center text-sm text-gray-600 bg-gray-50 p-3 rounded">
        Progress: {getCompletionProgress ? getCompletionProgress() : '0/0'}
      </div>
    );
  }

  // Show completion status if we have embedded signatures
  if (safeEmbeddedSignatures.length > 0) {
    const artistSignature = safeEmbeddedSignatures.find(sig => sig.signerType === 'artist');
    const adminSignature = safeEmbeddedSignatures.find(sig => sig.signerType === 'admin');
    
    return (
      <div className="text-center text-sm text-green-600 bg-green-50 p-3 rounded">
        ✓ Document has been signed and signatures are embedded
        {artistSignature && adminSignature && (
          <div className="text-xs mt-1">Both artist and admin signatures are present</div>
        )}
      </div>
    );
  }

  return null;
};
