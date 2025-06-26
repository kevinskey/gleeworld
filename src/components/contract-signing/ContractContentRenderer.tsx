
import { ContractContentProcessor } from "./ContractContentProcessor";
import { ContractProgressStatus } from "./ContractProgressStatus";

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
  // Ensure embeddedSignatures is always an array - double safety check
  const safeEmbeddedSignatures = Array.isArray(embeddedSignatures) ? embeddedSignatures : [];
  
  return (
    <div className="space-y-2">
      <ContractContentProcessor
        contract={contract}
        signatureFields={signatureFields}
        completedFields={completedFields}
        signatureRecord={signatureRecord}
        isAdminOrAgentField={isAdminOrAgentField}
        isArtistDateField={isArtistDateField}
        onFieldComplete={onFieldComplete}
        embeddedSignatures={safeEmbeddedSignatures}
      />
      
      <ContractProgressStatus
        signatureRecord={signatureRecord}
        signatureFields={signatureFields}
        embeddedSignatures={safeEmbeddedSignatures}
        getCompletionProgress={getCompletionProgress}
      />
    </div>
  );
};
