import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookMarked, ExternalLink, Music, BookOpen, FileText, Users, History, Scroll, Library, NotebookPen, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentSection = TEXTBOOK_SECTIONS.find(s => s.id === activeSection) || TEXTBOOK_SECTIONS[0];

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error: fnError } = await supabase.functions.invoke('conducting-proxy', {
          body: { path: currentSection.path }
        });

        if (fnError) {
          throw new Error(fnError.message);
        }

        if (typeof data === 'string') {
          setHtmlContent(data);
        } else if (data?.error) {
          throw new Error(data.error);
        } else {
          setHtmlContent('');
        }
      } catch (err) {
        console.error('Failed to load textbook content:', err);
        setError(err instanceof Error ? err.message : 'Failed to load content');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [currentSection.path]);

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

          <div className="rounded-lg border overflow-hidden bg-background min-h-[500px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-[500px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
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
                srcDoc={htmlContent}
                style={{ width: '100%', height: '70vh', minHeight: '500px' }}
                title={`Textbook - ${currentSection.label}`}
                className="bg-white"
                sandbox="allow-scripts allow-same-origin"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
