import { ReactNode } from 'react';

interface UniversalDocumentViewerProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  documentType?: 'contract' | 'legal' | 'form' | 'letter' | 'report' | 'general';
}

export const UniversalDocumentViewer = ({ 
  children, 
  title, 
  subtitle, 
  className = '', 
  documentType = 'general' 
}: UniversalDocumentViewerProps) => {
  // Define styling based on document type
  const getDocumentStyles = () => {
    const baseStyles = {
      contract: 'font-serif text-sm md:text-base leading-relaxed',
      legal: 'font-serif text-sm md:text-base leading-relaxed',
      form: 'font-sans text-sm md:text-base leading-normal',
      letter: 'font-serif text-base md:text-lg leading-relaxed',
      report: 'font-sans text-sm md:text-base leading-normal',
      general: 'font-sans text-sm md:text-base leading-normal'
    };
    
    return baseStyles[documentType] || baseStyles.general;
  };

  return (
    <>
      {/* Global document styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .universal-document-viewer {
            line-height: 1.7;
            color: #1a1a1a;
            word-wrap: break-word;
            overflow-wrap: break-word;
            width: 100%;
            max-width: 100%;
          }
          
          .universal-document-viewer h1, 
          .universal-document-viewer h2, 
          .universal-document-viewer h3,
          .universal-document-viewer h4,
          .universal-document-viewer h5,
          .universal-document-viewer h6 {
            color: #000;
            word-wrap: break-word;
            overflow-wrap: break-word;
            margin-top: 1.5rem;
            margin-bottom: 1rem;
          }
          
          .universal-document-viewer h1:first-child,
          .universal-document-viewer h2:first-child,
          .universal-document-viewer h3:first-child {
            margin-top: 0;
          }
          
          .universal-document-viewer p {
            word-wrap: break-word;
            overflow-wrap: break-word;
            white-space: normal;
            width: 100%;
            max-width: 100%;
            margin-bottom: 1rem;
            hyphens: auto;
            -webkit-hyphens: auto;
            -ms-hyphens: auto;
          }
          
          .universal-document-viewer .break-words {
            word-wrap: break-word;
            overflow-wrap: break-word;
            white-space: normal;
          }
          
          .universal-document-viewer table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
          }
          
          .universal-document-viewer table td,
          .universal-document-viewer table th {
            padding: 0.5rem;
            border: 1px solid #e5e7eb;
            word-wrap: break-word;
          }
          
          .universal-document-viewer ul,
          .universal-document-viewer ol {
            margin: 1rem 0;
            padding-left: 1.5rem;
          }
          
          .universal-document-viewer li {
            margin-bottom: 0.5rem;
            word-wrap: break-word;
          }
          
          .universal-document-viewer blockquote {
            border-left: 4px solid #e5e7eb;
            padding-left: 1rem;
            margin: 1rem 0;
            font-style: italic;
          }
          
          .universal-document-viewer code {
            background-color: #f3f4f6;
            padding: 0.125rem 0.25rem;
            border-radius: 0.25rem;
            font-family: monospace;
            word-wrap: break-word;
          }
          
          .universal-document-viewer pre {
            background-color: #f3f4f6;
            padding: 1rem;
            border-radius: 0.5rem;
            overflow-x: auto;
            margin: 1rem 0;
          }
          
          /* Responsive adjustments */
          @media (max-width: 768px) {
            .universal-document-viewer {
              font-size: 14px;
              line-height: 1.6;
            }
            
            .universal-document-viewer h1 {
              font-size: 20px;
            }
            
            .universal-document-viewer h2 {
              font-size: 18px;
            }
            
            .universal-document-viewer h3 {
              font-size: 16px;
            }
          }
          
          /* Print styles */
          @media print {
            .universal-document-viewer {
              font-size: 12pt;
              line-height: 1.5;
              color: #000;
            }
            
            .universal-document-viewer h1,
            .universal-document-viewer h2,
            .universal-document-viewer h3 {
              page-break-after: avoid;
            }
            
            .universal-document-viewer p {
              orphans: 3;
              widows: 3;
            }
          }
          
          /* Document type specific styles */
          .doc-type-contract,
          .doc-type-legal {
            text-align: justify;
          }
          
          .doc-type-form {
            line-height: 1.6;
          }
          
          .doc-type-letter {
            line-height: 1.8;
          }
        `
      }} />
      
      <div className={`
        max-w-4xl w-full mx-auto bg-white shadow-lg rounded-lg overflow-hidden
        lg:max-w-4xl md:max-w-[90vw] sm:max-w-[95vw] sm:rounded-md
        print:max-w-none print:w-[8.5in] print:shadow-none print:rounded-none
        ${className}
      `}>
        {(title || subtitle) && (
          <div className="border-b border-gray-200 p-4 md:p-6">
            {title && (
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm md:text-base text-gray-600">
                {subtitle}
              </p>
            )}
          </div>
        )}
        
        <div className="p-4 md:p-6 lg:p-8 print:p-12 max-w-none overflow-x-auto">
          <div className={`
            universal-document-viewer 
            doc-type-${documentType}
            ${getDocumentStyles()}
            w-full max-w-none
          `}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
};