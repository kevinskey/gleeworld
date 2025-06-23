
interface EmbeddedSignature {
  fieldId: number;
  signatureData: string;
  dateSigned: string;
  ipAddress?: string;
  timestamp: string;
  signerType?: 'artist' | 'admin';
}

interface EmbeddedSignatureDisplayProps {
  signature: EmbeddedSignature;
}

export const EmbeddedSignatureDisplay = ({ signature }: EmbeddedSignatureDisplayProps) => {
  const signerLabel = signature.signerType === 'admin' ? 'Admin Signature' : 'Artist Signature';
  const borderColor = signature.signerType === 'admin' ? 'border-blue-300 bg-blue-50' : 'border-green-300 bg-green-50';
  const textColor = signature.signerType === 'admin' ? 'text-blue-700' : 'text-green-700';
  
  return (
    <div key={`${signature.fieldId}-${signature.signerType}`} className={`my-4 p-4 border-2 rounded-lg ${borderColor}`}>
      <div className={`mb-2 font-medium ${textColor}`}>✓ {signerLabel} Applied</div>
      {signature.signatureData.startsWith('data:image') ? (
        <img 
          src={signature.signatureData} 
          alt={`${signerLabel} Signature`} 
          className="max-w-xs h-16 border rounded"
        />
      ) : (
        <div className="text-sm text-gray-600">Digital signature applied</div>
      )}
      <div className="text-xs text-gray-600 mt-2">
        Signed on: {signature.dateSigned}
        <br />
        Timestamp: {new Date(signature.timestamp).toLocaleString()}
      </div>
    </div>
  );
};
