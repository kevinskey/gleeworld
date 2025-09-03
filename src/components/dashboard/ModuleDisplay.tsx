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
        return <RadioModule />;
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
        return <div className="p-6"><h2 className="text-2xl font-bold mb-4">Check In/Check Out</h2><p>Check in/out module coming soon!</p></div>;
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