import React, { ReactNode } from 'react';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { CommunityHeader } from './CommunityHeader';
import { PageContainer } from '@/components/layout/PageContainer';

interface CommunityLayoutProps {
  children: ReactNode;
}

export const CommunityLayout: React.FC<CommunityLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-background">
      <UniversalHeader />
      <main className="w-full min-h-dvh pt-[var(--gw-header-h,4rem)] bg-background text-foreground">
        <PageContainer>
          <CommunityHeader />
        </PageContainer>
        {children}
      </main>
    </div>
  );
};