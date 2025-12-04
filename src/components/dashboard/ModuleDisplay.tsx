import React from 'react';
import { EmailModule } from './modules/EmailModule';
import { MusicLibraryModule } from './modules/MusicLibraryModule';
import { CalendarModule } from './modules/CalendarModule';
import { WardrobeModule } from './modules/WardrobeModule';
import { FinancesModule } from './modules/FinancesModule';
import { AttendanceModule } from '../modules/AttendanceModule';
import { RadioModule } from './modules/RadioModule';
import { HandbookModule } from './modules/HandbookModule';
import { DirectoryModule } from './modules/DirectoryModule';
import { MediaModule } from './modules/MediaModule';
import { ExecutiveModule } from './modules/ExecutiveModule';
import { SettingsModule } from './modules/SettingsModule';
import { CommunityHubModule } from './modules/CommunityHubModule';
import { AuditionsModule } from '../modules/AuditionsModule';
import { LibrarianModule } from '../modules/LibrarianModule';
import { SimpleModuleHub } from '../executive/SimpleModuleHub';
import { NotificationsModule } from '../modules/NotificationsModule';
import { KaraokeModule } from '../modules/KaraokeModule';
import { SightSingingModule } from '../modules/SightSingingModule';
import { EmailManagementModule } from '../modules/EmailManagementModule';
import { CalendarManagementModule } from '../modules/CalendarManagementModule';
import { BucketsOfLoveModule } from '../modules/BucketsOfLoveModule';
import { FanEngagementModule } from '../modules/FanEngagementModule';
import { SchedulingModule } from '../modules/SchedulingModule';

import { GleeWritingWidget } from '../writing/GleeWritingWidget';
import { FirstYearConsoleModule } from '../modules/FirstYearConsoleModule';
import { PermissionsModule } from '../modules/PermissionsModule';
import { BowmanScholarsModule } from '../modules/BowmanScholarsModule';
import { RadioManagement } from '../admin/RadioManagement';
import { GleeAcademyModule } from '../modules/GleeAcademyModule';
import { QRCodeManagementModule } from '../modules/QRCodeManagementModule';
import { Mus240GroupsModule } from '../modules/Mus240GroupsModule';
import { TestBuilder } from '../test-builder/TestBuilder';
import { AlumnaePortalModule } from '../modules/AlumnaePortalModule';
import { DashboardHeroManagerModule } from '@/components/modules/DashboardHeroManagerModule';
import { GleeLedgerModule } from '../admin/financial/GleeLedgerModule';
import { AlumnaeManagementModule } from '../modules/AlumnaeManagementModule';
import { GradingModule } from '../modules/GradingModule';
import { ConcertTicketRequestsModule } from '../modules/ConcertTicketRequestsModule';
import { AnnouncementsModule } from '../modules/AnnouncementsModule';
import { TourManagerDashboard } from '../tour-manager/TourManagerDashboard';

interface ModuleDisplayProps {
  selectedModule: string;
}

export const ModuleDisplay = ({ selectedModule }: ModuleDisplayProps) => {
  const renderModule = () => {
    switch (selectedModule) {
      case 'email':
        return <EmailModule />;
      case 'email-management':
        return <EmailManagementModule />;
      case 'community-hub':
        return <CommunityHubModule />;
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
      case 'radio':
        return <RadioModule />;
      case 'radio-management':
        return <RadioManagement />;
      case 'handbook':
        return <HandbookModule />;
      case 'directory':
        return <DirectoryModule />;
      case 'media':
        return <MediaModule />;
      case 'media-library':
        return <MediaModule />;
      case 'executive':
      case 'student-conductor':
      case 'section-leader':
        return <SimpleModuleHub />;
      case 'settings':
        return <SettingsModule />;
      case 'auditions':
      case 'auditions-management':
        return <AuditionsModule />;
      case 'librarian':
        return <LibrarianModule />;
      case 'simple-executive-hub':
        return <SimpleModuleHub />;
      case 'notifications':
        return <NotificationsModule />;
      case 'karaoke':
        return <KaraokeModule />;
      case 'sight-singing-management':
        return <SightSingingModule />;
      case 'calendar-management':
        return <CalendarManagementModule />;
      case 'buckets-of-love':
        return <BucketsOfLoveModule />;
      case 'glee-writing':
        return <GleeWritingWidget />;
      case 'fan-engagement':
        return <FanEngagementModule />;
      case 'concert-ticket-requests':
        return <ConcertTicketRequestsModule />;
      case 'scheduling-module':
        return <SchedulingModule />;
      case 'service-management':
        return <div className="p-6"><h2 className="text-2xl font-bold mb-4">Service Management</h2><p>Service management module coming soon!</p></div>;
      case 'first-year-console':
        return <FirstYearConsoleModule />;
      case 'user-management':
        return <PermissionsModule />;
      case 'bowman-scholars':
        return <BowmanScholarsModule />;
      case 'glee-academy':
        return <GleeAcademyModule isFullPage={false} />;
      case 'qr-code-management':
        return <QRCodeManagementModule />;
      case 'mus240-groups':
        return <Mus240GroupsModule />;
      case 'test-builder':
        return <TestBuilder courseId="all" courseName="All Courses" />;
      case 'grading-admin':
        window.location.href = '/grading/admin/dashboard';
        return null;
      case 'grading':
        return <GradingModule />;
      case 'alumnae-portal':
        return <AlumnaePortalModule />;
      case 'alumnae-management':
        return <AlumnaeManagementModule />;
      case 'hero-management':
      case 'hero-manager':
        return <DashboardHeroManagerModule />;
      case 'glee-ledger':
        return <GleeLedgerModule />;
      case 'announcements':
        return <AnnouncementsModule />;
      case 'tour-management':
        return <TourManagerDashboard />;
      default:
        return <div className="p-6"><h2 className="text-2xl font-bold mb-4">Module: {selectedModule}</h2><p>This module is being developed. Stay tuned!</p></div>;
    }
  };

  return (
    <div className="h-full">
      {renderModule()}
    </div>
  );
};