import React, { Suspense } from 'react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmailModule } from './modules/EmailModule';
import { MusicLibraryModule } from './modules/MusicLibraryModule';
import { CalendarModule } from './modules/CalendarModule';
import { WardrobeModule } from './modules/WardrobeModule';
import { FinancesModule } from './modules/FinancesModule';
import { AttendanceModule } from '../modules/AttendanceModule';
import { HandbookModule } from './modules/HandbookModule';
import { DirectoryModule } from './modules/DirectoryModule';
import { MediaModule } from './modules/MediaModule';
import { AuditionsModule } from '../modules/AuditionsModule';
import { LibrarianModule } from '../modules/LibrarianModule';
import { NotificationsModule } from '../modules/NotificationsModule';
import { SightSingingModule } from '../modules/SightSingingModule';
import { EmailManagementModule } from '../modules/EmailManagementModule';
import { CommunicationsHub } from '../modules/CommunicationsHub';
import { SightReadingHub } from '../modules/SightReadingHub';
import { FinanceHub } from '../modules/FinanceHub';
import { AppointmentsHub } from '../modules/AppointmentsHub';
import { PRHub } from '../modules/PRHub';
import { AssessmentHub } from '../modules/AssessmentHub';
import { AIHub } from '../modules/AIHub';
import { CalendarManagementModule } from '../modules/CalendarManagementModule';
import { BucketsOfLoveModule } from '../modules/BucketsOfLoveModule';


import { PermissionsModule } from '../modules/PermissionsModule';
import { BowmanScholarsModule } from '../modules/BowmanScholarsModule';
import { GleeAcademyModule } from '../modules/GleeAcademyModule';
import { QRCodeManagementModule } from '../modules/QRCodeManagementModule';
import { TestBuilder } from '../test-builder/TestBuilder';
import { GraduatesPortalModule } from '../modules/GraduatesPortalModule';
import { HeroManagerModule } from '@/components/modules/HeroManagerModule';
import { PartTracksModule } from '@/components/modules/PartTracksModule';
import { ModuleGate } from '@/components/auth/ModuleGate';
import { GleeLedgerModule } from '../admin/financial/GleeLedgerModule';
import { GraduatesManagementModule } from '../modules/GraduatesManagementModule';
import { GradingModule } from '../modules/GradingModule';
import { ConcertTicketRequestsModule } from '../modules/ConcertTicketRequestsModule';
import { AnnouncementsModule } from '../modules/AnnouncementsModule';
import { TourManagerDashboard } from '../tour-manager/TourManagerDashboard';
import { TheLabModule } from '@/components/modules/TheLabModule';

import { YouTubeManagement } from '@/components/admin/YouTubeManagement';
import { MessengerAdminModule } from '../modules/MessengerAdminModule';
import { ContractsModule } from '../modules/ContractsModule';
import { DonationsModule, NetworkingMarketplaceModule } from '../modules/alumni';
import { UsageAnalyticsModule } from '../modules/UsageAnalyticsModule';
import FeedControl from '@/pages/FeedControl';
import { ProductManagement } from '@/pages/ProductManagement';
import { CourseAttendanceLedger } from '../attendance/CourseAttendanceLedger';
import EnsemblesPage from '@/pages/admin/Ensembles';

interface ModuleDisplayProps {
  selectedModule: string;
}

export const ModuleDisplay = ({ selectedModule }: ModuleDisplayProps) => {
  const renderModule = () => {
    switch (selectedModule) {
      case 'communications-hub':
        return <CommunicationsHub />;
      case 'sight-reading':
        return <SightReadingHub />;
      case 'finance-hub':
        return <FinanceHub />;
      case 'appointments-hub':
        return <AppointmentsHub />;
      case 'pr-hub':
        return <PRHub />;
      case 'assessment-hub':
        return <AssessmentHub />;
      case 'ai-hub':
        return <AIHub />;
      case 'email':
        return <EmailModule />;
      case 'email-management':
        return <EmailManagementModule />;
      case 'music-library':
        return <MusicLibraryModule />;
      case 'calendar':
        return <CalendarModule />;
      case 'wardrobe':
        return <WardrobeModule />;
      case 'finances':
        return <FinancesModule />;
      case 'attendance':
        return <AttendanceModule />;
      case 'attendance-management':
        return <AttendanceModule />;
      case 'course-attendance-ledger':
        return <CourseAttendanceLedger />;
      case 'handbook':
        return <HandbookModule />;
      case 'directory':
        return <DirectoryModule />;
      case 'media':
        return <MediaModule />;
      case 'media-library':
        return <MediaModule />;
      case 'auditions':
      case 'auditions-management':
        return <AuditionsModule />;
      case 'librarian':
        return <LibrarianModule />;
      case 'notifications':
        return <NotificationsModule />;
      case 'sight-singing-management':
        return <SightSingingModule />;
      case 'calendar-management':
        return <CalendarManagementModule />;
      case 'buckets-of-love':
        return <BucketsOfLoveModule />;
      case 'concert-ticket-requests':
        return <ConcertTicketRequestsModule />;
      case 'service-management':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Service Management</h2>
            <p>Service management module coming soon!</p>
          </div>
        );
      case 'user-management':
        return <PermissionsModule />;
      case 'bowman-scholars':
        return <BowmanScholarsModule />;
      case 'glee-academy':
        return <GleeAcademyModule isFullPage={false} />;
      case 'qr-code-management':
        return <QRCodeManagementModule />;
case 'test-builder':
        return <TestBuilder courseId="all" courseName="All Courses" />;
      case 'grading-admin':
        window.location.href = '/grading/admin/dashboard';
        return null;
      case 'grading':
        return <GradingModule />;
      case 'graduates-portal':
        return <GraduatesPortalModule />;
      case 'graduates-management':
        return <GraduatesManagementModule />;
      case 'hero-management':
      case 'hero-manager':
        return <HeroManagerModule />;
      case 'part-tracks':
        return (
          <ModuleGate moduleId="part_tracks">
            <PartTracksModule />
          </ModuleGate>
        );
      case 'youtube-management':
        return <YouTubeManagement />;
      case 'glee-ledger':
        return <GleeLedgerModule />;
      case 'announcements':
        return <AnnouncementsModule />;
      case 'tour-management':
        return <TourManagerDashboard />;
      case 'the-lab':
        return <TheLabModule />;
      case 'appointments':
      case 'assignable-appointments':
        return <div className="p-4 text-muted-foreground">Use /book-appointment for Office Hours booking.</div>;
      case 'messenger-admin':
        return <MessengerAdminModule />;
      case 'feed-control':
        return <FeedControl />;
      case 'merch-store':
        return <ProductManagement />;
      case 'contracts':
        return <ContractsModule />;
      case 'donations':
        return <DonationsModule />;
      case 'networking-marketplace':
        return <NetworkingMarketplaceModule />;
      case 'usage-analytics':
        return <UsageAnalyticsModule />;
      case 'program-health':
        return <EnsemblesPage />;
      default:
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Module: {selectedModule}</h2>
            <p>This module is being developed. Stay tuned!</p>
          </div>
        );
    }
  };

  return (
    <div className="h-full">
      <Suspense fallback={<div className="p-8 flex justify-center"><LoadingSpinner /></div>}>
        {renderModule()}
      </Suspense>
    </div>
  );
};
