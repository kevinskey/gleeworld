import React from 'react';
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

  // Show empty state with setup hint for admins (minimal)
  if (!isLoading && (!slider || slider.slides.length === 0) && isAdmin) {
    return (
      <div className="bg-muted/30 border border-dashed border-muted-foreground/30 rounded-lg py-8 text-center">
        <Images className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">
          Set cover image in Instructor Console
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden">
      <div className="aspect-[4/3] sm:aspect-[16/9] md:aspect-[16/8] lg:aspect-[16/7] w-full">
        <UniversalSlider 
          placementKey={placementKey} 
          className="rounded-none w-full h-full"
          objectFit="cover"
          enableLightbox
          autoPlay={false}
          showNavigation={slider && slider.slides.length > 1}
        />
      </div>
    </div>
  );
};

export default CourseTopicSlider;
