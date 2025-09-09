import React from 'react';
import { EmailModule } from './modules/EmailModule';
import { MusicLibraryModule } from './modules/MusicLibraryModule';
import { CalendarModule } from './modules/CalendarModule';
import { WardrobeModule } from './modules/WardrobeModule';
import { FinancesModule } from './modules/FinancesModule';
import { AttendanceModule } from './modules/AttendanceModule';
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
import { CheckInCheckOutModule } from '../modules/CheckInCheckOutModule';
import { GleeWritingWidget } from '../writing/GleeWritingWidget';
import { FirstYearConsoleModule } from '../modules/FirstYearConsoleModule';
import { UserManagementModule } from '../modules/UserManagementModule';
import { BowmanScholarsModule } from '../modules/BowmanScholarsModule';
import { RadioManagement } from '../admin/RadioManagement';

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
      case 'check-in-check-out':
        return <CheckInCheckOutModule />;
      case 'buckets-of-love':
        return <BucketsOfLoveModule />;
      case 'glee-writing':
        return <GleeWritingWidget />;
      case 'fan-engagement':
        return <FanEngagementModule />;
      case 'scheduling-module':
        return <SchedulingModule />;
      case 'service-management':
        return <div className="p-6"><h2 className="text-2xl font-bold mb-4">Service Management</h2><p>Service management module coming soon!</p></div>;
      case 'first-year-console':
        return <FirstYearConsoleModule />;
      case 'user-management':
        return <UserManagementModule />;
      case 'bowman-scholars':
        return <BowmanScholarsModule />;
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