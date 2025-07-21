import React from 'react';
import AnnouncementForm from '@/components/admin/AnnouncementForm';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

const CreateAnnouncement = () => {
  return (
    <UniversalLayout>
      <AnnouncementForm mode="create" />
    </UniversalLayout>
  );
};

export default CreateAnnouncement;