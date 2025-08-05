interface EmbeddedSignature {
  fieldId: number;
  signatureData: string;
  dateSigned: string;
  ipAddress?: string;
  timestamp: string;
  signerType?: 'artist' | 'admin';
  signerName?: string;
}

export const formatDocumentWithSignatures = (
  content: string,
  embeddedSignatures: EmbeddedSignature[],
  documentType: 'contract' | 'document' = 'document'
): string => {
  if (!content) {
    return '';
  }

  // Remove the embedded signatures section from display
  let processedContent = content.replace(/\[EMBEDDED_SIGNATURES\](.*?)\[\/EMBEDDED_SIGNATURES\]/s, '');
  
  // If we have signatures, add them to the bottom of the document
  if (embeddedSignatures && embeddedSignatures.length > 0) {
    const signatureHtml = embeddedSignatures.map((sig, index) => {
      const signerLabel = sig.signerType === 'admin' ? 'Administrator' : 'Artist';
      const signerName = sig.signerName || 'Unknown';
      
      return `
        <div style="margin-top: 40px; page-break-inside: avoid;">
          <h4 style="margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px;">
            ${signerLabel} Signature ${index + 1}
          </h4>
          <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 10px;">
            <div style="flex: 1;">
              <div style="margin-bottom: 5px;"><strong>Signer:</strong> ${signerName}</div>
              <div style="margin-bottom: 5px;"><strong>Date:</strong> ${sig.dateSigned || new Date(sig.timestamp).toLocaleDateString()}</div>
              ${sig.ipAddress ? `<div style="margin-bottom: 5px;"><strong>IP Address:</strong> ${sig.ipAddress}</div>` : ''}
            </div>
            <div style="flex: 1; max-width: 300px;">
              <img src="${sig.signatureData}" alt="Signature" style="max-width: 100%; height: auto; border: 1px solid #ddd; padding: 5px; background: white;" />
            </div>
          </div>
        </div>
      `;
    }).join('');

    processedContent += `
      <div style="margin-top: 60px; border-top: 2px solid #333; padding-top: 20px;">
        <h3 style="margin-bottom: 20px; font-weight: bold; text-align: center;">Digital Signatures</h3>
        ${signatureHtml}
      </div>
    `;
  }

  return processedContent;
};

export const processDocumentContent = (content: string, documentType: 'contract' | 'document' = 'document'): string => {
  if (!content) {
    return '';
  }

  // Basic HTML processing for documents
  let processedContent = content;

  // Ensure proper paragraph breaks
  processedContent = processedContent.replace(/\n\n/g, '</p><p>');
  processedContent = processedContent.replace(/\n/g, '<br>');

  // Wrap in paragraphs if not already wrapped
  if (!processedContent.startsWith('<p>')) {
    processedContent = `<p>${processedContent}</p>`;
  }

  return processedContent;
};

export const cleanDocumentContent = (content: string): string => {
  if (!content) {
    return '';
  }

  // Remove any embedded signature data from the visible content
  return content.replace(/\[EMBEDDED_SIGNATURES\](.*?)\[\/EMBEDDED_SIGNATURES\]/s, '');
};