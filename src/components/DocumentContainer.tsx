import { ReactNode } from 'react';

interface DocumentContainerProps {
  children: ReactNode;
  className?: string;
}

export const DocumentContainer = ({ children, className = '' }: DocumentContainerProps) => {
  return (
    <div className={`
      max-w-4xl w-full mx-auto bg-background shadow-lg rounded-lg overflow-hidden
      lg:max-w-4xl md:max-w-[90vw] sm:max-w-[95vw] sm:rounded-md
      print:max-w-none print:w-[8.5in] print:shadow-none print:rounded-none
      ${className}
    `}>
      <div className="p-4 md:p-6 lg:p-8 print:p-12 max-w-none overflow-x-auto">
        {children}
      </div>
    </div>
  );
};