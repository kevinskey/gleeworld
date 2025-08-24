import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Headphones, 
  Download, 
  Search, 
  Filter,
  Music,
  Play,
  Pause
} from 'lucide-react';
import { useAssignments } from '@/hooks/useAssignments';

interface ResourceLibraryProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
  };
}

export const ResourceLibrary: React.FC<ResourceLibraryProps> = ({ user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const { assignments } = useAssignments();

  // Filter assignments to get resources
  const pdfResources = assignments.filter(
    a => a.assignment_type === 'pdf_resource' && a.pdf_url
  );
  
  const audioResources = assignments.filter(
    a => a.assignment_type === 'audio_resource' && a.audio_url
  );
  
  const sectionNotes = assignments.filter(
    a => a.assignment_type === 'section_notes' && a.notes
  );

  // All resources combined for search
  const allResources = [
    ...pdfResources.map(a => ({ ...a, resourceType: 'pdf' })),
    ...audioResources.map(a => ({ ...a, resourceType: 'audio' })),
    ...sectionNotes.map(a => ({ ...a, resourceType: 'notes' }))
  ];

  const filteredResources = allResources.filter(resource =>
    resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (resource.description && resource.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAudioPlay = (audioId: string) => {
    setPlayingAudio(playingAudio === audioId ? null : audioId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'audio':
        return <Headphones className="h-4 w-4" />;
      case 'notes':
        return <Music className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const renderResourceCard = (resource: any) => (
    <Card key={resource.id} className="w-full overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="card-header-compact">
        <div className="flex flex-col sm:flex-row items-start justify-between card-spacing">
          <div className="section-spacing flex-1 min-w-0">
            <div className="flex items-center gap-1 md:gap-2">
              {getResourceIcon(resource.resourceType)}
              <CardTitle className="mobile-text-xl truncate leading-tight">
                {resource.title}
              </CardTitle>
            </div>
            <CardDescription className="mobile-text-lg leading-relaxed line-clamp-2">
              {resource.description}
            </CardDescription>
          </div>
          <Badge variant="outline" className="self-start flex-shrink-0 text-xs">
            {resource.resourceType.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="card-compact section-spacing">
        <div className="mobile-text-lg text-muted-foreground">
          Added: {formatDate(resource.created_at)}
        </div>

        {resource.notes && resource.resourceType === 'notes' && (
          <div className="p-2 md:p-3 bg-muted rounded-lg">
            <p className="mobile-text-lg">{resource.notes}</p>
          </div>
        )}

        {resource.resourceType === 'pdf' && resource.pdf_url && (
          <Button
            variant="outline"
            onClick={() => window.open(resource.pdf_url, '_blank')}
            className="w-full sm:w-auto touch-target"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden xs:inline">Download PDF</span>
            <span className="xs:hidden">PDF</span>
          </Button>
        )}

        {resource.resourceType === 'audio' && resource.audio_url && (
          <div className="section-spacing">
            <div className="flex flex-col sm:flex-row items-start sm:items-center card-spacing">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAudioPlay(resource.id)}
                className="w-full sm:w-auto touch-target"
              >
                {playingAudio === resource.id ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    <span className="hidden xs:inline">Pause Audio</span>
                    <span className="xs:hidden">Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    <span className="hidden xs:inline">Play Audio</span>
                    <span className="xs:hidden">Play</span>
                  </>
                )}
              </Button>
              <span className="mobile-text-lg text-muted-foreground">Audio Resource</span>
            </div>
            <audio
              controls
              className="w-full max-w-full"
              onPlay={() => setPlayingAudio(resource.id)}
              onPause={() => setPlayingAudio(null)}
              onEnded={() => setPlayingAudio(null)}
            >
              <source src={resource.audio_url} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full overflow-hidden section-spacing p-0.5 md:p-1">
      {/* Search and Filter */}
      <Card className="w-full overflow-hidden">
        <CardHeader className="card-header-compact">
          <CardTitle className="page-header">Resource Library</CardTitle>
          <CardDescription className="mobile-text-lg">
            Access section notes, audio resources, and PDF materials from your instructors.
          </CardDescription>
        </CardHeader>
        <CardContent className="card-compact pt-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center card-spacing">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resource Tabs */}
      <div className="w-full overflow-hidden">
        <Tabs defaultValue="all" className="section-spacing">
          <div className="sticky top-0 bg-background z-30 pb-1 md:pb-2">
            <TabsList className="responsive-grid-2 md:grid-cols-4 gap-0.5 h-auto p-0.5 md:p-1">
              <TabsTrigger 
                value="all" 
                className="dropdown-item-compact h-auto touch-target flex flex-col items-center justify-center"
              >
                <span className="hidden sm:inline text-center">All Resources</span>
                <span className="sm:hidden text-center">All</span>
                <span className="text-xs opacity-75">({allResources.length})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="notes" 
                className="dropdown-item-compact h-auto touch-target flex flex-col items-center justify-center"
              >
                <span className="hidden sm:inline text-center">Section Notes</span>
                <span className="sm:hidden text-center">Notes</span>
                <span className="text-xs opacity-75">({sectionNotes.length})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="pdfs" 
                className="dropdown-item-compact h-auto touch-target flex flex-col items-center justify-center"
              >
                <span className="hidden sm:inline text-center">PDFs</span>
                <span className="sm:hidden text-center">PDF</span>
                <span className="text-xs opacity-75">({pdfResources.length})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="audio" 
                className="dropdown-item-compact h-auto touch-target flex flex-col items-center justify-center"
              >
                <span className="hidden sm:inline text-center">Audio</span>
                <span className="sm:hidden text-center">Audio</span>
                <span className="text-xs opacity-75">({audioResources.length})</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="section-spacing">
            {filteredResources.length === 0 ? (
              <Card>
                <CardContent className="card-compact flex flex-col items-center justify-center py-8 md:py-12">
                  <FileText className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mb-2 md:mb-4" />
                  <h3 className="page-header">No Resources Found</h3>
                  <p className="text-muted-foreground text-center mobile-text-lg">
                    {searchTerm 
                      ? 'No resources match your search criteria.' 
                      : 'Your instructors haven\'t shared any resources yet.'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="section-spacing">
                {filteredResources.map(renderResourceCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            {sectionNotes.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Music className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Section Notes</h3>
                  <p className="text-muted-foreground text-center">
                    Your section leader hasn't shared any notes yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sectionNotes.map(resource => renderResourceCard({ ...resource, resourceType: 'notes' }))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pdfs" className="space-y-4">
            {pdfResources.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No PDF Resources</h3>
                  <p className="text-muted-foreground text-center">
                    No PDF resources have been shared yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pdfResources.map(resource => renderResourceCard({ ...resource, resourceType: 'pdf' }))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="audio" className="space-y-4">
            {audioResources.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Headphones className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Audio Resources</h3>
                  <p className="text-muted-foreground text-center">
                    No audio resources have been shared yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {audioResources.map(resource => renderResourceCard({ ...resource, resourceType: 'audio' }))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};