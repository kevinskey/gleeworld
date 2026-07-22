import { GoogleDocsManager } from '@/components/google-docs/GoogleDocsManager';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

const GoogleDocsPage = () => {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <GoogleDocsManager />
    </DashboardShell>
    </UniversalLayout>
  );
};

export default GoogleDocsPage;
