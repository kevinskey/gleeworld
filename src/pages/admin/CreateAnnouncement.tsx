import React from 'react';
import AnnouncementForm from '@/components/admin/AnnouncementForm';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

const CreateAnnouncement = () => {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <AnnouncementForm mode="create" />
    </DashboardShell>
    </UniversalLayout>
  );
};

export default CreateAnnouncement;