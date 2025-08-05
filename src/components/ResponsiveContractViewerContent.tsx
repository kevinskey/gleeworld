import { EmbeddedSignatureDisplay } from "./contract-signing/EmbeddedSignatureDisplay";
import { DocumentContainer } from "./DocumentContainer";

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
  const processContractContent = () => {
    const content = contract?.content || '';
    
    console.log('ResponsiveContractViewerContent processing contract:', {
      title: contract?.title,
      status: contract?.status,
      contentLength: content.length,
      hasContent: !!content,
      hasEmbeddedSignatures: content.includes('[EMBEDDED_SIGNATURES]')
    });

    // For draft contracts, display content with better formatting
    if (contract?.status === 'draft') {
      console.log('Processing draft contract, displaying content with improved formatting');
      return formatContractContent(content);
    }
    
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
    
    // Remove embedded signatures section from display completely
    let cleanContent = content.replace(/\[EMBEDDED_SIGNATURES\].*?\[\/EMBEDDED_SIGNATURES\]/gs, '').trim();
    
    return formatContractContentWithSignatures(cleanContent, embeddedSignatures);
  };

  const formatContractContent = (content: string) => {
    const lines = content.split('\n');
    const processedElements: JSX.Element[] = [];
    let currentParagraph: string[] = [];
    let elementIndex = 0;

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ').trim();
        if (paragraphText) {
          processedElements.push(
            <p key={`paragraph-${elementIndex++}`} className="mb-4 leading-relaxed text-sm md:text-base text-justify">
              {paragraphText}
            </p>
          );
        }
        currentParagraph = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Empty line - flush current paragraph and add spacing
      if (!trimmedLine) {
        flushParagraph();
        return;
      }

      // Main title (all caps, standalone)
      if (trimmedLine.toUpperCase() === trimmedLine && 
          trimmedLine.length > 10 && 
          !trimmedLine.includes('{{') &&
          !trimmedLine.includes('Article') &&
          !trimmedLine.includes(':')) {
        flushParagraph();
        processedElements.push(
          <h1 key={`title-${elementIndex++}`} className="text-center font-bold text-lg md:text-xl lg:text-2xl mb-6 mt-8 first:mt-0">
            {trimmedLine}
          </h1>
        );
        return;
      }

      // Article headers
      if (trimmedLine.match(/^Article \d+\./)) {
        flushParagraph();
        processedElements.push(
          <h2 key={`article-${elementIndex++}`} className="font-bold text-base md:text-lg mb-4 mt-8">
            {trimmedLine}
          </h2>
        );
        return;
      }

      // Section headers (lines ending with colon or standalone short lines in title case)
      if ((trimmedLine.endsWith(':') && trimmedLine.length < 50) || 
          (trimmedLine.length < 30 && trimmedLine.match(/^[A-Z][a-z]/) && !trimmedLine.includes('.'))) {
        flushParagraph();
        processedElements.push(
          <h3 key={`section-${elementIndex++}`} className="font-semibold text-sm md:text-base mb-3 mt-6">
            {trimmedLine}
          </h3>
        );
        return;
      }

      // Signature lines or form fields
      if (trimmedLine.includes('____') || trimmedLine.match(/^[A-Z\s]+\s+HOST$/)) {
        flushParagraph();
        processedElements.push(
          <div key={`signature-${elementIndex++}`} className="my-6 text-center">
            <div className="font-medium text-sm md:text-base">
              {trimmedLine}
            </div>
          </div>
        );
        return;
      }

      // Exhibit sections
      if (trimmedLine.match(/^Exhibit [A-Z]/)) {
        flushParagraph();
        processedElements.push(
          <h2 key={`exhibit-${elementIndex++}`} className="font-bold text-base md:text-lg mb-4 mt-8 text-center">
            {trimmedLine}
          </h2>
        );
        return;
      }

      // List items (bullets or numbered)
      if (trimmedLine.match(/^[\•·\-\*]\s/) || trimmedLine.match(/^\d+\.\s/) || trimmedLine.match(/^[a-z]\.\s/)) {
        flushParagraph();
        processedElements.push(
          <div key={`list-${elementIndex++}`} className="ml-4 mb-2 text-sm md:text-base">
            {trimmedLine}
          </div>
        );
        return;
      }

      // Regular content - add to current paragraph
      if (trimmedLine.length > 0) {
        // If the line looks like it should be on its own (very short or special formatting)
        if (trimmedLine.length < 15 && !currentParagraph.length) {
          processedElements.push(
            <div key={`standalone-${elementIndex++}`} className="mb-2 text-sm md:text-base text-center">
              {trimmedLine}
            </div>
          );
        } else {
          currentParagraph.push(trimmedLine);
        }
      }
    });

    // Flush any remaining paragraph
    flushParagraph();

    return processedElements;
  };

  const formatContractContentWithSignatures = (content: string, embeddedSignatures: EmbeddedSignature[]) => {
    const processedElements = formatContractContent(content);
    
    // Get signatures by type
    const artistSignature = embeddedSignatures.find(sig => sig.signerType === 'artist');
    const adminSignature = embeddedSignatures.find(sig => sig.signerType === 'admin');
    
    // Add signatures at the end if they exist
    if (artistSignature) {
      processedElements.push(
        <div key="artist-signature" className="mt-8 mb-6">
          <h4 className="font-semibold mb-3 text-sm md:text-base">Artist Signature:</h4>
          <div className="border-2 border-green-300 bg-green-50 p-4 rounded-lg">
            <div className="text-green-700 font-medium mb-2 text-sm md:text-base">✓ Artist Signature Applied</div>
            {artistSignature.signatureData && artistSignature.signatureData.startsWith('data:image') ? (
              <div className="bg-white p-2 border rounded inline-block">
                <img 
                  src={artistSignature.signatureData} 
                  alt="Artist Signature" 
                  className="max-w-[200px] h-[60px] object-contain"
                />
              </div>
            ) : artistSignature.signatureData ? (
              <div className="font-cursive text-2xl text-gray-800 bg-white p-2 border rounded inline-block">
                {artistSignature.signatureData}
              </div>
            ) : (
              <div className="text-sm text-gray-600 bg-white p-2 border rounded inline-block">
                [Artist Signature Applied]
              </div>
            )}
            <div className="text-xs text-green-600 mt-2">
              Signed on: {artistSignature.dateSigned}
            </div>
          </div>
        </div>
      );
    }
    
    if (adminSignature) {
      processedElements.push(
        <div key="admin-signature" className="mt-6">
          <h4 className="font-semibold mb-3 text-sm md:text-base">Administrator Signature:</h4>
          <div className="border-2 border-blue-300 bg-blue-50 p-4 rounded-lg">
            <div className="text-blue-700 font-medium mb-2 text-sm md:text-base">✓ Admin/Agent Signature Applied</div>
            {adminSignature.signatureData && adminSignature.signatureData.startsWith('data:image') ? (
              <div className="bg-white p-2 border rounded inline-block">
                <img 
                  src={adminSignature.signatureData} 
                  alt="Admin Signature" 
                  className="max-w-[200px] h-[60px] object-contain"
                />
              </div>
            ) : adminSignature.signatureData ? (
              <div className="font-cursive text-2xl text-gray-800 bg-white p-2 border rounded inline-block">
                {adminSignature.signatureData}
              </div>
            ) : (
              <div className="text-sm text-gray-600 bg-white p-2 border rounded inline-block">
                [Dr. Kevin P. Johnson - Admin Signature]
              </div>
            )}
            <div className="text-xs text-blue-600 mt-2">
              Signed on: {adminSignature.dateSigned}
              <br />
              Signed by: Dr. Kevin P. Johnson (Admin)
            </div>
          </div>
        </div>
      );
    }
    
    return processedElements;
  };

  // Ensure we have a contract before processing
  if (!contract) {
    console.log('ResponsiveContractViewerContent: No contract provided');
    return <div className="p-4 text-gray-500">No contract content available</div>;
  }

  if (!contract.content) {
    console.log('ResponsiveContractViewerContent: Contract has no content');
    return <div className="p-4 text-gray-500">Contract content is empty</div>;
  }

  return (
    <DocumentContainer>
      <div className="contract-content font-serif leading-relaxed text-gray-900">
        <style dangerouslySetInnerHTML={{
          __html: `
            .contract-content {
              line-height: 1.6;
              color: #1a1a1a;
            }
            .contract-content h1, .contract-content h2, .contract-content h3 {
              color: #000;
            }
            .contract-content p {
              hyphens: auto;
              word-wrap: break-word;
              overflow-wrap: break-word;
              text-align: justify;
            }
            @media print {
              .contract-content {
                font-size: 12pt;
                line-height: 1.5;
              }
            }
            @media (max-width: 768px) {
              .contract-content {
                font-size: 14px;
                line-height: 1.5;
              }
              .contract-content h1 {
                font-size: 18px;
              }
              .contract-content h2 {
                font-size: 16px;
              }
            }
          `
        }} />
        {processContractContent()}
      </div>
    </DocumentContainer>
  );
};