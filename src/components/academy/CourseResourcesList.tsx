import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Video, Headphones, FileText, ExternalLink, Download } from 'lucide-react';
import { useCourseResources } from '@/hooks/useCourseResources';
import { Button } from '@/components/ui/button';

interface CourseResourcesListProps {
  courseId: string;
  type: 'videos' | 'audio' | 'documents';
}

export const CourseResourcesList: React.FC<CourseResourcesListProps> = ({ courseId, type }) => {
  const { videos, audios, documents, loading } = useCourseResources(courseId);

  const getResourceData = () => {
    switch (type) {
      case 'videos':
        return {
          title: 'Video Library',
          icon: Video,
          items: videos,
          emptyMessage: 'No videos available yet.'
        };
      case 'audio':
        return {
          title: 'Audio Examples',
          icon: Headphones,
          items: audios,
          emptyMessage: 'No audio examples available yet.'
        };
      case 'documents':
        return {
          title: 'Course Documents',
          icon: FileText,
          items: documents,
          emptyMessage: 'No documents available yet.'
        };
    }
  };

  const resourceData = getResourceData();
  const Icon = resourceData.icon;

  if (loading) {
    return (
      <Card className="bg-card/50 border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Icon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">{resourceData.title}</h2>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Icon className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">{resourceData.title}</h2>
        </div>
        
        {resourceData.items.length === 0 ? (
          <p className="text-muted-foreground">{resourceData.emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {resourceData.items.map((item: any) => (
              <Card key={item.id} className="bg-muted/30 border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="ml-2">
                      {type === 'videos' && item.youtube_url ? (
                        <ExternalLink className="h-4 w-4" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
