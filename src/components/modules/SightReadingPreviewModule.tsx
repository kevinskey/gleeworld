import React from 'react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { Button } from '@/components/ui/button';
import { Music, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ModuleProps } from '@/types/modules';

export const SightReadingPreviewModule: React.FC<ModuleProps> = ({ 
  isFullPage = false, 
  user 
}) => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate('/sight-reading-preview');
  };

  return (
    <ModuleWrapper
      id="sight-reading-preview"
      title="Sight Reading Preview"
      description="Preview and analyze MusicXML sheet music with professional notation"
      icon={Music}
      fullPage={isFullPage}
    >
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Professional sheet music display using OpenSheetMusicDisplay for MusicXML files.
        </p>
        
        <div className="space-y-3">
          <div className="text-sm">
            <strong>Features:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Load MusicXML files from URL or upload</li>
              <li>Professional notation rendering</li>
              <li>PDF export capability</li>
              <li>Sample files included (Beethoven, Mozart, Bach)</li>
              <li>Integration with sight reading practice</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleNavigate}
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Sight Reading Preview
          </Button>
        </div>
      </div>
    </ModuleWrapper>
  );
};