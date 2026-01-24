import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookMarked, ExternalLink, Music, BookOpen, FileText, Users, History, Scroll, Library, NotebookPen, Loader2, AlertCircle } from 'lucide-react';

interface TextbookSection {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  description: string;
}

const TEXTBOOK_SECTIONS: TextbookSection[] = [
  { id: 'patterns', label: 'Fundamentals', icon: Music, path: '/patterns', description: 'Interactive animated beat patterns' },
  { id: 'terms', label: 'Terminology', icon: BookOpen, path: '/terms', description: 'Musical terms glossary' },
  { id: 'history', label: 'Choral History', icon: History, path: '/history', description: 'Medieval to Gospel eras' },
  { id: 'conducting-history', label: 'Conducting History', icon: Users, path: '/conducting-history', description: 'Evolution of the podium' },
  { id: 'conventions', label: 'Conventions', icon: Scroll, path: '/conventions', description: 'Performance practice' },
  { id: 'works', label: 'Major Works', icon: FileText, path: '/works', description: 'Choral masterpieces' },
  { id: 'repertoire', label: 'Repertoire', icon: Library, path: '/repertoire', description: 'Searchable database' },
  { id: 'workbook', label: 'Workbook', icon: NotebookPen, path: '/workbook', description: '15-week companion' },
];

const baseUrl = 'https://conducting.gleeworld.org';

export const ConductingTextbook: React.FC = () => {
  const [activeSection, setActiveSection] = useState('patterns');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentSection = TEXTBOOK_SECTIONS.find(s => s.id === activeSection) || TEXTBOOK_SECTIONS[0];

  // Direct iframe embedding - no proxy needed for Lovable-to-Lovable
  const iframeSrc = useMemo(() => {
    return `${baseUrl}${currentSection.path}`;
  }, [currentSection.path]);

  // When switching tabs, show a loader until the iframe reports it loaded.
  React.useEffect(() => {
    setIsLoading(true);
    setError(null);
  }, [iframeSrc]);

  const openInNewTab = () => {
    window.open(`${baseUrl}${currentSection.path}`, '_blank');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookMarked className="h-5 w-5 text-primary" />
              Conductor's Reference Guide
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={openInNewTab}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {currentSection.description}
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeSection} onValueChange={setActiveSection}>
            <TabsList className="grid grid-cols-4 lg:grid-cols-8 h-auto gap-1 mb-4">
              {TEXTBOOK_SECTIONS.map(section => (
                <TabsTrigger 
                  key={section.id} 
                  value={section.id}
                  className="flex flex-col items-center gap-1 py-2 px-1 text-xs"
                >
                  <section.icon className="h-4 w-4" />
                  <span className="truncate text-[10px]">{section.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="rounded-lg border overflow-hidden bg-background min-h-[500px] relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {error ? (
              <div className="flex flex-col items-center justify-center h-[500px] gap-4 text-muted-foreground">
                <AlertCircle className="h-12 w-12" />
                <p>Failed to load content</p>
                <Button onClick={openInNewTab} variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab Instead
                </Button>
              </div>
            ) : (
              <iframe
                src={iframeSrc}
                style={{ width: '100%', height: '70vh', minHeight: '500px' }}
                title={`Textbook - ${currentSection.label}`}
                className="bg-white"
                // Allow the embedded Lovable SPA to boot properly (storage, same-origin APIs, etc.).
                // Keep navigation restricted unless the user explicitly interacts.
                sandbox="allow-scripts allow-forms allow-popups allow-same-origin allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                onLoad={() => {
                  setIsLoading(false);
                }}
                onError={() => {
                  setIsLoading(false);
                  setError('Failed to load content');
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
