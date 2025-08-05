import { UniversalDocumentViewer } from "./UniversalDocumentViewer";
import { formatDocumentWithSignatures } from "@/utils/documentProcessor";

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

interface ResponsiveContractViewerContentProps {
  contract: Contract;
}

export const ResponsiveContractViewerContent = ({ contract }: ResponsiveContractViewerContentProps) => {
  // Ensure we have a contract before processing
  if (!contract) {
    console.log('ResponsiveContractViewerContent: No contract provided');
    return <div className="p-4 text-gray-500">No contract content available</div>;
  }

  if (!contract.content) {
    console.log('ResponsiveContractViewerContent: Contract has no content');
    return <div className="p-4 text-gray-500">Contract content is empty</div>;
  }

  const content = contract?.content || '';
  
  console.log('ResponsiveContractViewerContent processing contract:', {
    title: contract?.title,
    status: contract?.status,
    contentLength: content.length,
    hasContent: !!content,
    hasEmbeddedSignatures: content.includes('[EMBEDDED_SIGNATURES]')
  });

  // Extract embedded signatures from contract content for completed contracts
  let embeddedSignatures: EmbeddedSignature[] = [];
  const signatureMatch = content.match(/\[EMBEDDED_SIGNATURES\](.*?)\[\/EMBEDDED_SIGNATURES\]/s);
  if (signatureMatch) {
    try {
      const signaturesData = signatureMatch[1];
      console.log('Raw signature data found:', signaturesData);
      embeddedSignatures = JSON.parse(signaturesData);
      console.log('Parsed embedded signatures:', embeddedSignatures);
    } catch (e) {
      console.error('Error parsing embedded signatures in viewer:', e);
      console.log('Failed to parse signature data:', signatureMatch[1]);
    }
  }

  // Format the contract content with signatures using the universal processor
  const processedContent = formatDocumentWithSignatures(content, embeddedSignatures, 'contract');

  return (
    <UniversalDocumentViewer documentType="contract">
      {processedContent}
    </UniversalDocumentViewer>
  );
};