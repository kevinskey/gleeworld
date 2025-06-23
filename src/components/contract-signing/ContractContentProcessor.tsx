
import { SignatureFieldRenderer } from "./SignatureFieldRenderer";
import { EmbeddedSignatureDisplay } from "./EmbeddedSignatureDisplay";
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

interface ContractContentProcessorProps {
  contract: Contract;
  signatureFields: SignatureField[];
  completedFields: Record<number, string>;
  signatureRecord: any;
  isAdminOrAgentField: (field: SignatureField) => boolean;
  isArtistDateField: (field: SignatureField) => boolean;
  onFieldComplete: (fieldId: number, value: string) => void;
  embeddedSignatures: EmbeddedSignature[];
}

export const ContractContentProcessor = ({
  contract,
  signatureFields,
  completedFields,
  signatureRecord,
  isAdminOrAgentField,
  isArtistDateField,
  onFieldComplete,
  embeddedSignatures
}: ContractContentProcessorProps) => {
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

  const processContractContent = () => {
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
              <EmbeddedSignatureDisplay signature={artistSignature} />
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
          <EmbeddedSignatureDisplay signature={adminSignature} />
        </div>
      );
    }
    
    return processedLines;
  };

  return (
    <div 
      className={`whitespace-pre-wrap border rounded-lg p-4 md:p-8 bg-white ${
        isMobile ? 'min-h-[400px] text-sm' : 'min-h-[600px]'
      }`}
    >
      {processContractContent().map((item, index) => (
        <div key={index}>
          {typeof item === 'string' ? (
            <div dangerouslySetInnerHTML={{ __html: item.replace(/\n/g, '<br>') }} />
          ) : (
            item
          )}
        </div>
      ))}
    </div>
  );
};
