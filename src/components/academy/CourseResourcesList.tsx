import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Video, Headphones, FileText, Play, File, X, Presentation } from 'lucide-react';
import { useCourseResources } from '@/hooks/useCourseResources';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { NativePowerPointViewer } from '@/components/mus240/NativePowerPointViewer';

interface CourseResourcesListProps {
  courseId: string;
  type: 'videos' | 'audio' | 'documents';
}

type ViewerItem = {
  title: string;
  description?: string | null;
  kind: 'youtube' | 'video' | 'audio' | 'document';
  url: string;
};

export const CourseResourcesList: React.FC<CourseResourcesListProps> = ({ courseId, type }) => {
  const { videos, audios, documents, loading } = useCourseResources(courseId);
  const [viewer, setViewer] = useState<ViewerItem | null>(null);
  const [showPptxViewer, setShowPptxViewer] = useState(false);

  const resourceData = useMemo(() => {
    switch (type) {
      case 'videos':
        return {
          title: 'Video Library',
          icon: Video,
          items: videos,
          emptyMessage: 'No videos available yet.',
        };
      case 'audio':
        return {
          title: 'Audio Examples',
          icon: Headphones,
          items: audios,
          emptyMessage: 'No audio examples available yet.',
        };
      case 'documents':
        return {
          title: 'Course Documents',
          icon: FileText,
          items: documents,
          emptyMessage: 'No documents available yet.',
        };
    }
  }, [type, videos, audios, documents]);

  const Icon = resourceData.icon;

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0&modestbranding=1` : url;
  };

  const getGoogleDocsEmbedUrl = (url: string) => {
    // Avoid iframing Supabase URLs directly (CSP blocks frame-src).
    // Google Docs viewer is allowed by CSP and handles PDFs well.
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  };

  const resolveItemUrl = (item: any): ViewerItem | null => {
    if (type === 'videos') {
      if (item.video_type === 'youtube' && item.youtube_url) {
        return { title: item.title, description: item.description, kind: 'youtube', url: getYouTubeEmbedUrl(item.youtube_url) };
      }
      if (item.video_path) {
        const { data } = supabase.storage.from('course-videos').getPublicUrl(item.video_path);
        return { title: item.title, description: item.description, kind: 'video', url: data.publicUrl };
      }
      return null;
    }

    if (type === 'audio') {
      if (!item.audio_path) return null;
      const { data } = supabase.storage.from('course-audio').getPublicUrl(item.audio_path);
      return { title: item.title, description: item.description, kind: 'audio', url: data.publicUrl };
    }

    // documents
    if (!item.document_path) return null;
    const { data } = supabase.storage.from('course-documents').getPublicUrl(item.document_path);
    return { title: item.title, description: item.description, kind: 'document', url: data.publicUrl };
  };

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
    <>
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
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2"
                        onClick={() => {
                          const resolved = resolveItemUrl(item);
                          if (resolved) setViewer(resolved);
                        }}
                      >
                        {type === 'videos' ? (
                          <Play className="h-4 w-4" />
                        ) : type === 'audio' ? (
                          <Play className="h-4 w-4" />
                        ) : (
                          <File className="h-4 w-4" />
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

      <Dialog open={!!viewer} onOpenChange={(open) => !open && setViewer(null)}>
        <DialogContent className="max-w-5xl h-[80vh] flex flex-col" aria-describedby="course-resource-viewer-desc">
          <span id="course-resource-viewer-desc" className="sr-only">Viewing course resource</span>
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="truncate">{viewer?.title}</DialogTitle>
                {viewer?.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{viewer.description}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setViewer(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-hidden rounded-lg border bg-background">
            {viewer?.kind === 'youtube' && (
              <iframe
                src={viewer.url}
                title={viewer.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            )}

            {viewer?.kind === 'video' && (
              <div className="w-full h-full bg-black flex items-center justify-center">
                <video className="w-full h-full" controls playsInline src={viewer.url} />
              </div>
            )}

            {viewer?.kind === 'audio' && (
              <div className="w-full h-full flex items-center justify-center p-6">
                <audio className="w-full max-w-2xl" controls src={viewer.url} />
              </div>
            )}

            {viewer?.kind === 'document' && (
              (() => {
                const lowerUrl = viewer.url.toLowerCase();
                const isPdf = lowerUrl.includes('.pdf');
                const isPowerPoint = lowerUrl.includes('.ppt') || lowerUrl.includes('.pptx');
                const isSupabaseStorage = viewer.url.includes('supabase.co');

                if (isPowerPoint) {
                  return (
                    <div className="w-full h-full flex items-center justify-center p-6">
                      <div className="text-center max-w-sm">
                        <div className="p-4 rounded-full bg-primary/10 inline-block mb-4">
                          <Presentation className="h-12 w-12 text-primary" />
                        </div>
                        <h4 className="font-semibold mb-2">{viewer.title}</h4>
                        {viewer.description && (
                          <p className="text-sm text-muted-foreground mb-4">{viewer.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mb-4">
                          This presentation will open in the slideshow viewer.
                        </p>
                        <Button size="lg" onClick={() => setShowPptxViewer(true)} className="w-full sm:w-auto">
                          <Presentation className="h-4 w-4 mr-2" />
                          Open Slideshow
                        </Button>
                      </div>
                    </div>
                  );
                }

                const iframeUrl = isSupabaseStorage && isPdf ? getGoogleDocsEmbedUrl(viewer.url) : viewer.url;

                return (
                  <iframe
                    src={iframeUrl}
                    title={viewer.title}
                    className="w-full h-full"
                    loading="lazy"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  />
                );
              })()
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Native slideshow for PPT/PPTX opened from CourseResourcesList */}
      {viewer?.kind === 'document' && (
        <NativePowerPointViewer
          isOpen={showPptxViewer}
          onClose={() => setShowPptxViewer(false)}
          fileUrl={viewer.url}
          fileName={viewer.title}
          title={viewer.title}
        />
      )}
    </>
  );
};

