import React from 'react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { Button } from '@/components/ui/button';
import { Wand2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ModuleProps } from '@/types/modules';

export const SightReadingGeneratorModule: React.FC<ModuleProps> = ({ 
  isFullPage = false, 
  user 
}) => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate('/sight-reading-generator');
  };

  return (
    <ModuleWrapper
      id="sight-reading-generator"
      title="Sight Reading Generator"
      description="Generate AI-powered sight-reading exercises with professional notation"
      icon={Wand2}
      fullPage={isFullPage}
    >
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Create custom sight-reading exercises using AI-generated MusicXML and professional sheet music display.
        </p>
        
        <div className="space-y-3">
          <div className="text-sm">
            <strong>Features:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>AI-powered MusicXML generation</li>
              <li>Customizable difficulty and parameters</li>
              <li>Professional notation rendering</li>
              <li>Multiple key signatures and time signatures</li>
              <li>Voice range selection (SATB)</li>
              <li>Validation and error handling</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleNavigate}
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Sight Reading Generator
          </Button>
        </div>
      </div>
    </ModuleWrapper>
  );
};