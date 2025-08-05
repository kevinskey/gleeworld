import { ReactNode } from 'react';

interface DocumentContainerProps {
  children: ReactNode;
  className?: string;
}

export const DocumentContainer = ({ children, className = '' }: DocumentContainerProps) => {
  return (
    <div className={`
      max-w-[8.5in] w-full mx-auto bg-white shadow-lg rounded-lg overflow-hidden
      lg:max-w-[8.5in] md:max-w-[95vw] sm:max-w-[98vw] sm:rounded-md
      print:max-w-none print:w-[8.5in] print:shadow-none print:rounded-none
      ${className}
    `}>
      <div className="p-6 md:p-8 lg:p-12 print:p-12">
        {children}
      </div>
    </div>
  );
};