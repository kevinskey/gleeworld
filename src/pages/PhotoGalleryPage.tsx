import React from 'react';
import { PhotoGallery } from '@/components/gallery/PhotoGallery';
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

const PhotoGalleryPage: React.FC = () => {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <div className="container mx-auto py-6 px-4">
        <PhotoGallery />
      </div>
    </DashboardShell>
    </UniversalLayout>
  );
};

export default PhotoGalleryPage;
