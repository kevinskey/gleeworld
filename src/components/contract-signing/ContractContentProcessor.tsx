
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
  signerName?: string;
}

interface ContractContentProcessorProps {
  contract: Contract;
  signatureFields: SignatureField[] | null | undefined;
  completedFields: Record<number, string> | null | undefined;
  signatureRecord: any;
  isAdminOrAgentField: (field: SignatureField) => boolean;
  isArtistDateField: (field: SignatureField) => boolean;
  onFieldComplete: (fieldId: number, value: string) => void;
  embeddedSignatures: EmbeddedSignature[] | null | undefined;
}

// Helper function to safely ensure we always have an array
function ensureArray<T>(value: T[] | null | undefined): T[] {
  if (value === null || value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    console.warn('Expected array but got:', typeof value, value);
    return [];
  }
  return value;
}

// Helper function to safely find in array
function safeFindInArray<T>(array: T[] | null | undefined, predicate: (item: T) => boolean): T | null {
  const safeArray = ensureArray(array);
  if (safeArray.length === 0) {
    return null;
  }
  try {
    return safeArray.find(predicate) || null;
  } catch (error) {
    console.error('Error in safeFindInArray:', error);
    return null;
  }
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

  // Early return if contract is not available
  if (!contract) {
    console.warn('ContractContentProcessor: No contract provided');
    return (
      <div className="p-4 text-center text-gray-500">
        No contract data available
      </div>
    );
  }

  // Ensure all arrays are properly initialized with comprehensive fallbacks
  const safeSignatureFields = ensureArray(signatureFields);
  const safeEmbeddedSignatures = ensureArray(embeddedSignatures);
  const safeCompletedFields = (completedFields && typeof completedFields === 'object') ? completedFields : {};

  console.log('ContractContentProcessor: Safe props after processing:', {
    safeSignatureFieldsLength: safeSignatureFields.length,
    safeEmbeddedSignaturesLength: safeEmbeddedSignatures.length,
    safeCompletedFieldsKeys: Object.keys(safeCompletedFields).length
  });

  const renderEmbeddedSignatureField = (field: SignatureField) => {
    if (!field) {
      console.warn('ContractContentProcessor: renderEmbeddedSignatureField called with null/undefined field');
      return null;
    }

    return (
      <SignatureFieldRenderer
        field={field}
        completedFields={safeCompletedFields}
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
    
    // Get signatures by type with enhanced null safety
    let artistSignature = null;
    let adminSignature = null;
    
    try {
      if (safeEmbeddedSignatures.length > 0) {
        artistSignature = safeFindInArray(safeEmbeddedSignatures, sig => sig && sig.signerType === 'artist');
        adminSignature = safeFindInArray(safeEmbeddedSignatures, sig => sig && sig.signerType === 'admin');
      }
    } catch (error) {
      console.error('ContractContentProcessor: Error finding signatures:', error);
      artistSignature = null;
      adminSignature = null;
    }
    
    console.log('ContractContentProcessor: Processing contract content with signatures:', {
      artistSignature: !!artistSignature,
      adminSignature: !!adminSignature,
      totalEmbedded: safeEmbeddedSignatures.length,
      signatureFieldsCount: safeSignatureFields.length,
      contentLength: content.length
    });
    
    lines.forEach((line, index) => {
      // Check if this line contains "Printed Name: Dr. Kevin P. Johnson"
      if (line.includes('Printed Name:') && line.includes('Dr. Kevin P. Johnson')) {
        // Add admin signature BEFORE this line
        if (adminSignature) {
          console.log('ContractContentProcessor: Adding admin signature before printed name line');
          processedLines.push(
            <div key={`embedded-admin-signature-${adminSignature.fieldId}`} className="mb-4">
              <EmbeddedSignatureDisplay signature={adminSignature} />
            </div>
          );
        }
        
        // Add the printed name line
        processedLines.push(line);
        
        // Check if the next line contains "Title:" and align date with it
        if (index + 1 < lines.length && lines[index + 1].includes('Title:')) {
          const titleLine = lines[index + 1];
          processedLines.push(titleLine);
          
          // Skip the title line in the main loop
          lines[index + 1] = '';
          
          // Add date execution line aligned with title
          if (index + 2 < lines.length && lines[index + 2].includes('Date Executed:')) {
            processedLines.push(lines[index + 2]);
            // Skip this line in the main loop
            lines[index + 2] = '';
          }
        }
        return;
      }
      
      // Skip empty lines that we've already processed
      if (line === '') {
        return;
      }
      
      processedLines.push(line);
      
      // Add artist signature after signature-related lines
      if (line.toLowerCase().includes('artist:') || line.toLowerCase().includes('signature')) {
        if (artistSignature) {
          console.log('ContractContentProcessor: Adding artist signature after artist line');
          processedLines.push(
            <div key={`embedded-artist-signature-${artistSignature.fieldId}`}>
              <EmbeddedSignatureDisplay signature={artistSignature} />
            </div>
          );
        } else {
          // Show signature field for signing with enhanced null safety
          let artistSignatureField = null;
          try {
            if (safeSignatureFields.length > 0) {
              artistSignatureField = safeFindInArray(safeSignatureFields, f => 
                f && 
                f.type === 'signature' && 
                (f.label.toLowerCase().includes('artist') || f.id === 1) &&
                !isAdminOrAgentField(f)
              );
            }
          } catch (error) {
            console.error('ContractContentProcessor: Error finding artist signature field:', error);
            artistSignatureField = null;
          }
          
          if (artistSignatureField) {
            console.log('ContractContentProcessor: Adding artist signature field');
            processedLines.push(
              <div key={`signature-${artistSignatureField.id}`}>
                {renderEmbeddedSignatureField(artistSignatureField)}
              </div>
            );
          }
        }
      }
      
      if ((index === lines.length - 1 || line.toLowerCase().includes('date executed')) && 
          safeSignatureFields.length > 0) {
        
        // Check if we have an embedded date signature
        let embeddedDateSignature = null;
        try {
          if (safeEmbeddedSignatures.length > 0) {
            embeddedDateSignature = safeFindInArray(safeEmbeddedSignatures, sig => sig && sig.fieldId === 2);
          }
        } catch (error) {
          console.error('ContractContentProcessor: Error finding embedded date signature:', error);
          embeddedDateSignature = null;
        }
        
        if (embeddedDateSignature) {
          console.log('ContractContentProcessor: Adding embedded date signature');
          processedLines.push(
            <div key={`embedded-date-${embeddedDateSignature.fieldId}`} className="my-2 p-2 bg-blue-50 rounded">
              <span className="text-sm font-medium text-blue-700">Date Signed: {embeddedDateSignature.dateSigned}</span>
            </div>
          );
        } else {
          let dateField = null;
          try {
            if (safeSignatureFields.length > 0) {
              dateField = safeFindInArray(safeSignatureFields, f => f && isArtistDateField(f));
            }
          } catch (error) {
            console.error('ContractContentProcessor: Error finding date field:', error);
            dateField = null;
          }
          
          if (dateField && !safeEmbeddedSignatures.some(sig => sig && sig.fieldId === 1)) {
            console.log('ContractContentProcessor: Adding date field');
            processedLines.push(
              <div key={`date-${dateField.id}`}>
                {renderEmbeddedSignatureField(dateField)}
              </div>
            );
          }
        }
      }
    });
    
    // If admin signature exists but wasn't placed above, add it at the end
    if (adminSignature && !processedLines.some(line => 
      typeof line === 'object' && line && line.key && line.key.includes('admin-signature')
    )) {
      console.log('ContractContentProcessor: Adding admin signature at the end');
      processedLines.push(
        <div key={`embedded-admin-signature-fallback-${adminSignature.fieldId}`} className="mt-6">
          <EmbeddedSignatureDisplay signature={adminSignature} />
        </div>
      );
    }
    
    console.log('ContractContentProcessor: Processed lines count:', processedLines.length);
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
            <div className="whitespace-pre-wrap">
              {item}
            </div>
          ) : (
            item
          )}
        </div>
      ))}
    </div>
  );
};
