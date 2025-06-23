
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

interface ContractContentRendererProps {
  contract: Contract;
  signatureFields: SignatureField[];
  completedFields: Record<number, string>;
  signatureRecord: any;
  isAdminOrAgentField: (field: SignatureField) => boolean;
  isArtistDateField: (field: SignatureField) => boolean;
  onFieldComplete: (fieldId: number, value: string) => void;
  getCompletionProgress: () => string;
}

export const ContractContentRenderer = ({ 
  contract, 
  signatureFields, 
  completedFields, 
  signatureRecord, 
  isAdminOrAgentField, 
  isArtistDateField, 
  onFieldComplete,
  getCompletionProgress
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

  const renderContractWithEmbeddedFields = () => {
    const content = contract?.content || '';
    let cleanContent = content.replace(/Signature Fields: \[.*?\]/g, '').trim();
    
    const lines = cleanContent.split('\n');
    const processedLines: (string | JSX.Element)[] = [];
    
    lines.forEach((line, index) => {
      processedLines.push(line);
      
      if (line.toLowerCase().includes('artist:')) {
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
      
      if ((index === lines.length - 1 || line.toLowerCase().includes('date executed')) && 
          signatureFields.some(f => isArtistDateField(f))) {
        
        const dateField = signatureFields.find(f => isArtistDateField(f));
        if (dateField) {
          processedLines.push(
            <div key={`date-${dateField.id}`}>
              {renderEmbeddedSignatureField(dateField)}
            </div>
          );
        }
      }
    });
    
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
        
        {!signatureRecord && signatureFields.length > 0 && (
          <div className="text-center text-sm text-gray-600 bg-gray-50 p-3 rounded">
            Progress: {getCompletionProgress()}
          </div>
        )}
      </div>
    );
  };

  return renderContractWithEmbeddedFields();
};
