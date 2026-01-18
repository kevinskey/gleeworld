import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, BookOpen, Globe, FileText, Users, 
  Eye, Settings, Video, Music, Database, Loader2 
} from 'lucide-react';
import { useMus240Resources, type Mus240Resource } from '@/integrations/supabase/hooks/useMus240Resources';
import { DocumentViewer } from '@/components/mus240/DocumentViewer';

interface Mus240ResourcesTabProps {
  isAdmin?: boolean;
}

export const Mus240ResourcesTab: React.FC<Mus240ResourcesTabProps> = ({ isAdmin = false }) => {
  const { data: resources, isLoading } = useMus240Resources();
  const [viewerState, setViewerState] = useState<{
    isOpen: boolean;
    resource: Mus240Resource | null;
  }>({
    isOpen: false,
    resource: null,
  });

  const openViewer = (resource: Mus240Resource) => {
    setViewerState({ isOpen: true, resource });
  };

  const closeViewer = () => {
    setViewerState({ isOpen: false, resource: null });
  };

  const canPreview = (resource: Mus240Resource) => {
    const url = resource.url.toLowerCase();
    const isGoogleSlides = url.includes('docs.google.com/presentation') || url.includes('slides.google.com');
    const isYouTube = url.includes('youtu.be') || url.includes('youtube.com/watch');
    const isWebsite = resource.category === 'website' || url.startsWith('http');
    
    if (isGoogleSlides || isYouTube || isWebsite) {
      return true;
    }
    
    if (!resource.is_file_upload) return false;
    
    const fileName = resource.file_name?.toLowerCase() || '';
    const mimeType = resource.mime_type || '';
    
    return (
      mimeType === 'application/pdf' ||
      fileName.endsWith('.pdf') ||
      mimeType.includes('presentation') ||
      fileName.endsWith('.ppt') ||
      fileName.endsWith('.pptx')
    );
  };

  const getCategoryIcon = (category: Mus240Resource['category']) => {
    switch (category) {
      case 'reading': return BookOpen;
      case 'website': return Globe;
      case 'video': return Video;
      case 'article': return FileText;
      case 'database': return Database;
      case 'audio': return Music;
      default: return FileText;
    }
  };

  const getCategoryColor = (category: Mus240Resource['category']) => {
    switch (category) {
      case 'reading': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'website': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'video': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'article': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'database': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
      case 'audio': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Course Resources
        </CardTitle>
        {isAdmin && (
          <Link to="/classes/mus240/resources/admin">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {!resources || resources.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Resources Yet</h3>
            <p className="text-muted-foreground">Resources will be added throughout the semester</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => {
              const IconComponent = getCategoryIcon(resource.category);
              
              return (
                <Card 
                  key={resource.id} 
                  className="group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="p-2 bg-primary/10 rounded-md shrink-0">
                          <IconComponent className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Badge className={`text-xs ${getCategoryColor(resource.category)}`}>
                            {resource.category}
                          </Badge>
                          <CardTitle className="text-sm mt-1 truncate">
                            {resource.title}
                          </CardTitle>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {resource.description}
                    </p>
                    
                    <div className="flex gap-2">
                      {canPreview(resource) ? (
                        <Button
                          onClick={() => openViewer(resource)}
                          size="sm"
                          variant="outline"
                          className="w-full"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                      ) : (
                        <Button 
                          asChild
                          size="sm" 
                          className="w-full"
                        >
                          <a href={resource.url}>
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open
                          </a>
                        </Button>
                      )}
                    </div>
                    
                    {resource.is_file_upload && resource.file_size && (
                      <p className="text-xs text-muted-foreground text-center">
                        {(resource.file_size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>

      {viewerState.resource && (
        <DocumentViewer
          isOpen={viewerState.isOpen}
          onClose={closeViewer}
          fileUrl={viewerState.resource.url}
          fileName={viewerState.resource.file_name || 'document'}
          fileType={viewerState.resource.mime_type || ''}
          title={viewerState.resource.title}
        />
      )}
    </Card>
  );
};
