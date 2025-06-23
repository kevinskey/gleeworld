
import { SignatureFieldRenderer } from "./SignatureFieldRenderer";
import { useIsMobile } from "@/hooks/use-mobile";

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

interface ContractContentRendererProps {
  contract: Contract;
  signatureFields: SignatureField[];
  completedFields: Record<number, string>;
  signatureRecord: any;
  isAdminOrAgentField: (field: SignatureField) => boolean;
  isArtistDateField: (field: SignatureField) => boolean;
  onFieldComplete: (fieldId: number, value: string) => void;
  getCompletionProgress: () => string;
  embeddedSignatures?: EmbeddedSignature[];
}

export const ContractContentRenderer = ({ 
  contract, 
  signatureFields, 
  completedFields, 
  signatureRecord, 
  isAdminOrAgentField, 
  isArtistDateField, 
  onFieldComplete,
  getCompletionProgress,
  embeddedSignatures = []
}: ContractContentRendererProps) => {
  const isMobile = useIsMobile();

  const renderEmbeddedSignatureField = (field: SignatureField) => {
    return (
      <SignatureFieldRenderer
        field={field}
        completedFields={completedFields}
        signatureRecord={signatureRecord}
        isAdminOrAgentField={isAdminOrAgentField}
        onFieldComplete={onFieldComplete}
      />
    );
  };

  const renderEmbeddedSignatureDisplay = (signature: EmbeddedSignature) => {
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

  const renderContractWithEmbeddedFields = () => {
    const content = contract?.content || '';
    
    // Remove embedded signatures section from display and clean up signature fields text
    let cleanContent = content
      .replace(/\[EMBEDDED_SIGNATURES\].*?\[\/EMBEDDED_SIGNATURES\]/gs, '')
      .replace(/Signature Fields: \[.*?\]/g, '')
      .trim();
    
    const lines = cleanContent.split('\n');
    const processedLines: (string | JSX.Element)[] = [];
    
    // Get signatures by type
    const artistSignature = embeddedSignatures.find(sig => sig.signerType === 'artist');
    const adminSignature = embeddedSignatures.find(sig => sig.signerType === 'admin');
    
    lines.forEach((line, index) => {
      processedLines.push(line);
      
      if (line.toLowerCase().includes('artist:') || line.toLowerCase().includes('signature')) {
        if (artistSignature) {
          // Show the embedded artist signature
          processedLines.push(
            <div key={`embedded-artist-signature-${artistSignature.fieldId}`}>
              {renderEmbeddedSignatureDisplay(artistSignature)}
            </div>
          );
        } else {
          // Show signature field for signing
          const artistSignatureField = signatureFields.find(f => 
            f.type === 'signature' && 
            (f.label.toLowerCase().includes('artist') || f.id === 1) &&
            !isAdminOrAgentField(f)
          );
          
          if (artistSignatureField) {
            processedLines.push(
              <div key={`signature-${artistSignatureField.id}`}>
                {renderEmbeddedSignatureField(artistSignatureField)}
              </div>
            );
          }
        }
      }
      
      if ((index === lines.length - 1 || line.toLowerCase().includes('date executed')) && 
          signatureFields.some(f => isArtistDateField(f))) {
        
        // Check if we have an embedded date signature
        const embeddedDateSignature = embeddedSignatures.find(sig => sig.fieldId === 2);
        
        if (embeddedDateSignature) {
          processedLines.push(
            <div key={`embedded-date-${embeddedDateSignature.fieldId}`} className="my-2 p-2 bg-blue-50 rounded">
              <span className="text-sm font-medium text-blue-700">Date Signed: {embeddedDateSignature.dateSigned}</span>
            </div>
          );
        } else {
          const dateField = signatureFields.find(f => isArtistDateField(f));
          if (dateField && !embeddedSignatures.some(sig => sig.fieldId === 1)) {
            processedLines.push(
              <div key={`date-${dateField.id}`}>
                {renderEmbeddedSignatureField(dateField)}
              </div>
            );
          }
        }
      }
    });
    
    // Add admin signature at the end if it exists
    if (adminSignature) {
      processedLines.push(
        <div key={`embedded-admin-signature-${adminSignature.fieldId}`}>
          {renderEmbeddedSignatureDisplay(adminSignature)}
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        <div 
          className={`whitespace-pre-wrap border rounded-lg p-4 md:p-8 bg-white ${
            isMobile ? 'min-h-[400px] text-sm' : 'min-h-[600px]'
          }`}
        >
          {processedLines.map((item, index) => (
            <div key={index}>
              {typeof item === 'string' ? (
                <div dangerouslySetInnerHTML={{ __html: item.replace(/\n/g, '<br>') }} />
              ) : (
                item
              )}
            </div>
          ))}
        </div>
        
        {!signatureRecord && signatureFields.length > 0 && embeddedSignatures.length === 0 && (
          <div className="text-center text-sm text-gray-600 bg-gray-50 p-3 rounded">
            Progress: {getCompletionProgress()}
          </div>
        )}

        {embeddedSignatures.length > 0 && (
          <div className="text-center text-sm text-green-600 bg-green-50 p-3 rounded">
            ✓ Document has been signed and signatures are embedded
            {artistSignature && adminSignature && (
              <div className="text-xs mt-1">Both artist and admin signatures are present</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return renderContractWithEmbeddedFields();
};
