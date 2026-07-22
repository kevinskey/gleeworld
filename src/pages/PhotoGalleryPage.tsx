import React from 'react';
import { PhotoGallery } from '@/components/gallery/PhotoGallery';
import { UniversalLayout } from "@/components/layout/UniversalLayout";

const PhotoGalleryPage: React.FC = () => {
  return (
    <UniversalLayout>
      <div className="container mx-auto py-6 px-4">
        <PhotoGallery />
      </div>
    </UniversalLayout>
  );
};

export default PhotoGalleryPage;
