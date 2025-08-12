import React from 'react';
import { Music } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { ModuleProps } from '@/types/unified-modules';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const MusicLibraryModule = ({ user, isFullPage = false }: ModuleProps) => {
  const navigate = useNavigate();
  return (
    <ModuleWrapper
      id="music-library"
      title="Music Library"
      description="Manage sheet music, recordings, and musical resources"
      icon={Music}
      iconColor="pink"
      fullPage={isFullPage}
      defaultOpen={!!isFullPage}
      headerActions={
        <Button size="sm" onClick={() => navigate('/music-library')} aria-label="Open Music Library">
          Open
        </Button>
      }
    >
      <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
        <p className="text-sm text-muted-foreground">
          Open the full Music Library to browse scores, recordings, and tools.
        </p>
        <Button onClick={() => navigate('/music-library')} size="sm" aria-label="Open Music Library">
          Open
        </Button>
      </div>
    </ModuleWrapper>
  );
};