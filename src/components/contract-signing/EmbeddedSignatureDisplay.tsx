
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
  
  console.log('Rendering signature:', signature.signerType, 'Data:', signature.signatureData?.substring(0, 50));
  
  return (
    <div key={`${signature.fieldId}-${signature.signerType}`} className={`my-4 p-4 border-2 rounded-lg ${borderColor}`}>
      <div className={`mb-2 font-medium ${textColor}`}>✓ {signerLabel} Applied</div>
      {signature.signatureData && signature.signatureData.startsWith('data:image') ? (
        <img 
          src={signature.signatureData} 
          alt={`${signerLabel}`} 
          className="max-w-xs h-16 border rounded bg-white p-1"
          style={{ maxWidth: '200px', height: '60px' }}
          onError={(e) => {
            console.error('Image failed to load:', e);
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextSibling.style.display = 'block';
          }}
        />
      ) : null}
      {signature.signatureData && !signature.signatureData.startsWith('data:image') ? (
        <div className="font-cursive text-2xl text-gray-800 bg-white p-2 border rounded max-w-xs">
          {signature.signatureData}
        </div>
      ) : signature.signatureData && signature.signatureData.startsWith('data:image') ? (
        <div className="text-sm text-gray-600 bg-white p-2 border rounded max-w-xs" style={{ display: 'none' }}>
          [Signature Image]
        </div>
      ) : (
        <div className="text-sm text-gray-600 bg-white p-2 border rounded max-w-xs">
          Digital signature applied
        </div>
      )}
      <div className="text-xs text-gray-600 mt-2">
        Signed on: {signature.dateSigned}
        <br />
        Timestamp: {new Date(signature.timestamp).toLocaleString()}
      </div>
    </div>
  );
};
