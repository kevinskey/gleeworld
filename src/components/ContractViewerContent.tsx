
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
      hasContent: !!content,
      hasEmbeddedSignatures: content.includes('[EMBEDDED_SIGNATURES]')
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
    
    console.log('ContractViewerContent - Processing signatures:', {
      totalSignatures: embeddedSignatures.length,
      artistSignature: !!artistSignature,
      adminSignature: !!adminSignature
    });
    
    let artistSignaturePlaced = false;
    let adminSignaturePlaced = false;
    
    lines.forEach((line, index) => {
      // Check for artist signature placement - look for lines that indicate artist signature area
      if (!artistSignaturePlaced && artistSignature && (
        line.toLowerCase().includes('artist:') || 
        line.toLowerCase().includes('agreed and accepted by:') ||
        (line.toLowerCase().includes('signature') && 
         !line.toLowerCase().includes('dr.') && 
         !line.toLowerCase().includes('kevin') && 
         !line.toLowerCase().includes('johnson'))
      )) {
        processedLines.push(line);
        processedLines.push(
          <div key={`embedded-artist-signature-${artistSignature.fieldId}`} className="my-4">
            <div className="border-2 border-green-300 bg-green-50 p-4 rounded-lg">
              <div className="text-green-700 font-medium mb-2">✓ Artist Signature Applied</div>
              {artistSignature.signatureData && artistSignature.signatureData.startsWith('data:image') ? (
                <div className="bg-white p-2 border rounded inline-block">
                  <img 
                    src={artistSignature.signatureData} 
                    alt="Artist Signature" 
                    className="max-w-[200px] h-[60px] object-contain"
                    style={{ maxWidth: '200px', height: '60px' }}
                    onError={(e) => {
                      console.error('Failed to load artist signature image:', e);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'block';
                    }}
                  />
                  <div className="text-sm text-gray-600 bg-white p-2 border rounded" style={{ display: 'none' }}>
                    [Artist Signature Applied]
                  </div>
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
        artistSignaturePlaced = true;
        return;
      }
      
      // Check for admin signature placement - before "Printed Name: Dr. Kevin P. Johnson"
      if (!adminSignaturePlaced && adminSignature && line.includes('Printed Name:') && line.includes('Dr. Kevin P. Johnson')) {
        // Add admin signature BEFORE this line
        processedLines.push(
          <div key={`embedded-admin-signature-${adminSignature.fieldId}`} className="mb-4">
            <div className="border-2 border-blue-300 bg-blue-50 p-4 rounded-lg">
              <div className="text-blue-700 font-medium mb-2">✓ Admin/Agent Signature Applied</div>
              {adminSignature.signatureData && adminSignature.signatureData.startsWith('data:image') ? (
                <div className="bg-white p-2 border rounded inline-block">
                  <img 
                    src={adminSignature.signatureData} 
                    alt="Admin Signature" 
                    className="max-w-[200px] h-[60px] object-contain"
                    style={{ maxWidth: '200px', height: '60px' }}
                    onError={(e) => {
                      console.error('Failed to load admin signature image:', e);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'block';
                    }}
                  />
                  <div className="text-sm text-gray-600 bg-white p-2 border rounded" style={{ display: 'none' }}>
                    [Dr. Kevin P. Johnson - Admin Signature]
                  </div>
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
        adminSignaturePlaced = true;
        
        // Add the printed name line
        processedLines.push(line);
        return;
      }
      
      // Add the line as-is
      processedLines.push(line);
    });
    
    // If signatures weren't placed inline, add them at the end
    if (artistSignature && !artistSignaturePlaced) {
      console.log('Adding artist signature at the end');
      processedLines.push(
        <div key={`embedded-artist-signature-fallback-${artistSignature.fieldId}`} className="mt-6">
          <h4 className="font-semibold mb-2">Artist Signature:</h4>
          <div className="border-2 border-green-300 bg-green-50 p-4 rounded-lg">
            <div className="text-green-700 font-medium mb-2">✓ Artist Signature Applied</div>
            {artistSignature.signatureData && artistSignature.signatureData.startsWith('data:image') ? (
              <div className="bg-white p-2 border rounded inline-block">
                <img 
                  src={artistSignature.signatureData} 
                  alt="Artist Signature" 
                  className="max-w-[200px] h-[60px] object-contain"
                  onError={(e) => {
                    console.error('Failed to load artist signature image (fallback):', e);
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
                <div className="text-sm text-gray-600 bg-white p-2 border rounded" style={{ display: 'none' }}>
                  [Artist Signature Applied]
                </div>
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
    
    if (adminSignature && !adminSignaturePlaced) {
      console.log('Adding admin signature at the end');
      processedLines.push(
        <div key={`embedded-admin-signature-fallback-${adminSignature.fieldId}`} className="mt-6">
          <h4 className="font-semibold mb-2">Administrator Signature:</h4>
          <div className="border-2 border-blue-300 bg-blue-50 p-4 rounded-lg">
            <div className="text-blue-700 font-medium mb-2">✓ Admin/Agent Signature Applied</div>
            {adminSignature.signatureData && adminSignature.signatureData.startsWith('data:image') ? (
              <div className="bg-white p-2 border rounded inline-block">
                <img 
                  src={adminSignature.signatureData} 
                  alt="Admin Signature" 
                  className="max-w-[200px] h-[60px] object-contain"
                  onError={(e) => {
                    console.error('Failed to load admin signature image (fallback):', e);
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
                <div className="text-sm text-gray-600 bg-white p-2 border rounded" style={{ display: 'none' }}>
                  [Dr. Kevin P. Johnson - Admin Signature]
                </div>
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
    
    console.log('Final processed lines count:', processedLines.length);
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
