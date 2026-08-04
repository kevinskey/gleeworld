import { QRCodeStudio } from '@/components/qr/QRCodeStudio';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

const QRGeneratorPage = () => {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
        <DashboardPageShell
          title="QR codes"
          subtitle="Make a scannable code for any page on your site — posters, programs, signage, merch tables."
        >
          <QRCodeStudio />
        </DashboardPageShell>
      </DashboardShell>
    </UniversalLayout>
  );
};

export default QRGeneratorPage;
