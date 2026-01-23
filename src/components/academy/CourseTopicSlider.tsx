import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Images, Settings } from 'lucide-react';
import { UniversalSlider } from '@/components/sliders/UniversalSlider';
import { useSliderByPlacement } from '@/hooks/useUniversalSlider';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface CourseTopicSliderProps {
  courseCode: string;
  isAdmin?: boolean;
}

export const CourseTopicSlider: React.FC<CourseTopicSliderProps> = ({ 
  courseCode, 
  isAdmin = false 
}) => {
  const navigate = useNavigate();
  // Generate placement key based on course code (e.g., "mus240-topic-photos")
  const placementKey = `${courseCode.toLowerCase().replace(' ', '')}-topic-photos`;
  
  const { data: slider, isLoading } = useSliderByPlacement(placementKey);

  // If no slider exists and not admin, show nothing
  if (!isLoading && (!slider || slider.slides.length === 0) && !isAdmin) {
    return null;
  }

  // Show empty state with setup button for admins
  if (!isLoading && (!slider || slider.slides.length === 0) && isAdmin) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/30">
        <CardContent className="py-8 text-center">
          <Images className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-medium text-muted-foreground mb-2">Topic Photo Slider</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add photos for the current topic. Create a slider with placement key: <code className="bg-muted px-1 py-0.5 rounded text-xs">{placementKey}</code>
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/admin/sliders')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Sliders
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Images className="h-4 w-4 text-primary" />
          Current Topic
        </CardTitle>
        {isAdmin && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/admin/sliders')}
            className="h-7 px-2 text-xs"
          >
            <Settings className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <UniversalSlider 
          placementKey={placementKey} 
          className="rounded-none"
        />
      </CardContent>
    </Card>
  );
};

export default CourseTopicSlider;
