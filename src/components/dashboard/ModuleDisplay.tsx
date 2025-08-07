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

interface ModuleDisplayProps {
  selectedModule: string;
}

export const ModuleDisplay = ({ selectedModule }: ModuleDisplayProps) => {
  const renderModule = () => {
    switch (selectedModule) {
      case 'email':
        return <EmailModule />;
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
      case 'radio':
        return <RadioModule />;
      case 'handbook':
        return <HandbookModule />;
      case 'directory':
        return <DirectoryModule />;
      case 'media':
        return <MediaModule />;
      case 'executive':
        return <ExecutiveModule />;
      case 'settings':
        return <SettingsModule />;
      default:
        return <EmailModule />;
    }
  };

  return (
    <div className="h-full">
      {renderModule()}
    </div>
  );
};