import React, { ReactNode } from 'react';
import { UniversalHeader } from '@/components/layout/UniversalHeader';

interface CommunityLayoutProps {
  children: ReactNode;
}

export const CommunityLayout: React.FC<CommunityLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <UniversalHeader />
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
};