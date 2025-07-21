import React from 'react';
import AnnouncementForm from '@/components/admin/AnnouncementForm';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

const EditAnnouncement = () => {
  return (
    <UniversalLayout>
      <AnnouncementForm mode="edit" />
    </UniversalLayout>
  );
};

export default EditAnnouncement;