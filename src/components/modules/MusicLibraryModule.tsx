import React from 'react';
import { Music } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { ModuleProps } from '@/types/unified-modules';

export const MusicLibraryModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <ModuleWrapper
      id="music-library"
      title="Music Library"
      description="Manage sheet music, recordings, and musical resources"
      icon={Music}
      iconColor="pink"
      fullPage={isFullPage}
      defaultOpen={!!isFullPage}
    >
      <div className="space-y-6">
        {/* Coming Soon Notice */}
        <div className="text-center py-8 space-y-4">
          <Music className="h-16 w-16 mx-auto text-muted-foreground/50" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Music Library</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Manage sheet music, recordings, and musical resources. Full functionality coming soon.
            </p>
          </div>
        </div>

        {/* Future Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-border rounded-lg p-4 bg-card">
            <h4 className="font-medium text-foreground mb-2">Sheet Music Library</h4>
            <p className="text-xs text-muted-foreground">
              Upload, organize, and manage PDF sheet music files with search and filtering capabilities.
            </p>
          </div>
          
          <div className="border border-border rounded-lg p-4 bg-card">
            <h4 className="font-medium text-foreground mb-2">Audio Recordings</h4>
            <p className="text-xs text-muted-foreground">
              Store and organize MP3 recordings, practice tracks, and performance archives.
            </p>
          </div>
          
          <div className="border border-border rounded-lg p-4 bg-card">
            <h4 className="font-medium text-foreground mb-2">Search & Filter</h4>
            <p className="text-xs text-muted-foreground">
              Advanced search by composer, title, voice part, difficulty level, and more.
            </p>
          </div>
          
          <div className="border border-border rounded-lg p-4 bg-card">
            <h4 className="font-medium text-foreground mb-2">Permissions & Access</h4>
            <p className="text-xs text-muted-foreground">
              Control who can view, download, and manage different musical resources.
            </p>
          </div>
        </div>
      </div>
    </ModuleWrapper>
  );
};