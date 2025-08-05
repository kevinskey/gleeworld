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

    // For draft contracts, display content as-is without signature processing
    if (contract?.status === 'draft') {
      console.log('Processing draft contract, displaying content as-is');
      return content.split('\n').map((line, index) => (
        <div key={index} className="leading-relaxed text-sm md:text-base lg:text-base mb-1">
          {line}
        </div>
      ));
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
    } else {
      console.log('No embedded signatures found in contract content');
    }
    
    // Remove embedded signatures section from display completely
    let cleanContent = content.replace(/\[EMBEDDED_SIGNATURES\].*?\[\/EMBEDDED_SIGNATURES\]/gs, '').trim();
    
    const lines = cleanContent.split('\n');
    const processedLines: (string | JSX.Element)[] = [];
    
    // Get signatures by type
    const artistSignature = embeddedSignatures.find(sig => sig.signerType === 'artist');
    const adminSignature = embeddedSignatures.find(sig => sig.signerType === 'admin');
    
    console.log('ResponsiveContractViewerContent - Processing signatures:', {
      totalSignatures: embeddedSignatures.length,
      artistSignature: !!artistSignature,
      adminSignature: !!adminSignature
    });
    
    let artistSignaturePlaced = false;
    let adminSignaturePlaced = false;
    
    lines.forEach((line, index) => {
      // Handle page breaks and document sections
      if (line.trim() === '' && index < lines.length - 1 && lines[index + 1].trim() !== '') {
        // Add spacing for paragraph breaks
        processedLines.push('\n');
        return;
      }

      // Check for headers and titles
      if (line.toUpperCase() === line && line.trim().length > 0 && !line.includes('{{')) {
        processedLines.push(
          <div key={`header-${index}`} className="font-bold text-center text-lg md:text-xl lg:text-2xl mb-4 mt-6 first:mt-0">
            {line}
          </div>
        );
        return;
      }

      // Check for article headers
      if (line.match(/^Article \d+\./)) {
        processedLines.push(
          <div key={`article-${index}`} className="font-bold text-base md:text-lg mb-3 mt-6">
            {line}
          </div>
        );
        return;
      }

      // Check for artist signature placement
      if (!artistSignaturePlaced && artistSignature && (
        line.toLowerCase().includes('artist:') || 
        line.toLowerCase().includes('agreed and accepted by:') ||
        (line.toLowerCase().includes('signature') && 
         !line.toLowerCase().includes('dr.') && 
         !line.toLowerCase().includes('kevin') && 
         !line.toLowerCase().includes('johnson'))
      )) {
        processedLines.push(
          <div key={`line-${index}`} className="leading-relaxed text-sm md:text-base mb-1">
            {line}
          </div>
        );
        processedLines.push(
          <div key={`embedded-artist-signature-${artistSignature.fieldId}`} className="my-4">
            <div className="border-2 border-green-300 bg-green-50 p-3 md:p-4 rounded-lg">
              <div className="text-green-700 font-medium mb-2 text-sm md:text-base">✓ Artist Signature Applied</div>
              {artistSignature.signatureData && artistSignature.signatureData.startsWith('data:image') ? (
                <div className="bg-white p-2 border rounded inline-block">
                  <img 
                    src={artistSignature.signatureData} 
                    alt="Artist Signature" 
                    className="max-w-[150px] md:max-w-[200px] h-[40px] md:h-[60px] object-contain"
                    onError={(e) => {
                      console.error('Failed to load artist signature image:', e);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'block';
                    }}
                  />
                  <div className="text-xs md:text-sm text-gray-600 bg-white p-2 border rounded" style={{ display: 'none' }}>
                    [Artist Signature Applied]
                  </div>
                </div>
              ) : artistSignature.signatureData ? (
                <div className="font-cursive text-xl md:text-2xl text-gray-800 bg-white p-2 border rounded inline-block">
                  {artistSignature.signatureData}
                </div>
              ) : (
                <div className="text-xs md:text-sm text-gray-600 bg-white p-2 border rounded inline-block">
                  [Artist Signature Applied]
                </div>
              )}
              <div className="text-xs text-green-600 mt-2">
                Signed on: {artistSignature.dateSigned}
              </div>
            </div>
          </div>
        );
        artistSignaturePlaced = true;
        return;
      }
      
      // Check for admin signature placement
      if (!adminSignaturePlaced && adminSignature && line.includes('Printed Name:') && line.includes('Dr. Kevin P. Johnson')) {
        processedLines.push(
          <div key={`embedded-admin-signature-${adminSignature.fieldId}`} className="mb-4">
            <div className="border-2 border-blue-300 bg-blue-50 p-3 md:p-4 rounded-lg">
              <div className="text-blue-700 font-medium mb-2 text-sm md:text-base">✓ Admin/Agent Signature Applied</div>
              {adminSignature.signatureData && adminSignature.signatureData.startsWith('data:image') ? (
                <div className="bg-white p-2 border rounded inline-block">
                  <img 
                    src={adminSignature.signatureData} 
                    alt="Admin Signature" 
                    className="max-w-[150px] md:max-w-[200px] h-[40px] md:h-[60px] object-contain"
                    onError={(e) => {
                      console.error('Failed to load admin signature image:', e);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'block';
                    }}
                  />
                  <div className="text-xs md:text-sm text-gray-600 bg-white p-2 border rounded" style={{ display: 'none' }}>
                    [Dr. Kevin P. Johnson - Admin Signature]
                  </div>
                </div>
              ) : adminSignature.signatureData ? (
                <div className="font-cursive text-xl md:text-2xl text-gray-800 bg-white p-2 border rounded inline-block">
                  {adminSignature.signatureData}
                </div>
              ) : (
                <div className="text-xs md:text-sm text-gray-600 bg-white p-2 border rounded inline-block">
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
        adminSignaturePlaced = true;
        
        processedLines.push(
          <div key={`line-${index}`} className="leading-relaxed text-sm md:text-base mb-1">
            {line}
          </div>
        );
        return;
      }
      
      // Standard line processing with responsive text
      processedLines.push(
        <div key={`line-${index}`} className="leading-relaxed text-sm md:text-base mb-1">
          {line}
        </div>
      );
    });
    
    // If signatures weren't placed inline, add them at the end
    if (artistSignature && !artistSignaturePlaced) {
      console.log('Adding artist signature at the end');
      processedLines.push(
        <div key={`embedded-artist-signature-fallback-${artistSignature.fieldId}`} className="mt-6">
          <h4 className="font-semibold mb-2 text-sm md:text-base">Artist Signature:</h4>
          <div className="border-2 border-green-300 bg-green-50 p-3 md:p-4 rounded-lg">
            <div className="text-green-700 font-medium mb-2 text-sm md:text-base">✓ Artist Signature Applied</div>
            {artistSignature.signatureData && artistSignature.signatureData.startsWith('data:image') ? (
              <div className="bg-white p-2 border rounded inline-block">
                <img 
                  src={artistSignature.signatureData} 
                  alt="Artist Signature" 
                  className="max-w-[150px] md:max-w-[200px] h-[40px] md:h-[60px] object-contain"
                  onError={(e) => {
                    console.error('Failed to load artist signature image (fallback):', e);
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
                <div className="text-xs md:text-sm text-gray-600 bg-white p-2 border rounded" style={{ display: 'none' }}>
                  [Artist Signature Applied]
                </div>
              </div>
            ) : artistSignature.signatureData ? (
              <div className="font-cursive text-xl md:text-2xl text-gray-800 bg-white p-2 border rounded inline-block">
                {artistSignature.signatureData}
              </div>
            ) : (
              <div className="text-xs md:text-sm text-gray-600 bg-white p-2 border rounded inline-block">
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
    
    if (adminSignature && !adminSignaturePlaced) {
      console.log('Adding admin signature at the end');
      processedLines.push(
        <div key={`embedded-admin-signature-fallback-${adminSignature.fieldId}`} className="mt-6">
          <h4 className="font-semibold mb-2 text-sm md:text-base">Administrator Signature:</h4>
          <div className="border-2 border-blue-300 bg-blue-50 p-3 md:p-4 rounded-lg">
            <div className="text-blue-700 font-medium mb-2 text-sm md:text-base">✓ Admin/Agent Signature Applied</div>
            {adminSignature.signatureData && adminSignature.signatureData.startsWith('data:image') ? (
              <div className="bg-white p-2 border rounded inline-block">
                <img 
                  src={adminSignature.signatureData} 
                  alt="Admin Signature" 
                  className="max-w-[150px] md:max-w-[200px] h-[40px] md:h-[60px] object-contain"
                  onError={(e) => {
                    console.error('Failed to load admin signature image (fallback):', e);
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
                <div className="text-xs md:text-sm text-gray-600 bg-white p-2 border rounded" style={{ display: 'none' }}>
                  [Dr. Kevin P. Johnson - Admin Signature]
                </div>
              </div>
            ) : adminSignature.signatureData ? (
              <div className="font-cursive text-xl md:text-2xl text-gray-800 bg-white p-2 border rounded inline-block">
                {adminSignature.signatureData}
              </div>
            ) : (
              <div className="text-xs md:text-sm text-gray-600 bg-white p-2 border rounded inline-block">
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
    
    console.log('Final processed lines count:', processedLines.length);
    return processedLines;
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
      <div className="contract-content font-serif">
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
    </DocumentContainer>
  );
};