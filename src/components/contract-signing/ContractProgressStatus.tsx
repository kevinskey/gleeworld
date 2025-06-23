
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
  signatureFields, 
  embeddedSignatures, 
  getCompletionProgress 
}: ContractProgressStatusProps) => {
  if (signatureRecord && signatureFields.length > 0 && embeddedSignatures.length === 0) {
    return (
      <div className="text-center text-sm text-gray-600 bg-gray-50 p-3 rounded">
        Progress: {getCompletionProgress()}
      </div>
    );
  }

  if (embeddedSignatures.length > 0) {
    const artistSignature = embeddedSignatures.find(sig => sig.signerType === 'artist');
    const adminSignature = embeddedSignatures.find(sig => sig.signerType === 'admin');
    
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
