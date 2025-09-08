import React, { ReactNode } from 'react';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { CommunityHeader } from './CommunityHeader';

interface CommunityLayoutProps {
  children: ReactNode;
}

export const CommunityLayout: React.FC<CommunityLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <UniversalHeader />
      <main className="pt-16">
        <div className="container mx-auto p-6">
          <CommunityHeader />
        </div>
        {children}
      </main>
    </div>
  );
};