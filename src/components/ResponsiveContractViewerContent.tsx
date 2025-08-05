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
    // First, let's clean up the content and handle it as a whole document
    const cleanContent = content
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\r/g, '\n')    // Normalize line endings
      .trim();

    // Split into logical sections rather than individual lines
    const sections = cleanContent.split(/\n\s*\n/); // Split on double newlines (paragraph breaks)
    const processedElements: JSX.Element[] = [];
    let elementIndex = 0;

    sections.forEach((section, sectionIndex) => {
      const trimmedSection = section.trim();
      
      if (!trimmedSection) return;

      // Handle different types of content sections
      const lines = trimmedSection.split('\n').map(line => line.trim()).filter(line => line);
      
      // Check if this is a single-line special element
      if (lines.length === 1) {
        const line = lines[0];
        
        // Main title (all caps, standalone)
        if (line.toUpperCase() === line && 
            line.length > 10 && 
            !line.includes('{{') &&
            !line.includes('Article') &&
            !line.includes(':') &&
            !line.includes('_')) {
          processedElements.push(
            <h1 key={`title-${elementIndex++}`} className="text-center font-bold text-xl md:text-2xl lg:text-3xl mb-8 mt-8 first:mt-0 break-words">
              {line}
            </h1>
          );
          return;
        }

        // Article headers
        if (line.match(/^Article \d+\./)) {
          processedElements.push(
            <h2 key={`article-${elementIndex++}`} className="font-bold text-lg md:text-xl mb-4 mt-8 break-words">
              {line}
            </h2>
          );
          return;
        }

        // Section headers (lines ending with colon)
        if (line.endsWith(':') && line.length < 50) {
          processedElements.push(
            <h3 key={`section-${elementIndex++}`} className="font-semibold text-base md:text-lg mb-3 mt-6 break-words">
              {line}
            </h3>
          );
          return;
        }

        // Signature lines or form fields
        if (line.includes('____') || line.match(/^[A-Z\s]+\s+HOST$/)) {
          processedElements.push(
            <div key={`signature-${elementIndex++}`} className="my-6 text-center">
              <div className="font-medium text-sm md:text-base break-words">
                {line}
              </div>
            </div>
          );
          return;
        }

        // Exhibit sections
        if (line.match(/^Exhibit [A-Z]/)) {
          processedElements.push(
            <h2 key={`exhibit-${elementIndex++}`} className="font-bold text-lg md:text-xl mb-6 mt-8 text-center break-words">
              {line}
            </h2>
          );
          return;
        }
      }

      // For multi-line sections, join them into paragraphs
      const paragraphText = lines.join(' ').trim();
      
      if (paragraphText) {
        // Check if it's a list section (all lines start with bullets or numbers)
        const isListSection = lines.every(line => 
          line.match(/^[\•·\-\*]\s/) || 
          line.match(/^\d+\.\s/) || 
          line.match(/^[a-z]\.\s/)
        );

        if (isListSection) {
          // Render as list items
          processedElements.push(
            <div key={`list-section-${elementIndex++}`} className="mb-4">
              {lines.map((line, lineIndex) => (
                <div key={`list-item-${lineIndex}`} className="ml-4 mb-2 text-sm md:text-base break-words">
                  {line}
                </div>
              ))}
            </div>
          );
        } else {
          // Render as paragraph
          processedElements.push(
            <p key={`paragraph-${elementIndex++}`} className="mb-4 leading-relaxed text-sm md:text-base break-words hyphens-auto">
              {paragraphText}
            </p>
          );
        }
      }
    });

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
      <div className="contract-content font-serif leading-relaxed text-gray-900 w-full">
        <style dangerouslySetInnerHTML={{
          __html: `
            .contract-content {
              line-height: 1.7;
              color: #1a1a1a;
              word-wrap: break-word;
              overflow-wrap: break-word;
              width: 100%;
            }
            .contract-content h1, .contract-content h2, .contract-content h3 {
              color: #000;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            .contract-content p {
              word-wrap: break-word;
              overflow-wrap: break-word;
              white-space: normal;
              width: 100%;
              max-width: 100%;
            }
            .contract-content .break-words {
              word-wrap: break-word;
              overflow-wrap: break-word;
              white-space: normal;
            }
            .contract-content .hyphens-auto {
              hyphens: auto;
              -webkit-hyphens: auto;
              -ms-hyphens: auto;
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
                line-height: 1.6;
              }
              .contract-content h1 {
                font-size: 20px;
              }
              .contract-content h2 {
                font-size: 18px;
              }
            }
          `
        }} />
        <div className="w-full max-w-none overflow-wrap-anywhere">
          {processContractContent()}
        </div>
      </div>
    </DocumentContainer>
  );
};