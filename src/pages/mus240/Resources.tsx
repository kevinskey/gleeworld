import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, ExternalLink, BookOpen, Globe, FileText, Settings, Download, Eye } from 'lucide-react';
import { useMus240Resources, type Mus240Resource } from '@/integrations/supabase/hooks/useMus240Resources';
import { DocumentViewer } from '@/components/mus240/DocumentViewer';
import backgroundImage from '@/assets/mus240-background.jpg';

export default function Resources() {
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
    // Check for external previewable content
    const url = resource.url.toLowerCase();
    const isGoogleSlides = url.includes('docs.google.com/presentation') || url.includes('slides.google.com');
    const isYouTube = url.includes('youtu.be') || url.includes('youtube.com/watch');
    const isWebsite = resource.category === 'website' || url.startsWith('http');
    
    // External previewable content
    if (isGoogleSlides || isYouTube || isWebsite) {
      return true;
    }
    
    // File uploads
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
      case 'video': return FileText;
      case 'article': return FileText;
      case 'database': return Users;
      case 'audio': return FileText;
      default: return FileText;
    }
  };

  const getCategoryColor = (category: Mus240Resource['category']) => {
    switch (category) {
      case 'reading': return 'bg-blue-100 text-blue-800';
      case 'website': return 'bg-green-100 text-green-800';
      case 'video': return 'bg-purple-100 text-purple-800';
      case 'article': return 'bg-orange-100 text-orange-800';
      case 'database': return 'bg-indigo-100 text-indigo-800';
      case 'audio': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat relative"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      >
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20"></div>
        
        <main className="relative z-10 max-w-6xl mx-auto p-6">
          {/* Header with back navigation */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Link 
                to="/mus-240" 
                className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to MUS 240
              </Link>
              
              <Link 
                to="/classes/mus240/resources/admin" 
                className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 hover:bg-white/20"
              >
                <Settings className="h-4 w-4" />
                Manage Resources
              </Link>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center gap-3 mb-4 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                <Users className="h-6 w-6 md:h-7 md:w-7 text-amber-300" />
                <span className="text-white/90 font-medium text-xl md:text-2xl lg:text-xl xl:text-2xl">Resources</span>
              </div>
              
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold mb-2 bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent drop-shadow-2xl">
                MUS 240 Resources
              </h1>
              <p className="text-white/80 text-xl sm:text-lg md:text-2xl lg:text-xl xl:text-2xl">Readings, citations, media, and research materials</p>
            </div>
          </div>

          {/* Resources Grid */}
          <div className="space-y-8">
            {isLoading ? (
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 text-white/40 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">Loading Resources...</h3>
                  <p className="text-white/60">Please wait while we fetch the resources</p>
                </CardContent>
              </Card>
            ) : !resources || resources.length === 0 ? (
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 text-white/40 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">No Resources Yet</h3>
                  <p className="text-white/60">Resources will be added throughout the semester</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {resources.map((resource) => {
                  const IconComponent = getCategoryIcon(resource.category);
                  
                  return (
                    <Card 
                      key={resource.id} 
                      className="group bg-white/95 backdrop-blur-sm border border-white/30 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 sm:p-1 md:p-2 lg:p-3 xl:p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-md">
                                <IconComponent className="h-4 w-4 sm:h-3 sm:w-3 md:h-5 md:w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7 text-white" />
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryColor(resource.category)}`}>
                                {resource.category}
                              </span>
                            </div>
                            <CardTitle className="text-xl sm:text-base md:text-xl lg:text-lg xl:text-xl text-gray-900 group-hover:text-primary transition-colors">
                              {resource.title}
                            </CardTitle>
                          </div>
                          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <p className="text-lg sm:text-sm md:text-lg lg:text-base xl:text-lg text-gray-600 leading-relaxed">
                          {resource.description}
                        </p>
                        
                         <div className="flex gap-2">
                           {/* Preview Button for supported content */}
                           {canPreview(resource) && (
                             <Button
                               onClick={() => openViewer(resource)}
                               size="sm"
                               variant="outline"
                               className="w-full bg-white/20 hover:bg-white/30 text-gray-700 hover:text-gray-900 border-gray-300"
                             >
                               <Eye className="h-4 w-4 mr-2" />
                               Preview
                             </Button>
                           )}
                           
                           {/* For non-previewable content */}
                           {!canPreview(resource) && (
                             <Button 
                               asChild
                               size="sm" 
                               className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0"
                             >
                               <a 
                                 href={resource.url} 
                                 target="_blank" 
                                 rel="noopener noreferrer"
                                 className="inline-flex items-center gap-2"
                               >
                                 <ExternalLink className="h-4 w-4" />
                                 Access Resource
                               </a>
                             </Button>
                           )}
                         </div>
                        
                        {/* Show file size for downloads */}
                        {resource.is_file_upload && resource.file_size && (
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            {(resource.file_size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* Document Viewer Modal */}
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
      </div>
    </UniversalLayout>
  );
}