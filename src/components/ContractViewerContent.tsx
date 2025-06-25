
import { EmbeddedSignatureDisplay } from "./contract-signing/EmbeddedSignatureDisplay";

interface EmbeddedSignature {
  fieldId: number;
  signatureData: string;
  dateSigned: string;
  ipAddress?: string;
  timestamp: string;
  signerType?: 'artist' | 'admin';
  signerName?: string;
}

interface Contract {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
}

interface ContractViewerContentProps {
  contract: Contract;
}

export const ContractViewerContent = ({ contract }: ContractViewerContentProps) => {
  const processContractContent = () => {
    const content = contract?.content || '';
    
    // Extract embedded signatures from contract content
    let embeddedSignatures: EmbeddedSignature[] = [];
    const signatureMatch = content.match(/\[EMBEDDED_SIGNATURES\](.*?)\[\/EMBEDDED_SIGNATURES\]/s);
    if (signatureMatch) {
      try {
        embeddedSignatures = JSON.parse(signatureMatch[1]);
      } catch (e) {
        console.error('Error parsing embedded signatures in viewer:', e);
      }
    }
    
    // If no embedded signatures in content, check if we need to fetch from signature record
    if (embeddedSignatures.length === 0 && contract.status === 'completed') {
      // This will be handled by fetching signature record data in the parent component
      console.log('No embedded signatures found in content for completed contract');
    }
    
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
    
    console.log('ContractViewerContent - Processing signatures:', {
      totalSignatures: embeddedSignatures.length,
      artistSignature: !!artistSignature,
      adminSignature: !!adminSignature
    });
    
    lines.forEach((line, index) => {
      // Check if this line contains "Printed Name: Dr. Kevin P. Johnson"
      if (line.includes('Printed Name:') && line.includes('Dr. Kevin P. Johnson')) {
        // Add admin signature BEFORE this line
        if (adminSignature) {
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
          processedLines.push(
            <div key={`embedded-artist-signature-${artistSignature.fieldId}`}>
              <EmbeddedSignatureDisplay signature={artistSignature} />
            </div>
          );
        }
      }
      
      // Add date signature if embedded
      if ((index === lines.length - 1 || line.toLowerCase().includes('date executed')) && artistSignature) {
        const embeddedDateSignature = embeddedSignatures.find(sig => sig.fieldId === 2);
        if (embeddedDateSignature) {
          processedLines.push(
            <div key={`embedded-date-${embeddedDateSignature.fieldId}`} className="my-2 p-2 bg-blue-50 rounded">
              <span className="text-sm font-medium text-blue-700">Date Signed: {embeddedDateSignature.dateSigned}</span>
            </div>
          );
        }
      }
    });
    
    // If admin signature exists but wasn't placed above, add it at the end
    if (adminSignature && !processedLines.some(line => 
      typeof line === 'object' && line.key && line.key.includes('admin-signature')
    )) {
      processedLines.push(
        <div key={`embedded-admin-signature-fallback-${adminSignature.fieldId}`} className="mt-6">
          <EmbeddedSignatureDisplay signature={adminSignature} />
        </div>
      );
    }
    
    return processedLines;
  };

  return (
    <div className="whitespace-pre-wrap border rounded-lg p-4 md:p-8 bg-white min-h-[400px]">
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
