import React from 'react';
import AnnouncementForm from '@/components/admin/AnnouncementForm';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

const EditAnnouncement = () => {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <AnnouncementForm mode="edit" />
    </DashboardShell>
    </UniversalLayout>
  );
};

export default EditAnnouncement;