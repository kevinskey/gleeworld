import React from 'react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { Button } from '@/components/ui/button';
import { Music, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ModuleProps } from '@/types/unified-modules';

export const SightSingingPreviewModule: React.FC<ModuleProps> = ({ 
  isFullPage = false, 
  user 
}) => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate('/sight-reading-generator');
  };

  return (
    <ModuleWrapper
      id="sight-singing-studio"
      title="Sight-Singing Studio"
      description="Generate AI-powered sight-singing exercises with professional notation and evaluation"
      icon={Music}
      fullPage={isFullPage}
    >
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Create custom sight-singing exercises, practice with recording, and get AI-powered evaluation feedback.
        </p>
        
        <div className="space-y-3">
          <div className="text-sm">
            <strong>Features:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>AI-powered MusicXML generation</li>
              <li>Professional notation rendering</li>
              <li>4-click count-off recording system</li>
              <li>Pitch and rhythm accuracy evaluation</li>
              <li>Performance sharing and history</li>
              <li>Metronome with one-bar intro</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleNavigate}
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Sight-Singing Studio
          </Button>
        </div>
      </div>
    </ModuleWrapper>
  );
};