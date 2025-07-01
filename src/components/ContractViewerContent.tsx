
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
    
    console.log('ContractViewerContent processing contract:', {
      title: contract?.title,
      status: contract?.status,
      contentLength: content.length,
      hasContent: !!content
    });

    // For draft contracts, display content as-is without signature processing
    if (contract?.status === 'draft') {
      console.log('Processing draft contract, displaying content as-is');
      return content.split('\n').map((line, index) => (
        <div key={index} dangerouslySetInnerHTML={{ __html: line.replace(/\n/g, '<br>') }} />
      ));
    }
    
    // Extract embedded signatures from contract content for completed contracts
    let embeddedSignatures: EmbeddedSignature[] = [];
    const signatureMatch = content.match(/\[EMBEDDED_SIGNATURES\](.*?)\[\/EMBEDDED_SIGNATURES\]/s);
    if (signatureMatch) {
      try {
        embeddedSignatures = JSON.parse(signatureMatch[1]);
        console.log('Found embedded signatures:', embeddedSignatures);
      } catch (e) {
        console.error('Error parsing embedded signatures in viewer:', e);
      }
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
      // Add artist signature after lines containing "Artist:" or "Signature" (but not admin lines)
      if ((line.toLowerCase().includes('artist:') || 
           (line.toLowerCase().includes('signature') && 
            !line.toLowerCase().includes('dr.') && 
            !line.toLowerCase().includes('kevin') && 
            !line.toLowerCase().includes('johnson'))) && 
          artistSignature) {
        
        processedLines.push(line);
        processedLines.push(
          <div key={`embedded-artist-signature-${artistSignature.fieldId}`} className="my-4">
            <EmbeddedSignatureDisplay signature={artistSignature} />
          </div>
        );
        return;
      }
      
      // Add admin signature before lines containing "Dr. Kevin P. Johnson"
      if (line.includes('Printed Name:') && line.includes('Dr. Kevin P. Johnson') && adminSignature) {
        // Add admin signature BEFORE this line
        processedLines.push(
          <div key={`embedded-admin-signature-${adminSignature.fieldId}`} className="mb-4">
            <EmbeddedSignatureDisplay signature={adminSignature} />
          </div>
        );
        
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
      
      // Add date signature if this is the last line or contains "date executed"
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
          <h4 className="font-semibold mb-2">Administrator Signature:</h4>
          <EmbeddedSignatureDisplay signature={adminSignature} />
        </div>
      );
    }
    
    // If artist signature exists but wasn't placed above, add it at the end
    if (artistSignature && !processedLines.some(line => 
      typeof line === 'object' && line.key && line.key.includes('artist-signature')
    )) {
      processedLines.push(
        <div key={`embedded-artist-signature-fallback-${artistSignature.fieldId}`} className="mt-6">
          <h4 className="font-semibold mb-2">Artist Signature:</h4>
          <EmbeddedSignatureDisplay signature={artistSignature} />
        </div>
      );
    }
    
    return processedLines;
  };

  // Ensure we have a contract before processing
  if (!contract) {
    console.log('ContractViewerContent: No contract provided');
    return <div className="p-4 text-gray-500">No contract content available</div>;
  }

  if (!contract.content) {
    console.log('ContractViewerContent: Contract has no content');
    return <div className="p-4 text-gray-500">Contract content is empty</div>;
  }

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
