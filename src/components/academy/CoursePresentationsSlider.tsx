import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Images, ChevronLeft, ChevronRight, Presentation, Loader2, 
  FolderOpen, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCoursePresentations, type CoursePresentation } from '@/hooks/useCoursePresentations';
import { CoursePptSlider } from './CoursePptSlider';
import { useNavigate } from 'react-router-dom';

interface CoursePresentationsSliderProps {
  courseCode: string;
  isAdmin?: boolean;
  className?: string;
}

/**
 * Displays PowerPoint presentations from the media library for a course.
 * Upload PPTX files to the media library with the course code in tags/category/title.
 */
export const CoursePresentationsSlider: React.FC<CoursePresentationsSliderProps> = ({ 
  courseCode,
  isAdmin = false,
  className
}) => {
  const navigate = useNavigate();
  const { presentations, loading, error, refetch } = useCoursePresentations(courseCode);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // If multiple presentations, show a selector
  const currentPresentation = presentations[selectedIndex];

  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Presentation className="h-4 w-4 text-primary" />
            Course Presentations
          </CardTitle>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading presentations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Presentation className="h-4 w-4 text-primary" />
            Course Presentations
          </CardTitle>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // No presentations found - show empty state with instructions for admins
  if (presentations.length === 0) {
    return (
      <Card className={cn("border-dashed border-2 border-muted-foreground/30", className)}>
        <CardContent className="py-8 text-center">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-medium text-muted-foreground mb-2">No Presentations</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            Upload PowerPoint files (.pptx) to the Media Library with tag "{courseCode.toLowerCase().replace(/\s+/g, '')}" to display them here.
          </p>
          {isAdmin && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/dashboard?module=media-library')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Open Media Library
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Presentation selector if multiple presentations */}
      {presentations.length > 1 && (
        <div className="flex items-center gap-2 px-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setSelectedIndex(prev => Math.max(0, prev - 1))}
            disabled={selectedIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 flex items-center justify-center gap-1.5 overflow-x-auto py-1">
            {presentations.map((pres, idx) => (
              <button
                key={pres.id}
                className={cn(
                  "px-2 py-1 text-xs rounded-md transition-colors whitespace-nowrap",
                  idx === selectedIndex 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
                onClick={() => setSelectedIndex(idx)}
                title={pres.title}
              >
                {pres.title.length > 20 ? pres.title.slice(0, 20) + '...' : pres.title}
              </button>
            ))}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setSelectedIndex(prev => Math.min(presentations.length - 1, prev + 1))}
            disabled={selectedIndex === presentations.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Display selected presentation */}
      {currentPresentation && (
        <CoursePptSlider
          presentationUrl={currentPresentation.file_url}
          presentationTitle={currentPresentation.title}
        />
      )}
    </div>
  );
};

export default CoursePresentationsSlider;
