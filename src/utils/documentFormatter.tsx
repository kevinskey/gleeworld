import { ReactNode } from 'react';

/**
 * Processes raw document content into properly formatted JSX elements
 * Handles various document types with intelligent content recognition
 */
export const processDocumentContent = (content: string, documentType: 'contract' | 'legal' | 'form' | 'letter' | 'report' | 'general' = 'general'): JSX.Element[] => {
  if (!content || typeof content !== 'string') {
    return [<p key="no-content" className="text-gray-500 italic">No content available</p>];
  }

  // Clean up the content and handle it as a whole document
  const cleanContent = content
    .replace(/\r\n/g, '\n')  // Normalize line endings
    .replace(/\r/g, '\n')    // Normalize line endings
    .replace(/\[EMBEDDED_SIGNATURES\].*?\[\/EMBEDDED_SIGNATURES\]/gs, '') // Remove signature blocks
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
      
      // Main title (all caps, standalone, longer lines)
      if (line.toUpperCase() === line && 
          line.length > 10 && 
          !line.includes('{{') &&
          !line.includes('Article') &&
          !line.includes(':') &&
          !line.includes('_') &&
          !line.match(/^\d/)) {
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
      if (line.endsWith(':') && line.length < 80) {
        processedElements.push(
          <h3 key={`section-${elementIndex++}`} className="font-semibold text-base md:text-lg mb-3 mt-6 break-words">
            {line}
          </h3>
        );
        return;
      }

      // Signature lines or form fields
      if (line.includes('____') || line.match(/^[A-Z\s]+\s+(HOST|COLLEGE|ARTIST)$/)) {
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

      // Date or address lines (often standalone)
      if (line.match(/^\w+,\s+\w+\s+\d+,\s+\d{4}/) || // Dates
          line.match(/^\d+.*?(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln)/) || // Addresses
          (line.length < 50 && line.match(/^[A-Z].*[a-z]$/) && !line.includes('.'))) { // Short title-case lines
        processedElements.push(
          <div key={`meta-${elementIndex++}`} className="mb-3 text-center text-sm md:text-base break-words">
            {line}
          </div>
        );
        return;
      }
    }

    // For multi-line sections, join them into paragraphs
    const paragraphText = lines.join(' ').trim();
    
    if (paragraphText) {
      // Check if it's a list section (all lines start with bullets or numbers)
      const isListSection = lines.length > 1 && lines.every(line => 
        line.match(/^[\•·\-\*]\s/) || 
        line.match(/^\d+\.\s/) || 
        line.match(/^[a-z]\.\s/) ||
        line.match(/^[A-Z]\.\s/)
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
        // Render as paragraph with appropriate alignment based on document type
        const alignmentClass = documentType === 'contract' || documentType === 'legal' 
          ? 'text-justify' 
          : 'text-left';
          
        processedElements.push(
          <p key={`paragraph-${elementIndex++}`} className={`mb-4 leading-relaxed text-sm md:text-base break-words hyphens-auto ${alignmentClass}`}>
            {paragraphText}
          </p>
        );
      }
    }
  });

  return processedElements.length > 0 ? processedElements : [
    <p key="empty-content" className="text-gray-500 italic">Document appears to be empty</p>
  ];
};

/**
 * Formats document content with embedded signatures
 */
export const formatDocumentWithSignatures = (
  content: string, 
  signatures: any[] = [], 
  documentType: 'contract' | 'legal' | 'form' | 'letter' | 'report' | 'general' = 'general'
): JSX.Element[] => {
  const processedElements = processDocumentContent(content, documentType);
  
  // Add signatures at the end if they exist
  signatures.forEach((signature, index) => {
    const isArtist = signature.signerType === 'artist';
    const isAdmin = signature.signerType === 'admin';
    
    processedElements.push(
      <div key={`signature-${index}`} className={`mt-8 ${index > 0 ? 'mb-6' : ''}`}>
        <h4 className="font-semibold mb-3 text-sm md:text-base">
          {isArtist ? 'Artist Signature:' : isAdmin ? 'Administrator Signature:' : 'Signature:'}
        </h4>
        <div className={`border-2 p-4 rounded-lg ${
          isArtist ? 'border-green-300 bg-green-50' : 
          isAdmin ? 'border-blue-300 bg-blue-50' : 
          'border-gray-300 bg-gray-50'
        }`}>
          <div className={`font-medium mb-2 text-sm md:text-base ${
            isArtist ? 'text-green-700' : 
            isAdmin ? 'text-blue-700' : 
            'text-gray-700'
          }`}>
            ✓ Signature Applied
          </div>
          {signature.signatureData && signature.signatureData.startsWith('data:image') ? (
            <div className="bg-white p-2 border rounded inline-block">
              <img 
                src={signature.signatureData} 
                alt={`${signature.signerType || 'User'} Signature`} 
                className="max-w-[200px] h-[60px] object-contain"
              />
            </div>
          ) : signature.signatureData ? (
            <div className="font-cursive text-2xl text-gray-800 bg-white p-2 border rounded inline-block">
              {signature.signatureData}
            </div>
          ) : (
            <div className="text-sm text-gray-600 bg-white p-2 border rounded inline-block">
              [Signature Applied]
            </div>
          )}
          {signature.dateSigned && (
            <div className={`text-xs mt-2 ${
              isArtist ? 'text-green-600' : 
              isAdmin ? 'text-blue-600' : 
              'text-gray-600'
            }`}>
              Signed on: {signature.dateSigned}
              {signature.signerName && (
                <>
                  <br />
                  Signed by: {signature.signerName}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  });
  
  return processedElements;
};