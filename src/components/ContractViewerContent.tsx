
import { EmbeddedSignatureDisplay } from "./contract-signing/EmbeddedSignatureDisplay";

interface EmbeddedSignature {
  fieldId: number;
  signatureData: string;
  dateSigned: string;
  ipAddress?: string;
  timestamp: string;
  signerType?: 'artist' | 'admin';
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
    
    // Extract embedded signatures
    let embeddedSignatures: EmbeddedSignature[] = [];
    const signatureMatch = content.match(/\[EMBEDDED_SIGNATURES\](.*?)\[\/EMBEDDED_SIGNATURES\]/s);
    if (signatureMatch) {
      try {
        embeddedSignatures = JSON.parse(signatureMatch[1]);
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
    
    lines.forEach((line, index) => {
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
