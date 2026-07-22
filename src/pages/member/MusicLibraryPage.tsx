import React from 'react';
import { MusicLibrary } from '@/components/music-library/MusicLibrary';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export const MusicLibraryPage: React.FC = () => {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <div className="w-full h-full">
        <MusicLibrary />
      </div>
    </DashboardShell>
    </UniversalLayout>
  );
};

export default MusicLibraryPage;
