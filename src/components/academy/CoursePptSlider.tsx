import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Presentation, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NativePowerPointViewer } from '@/components/mus240/NativePowerPointViewer';

interface CoursePptSliderProps {
  presentationUrl: string;
  presentationTitle?: string;
  className?: string;
}

export const CoursePptSlider: React.FC<CoursePptSliderProps> = ({ 
  presentationUrl,
  presentationTitle = 'Presentation',
  className
}) => {
  const [showViewer, setShowViewer] = useState(false);

  // Extract filename from URL for display
  const fileName = presentationUrl.split('/').pop() || 'presentation.pptx';

  return (
    <>
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Presentation className="h-4 w-4 text-primary" />
            {presentationTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Presentation className="h-10 w-10 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Click below to open the slideshow viewer
              </p>
              <Button 
                onClick={() => setShowViewer(true)} 
                size="lg"
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Open Slideshow
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <NativePowerPointViewer
        isOpen={showViewer}
        onClose={() => setShowViewer(false)}
        fileUrl={presentationUrl}
        fileName={fileName}
        title={presentationTitle}
      />
    </>
  );
};

export default CoursePptSlider;
