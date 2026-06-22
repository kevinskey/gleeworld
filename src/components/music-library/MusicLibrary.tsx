// Music Library — redesigned to match the Calendly/Workshop visual system.
// Left card: a tabbed score browser (Library / Study / Collections / Setlists)
// with a single search input above it. Right card: the PDF viewer (or an
// empty-state hint when nothing is selected). Both live inside soft cards
// with the shared shadow profile and resize via a thin handle.
//
// Mobile path keeps the existing MobileMusicLibrary / MobilePDFViewer
// flow — that surface is tuned for touch and full-screen viewing.

import { useEffect, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Music, Search, Eye, FileText, Library, BookOpen, ListMusic, Layers,
} from 'lucide-react';
import { SheetMusicLibrary } from './SheetMusicLibrary';
import { SetlistBuilder } from './SetlistBuilder';
import { SetlistPlayer } from './SetlistPlayer';
import { StudyScoresPanel } from './StudyScoresPanel';
import { MyCollectionsPanel } from './MyCollectionsPanel';
import { SheetMusicViewDialog } from './SheetMusicViewDialog';
import { PDFViewerWithAnnotations } from '@/components/PDFViewerWithAnnotations';
import { MobileMusicLibrary } from './MobileMusicLibrary';
import { MobilePDFViewer } from './MobilePDFViewer';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

type Tab = 'library' | 'study' | 'collections' | 'setlists';

export const MusicLibrary = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [selectedPdf, setSelectedPdf] = useState<{ url: string; title: string; id?: string } | null>(null);
  const [tab, setTab] = useState<Tab>('library');
  const [search, setSearch] = useState('');
  const [studyItem, setStudyItem] = useState<any>(null);
  const [studyDialogOpen, setStudyDialogOpen] = useState(false);
  const [activeSetlistPlayer, setActiveSetlistPlayer] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'library' | 'viewer'>('library');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // ?view=<scoreId> deep-link from the assistant — fetch + select.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const viewScoreId = params.get('view');
    if (!viewScoreId) return;
    (async () => {
      try {
        const { data: score, error } = await supabase
          .from('gw_sheet_music')
          .select('id, title, pdf_url')
          .eq('id', viewScoreId)
          .maybeSingle();
        if (error || !score || !score.pdf_url) {
          toast({ title: 'Score not found', description: 'The requested score could not be found.', variant: 'destructive' });
          return;
        }
        setSelectedPdf({ url: score.pdf_url, title: score.title, id: score.id });
        navigate('/music-library', { replace: true });
      } catch (err) {
        console.error('Error opening score from URL:', err);
      }
    })();
  }, [location.search, navigate, toast]);

  const handlePdfSelect = (pdfUrl: string, title: string, id?: string) => {
    setSelectedPdf({ url: pdfUrl, title, id });
    if (isMobile) setMobileView('viewer');
  };

  const openStudyMode = async () => {
    if (!selectedPdf) {
      toast({ title: 'Select a piece', description: 'Choose a score to open Study Mode' });
      return;
    }
    let item: any = null;
    if (selectedPdf.id) {
      const { data } = await supabase.from('gw_sheet_music').select('*').eq('id', selectedPdf.id).maybeSingle();
      if (data) item = data;
    }
    if (!item) {
      item = {
        id: selectedPdf.id || 'temp',
        title: selectedPdf.title,
        pdf_url: selectedPdf.url,
        is_public: false,
        created_at: new Date().toISOString(),
      };
    }
    setStudyItem(item);
    setStudyDialogOpen(true);
  };

  // Setlist Player takes over the whole surface when active.
  if (activeSetlistPlayer) {
    return <SetlistPlayer setlistId={activeSetlistPlayer} onClose={() => setActiveSetlistPlayer(null)} />;
  }

  // Mobile — keep the existing fullscreen flow, no redesign chrome.
  if (isMobile) {
    return (
      <div className={`bg-background w-full ${mobileView === 'viewer' ? 'fixed inset-0 z-50' : 'h-full'} flex flex-col overflow-hidden`}>
        <div className="flex-1 min-h-0 overflow-hidden">
          {mobileView === 'library' ? (
            <MobileMusicLibrary
              onPdfSelect={handlePdfSelect}
              onOpenSetlistPlayer={(id) => setActiveSetlistPlayer(id)}
              selectedPdf={selectedPdf}
              scrollContainerRef={scrollRef}
            />
          ) : (
            <MobilePDFViewer
              selectedPdf={selectedPdf}
              onBack={() => setMobileView('library')}
              onStudyMode={openStudyMode}
            />
          )}
        </div>
        <SheetMusicViewDialog open={studyDialogOpen} onOpenChange={setStudyDialogOpen} item={studyItem} />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-sans normal-case font-bold tracking-tight leading-tight text-2xl">
            Music Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your scores, study packets, collections, and setlists — all in one place.
          </p>
        </div>
        {selectedPdf && (
          <Button size="sm" variant="outline" onClick={openStudyMode}>
            <Eye className="w-4 h-4 mr-1.5" /> Study Mode
          </Button>
        )}
      </div>

      <PanelGroup direction="horizontal" className="min-h-[calc(100vh-12rem)]">
        {/* Left — tabbed browser */}
        <Panel defaultSize={selectedPdf ? 32 : 45} minSize={24} maxSize={55}>
          <Card className={SOFT_CARD + ' h-full'} style={SOFT_CARD_STYLE}>
            <CardContent className="p-5 h-full flex flex-col">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search the music library…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>

              <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="flex-1 flex flex-col min-h-0">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="library" className="text-xs"><Library className="w-3.5 h-3.5 mr-1" />Library</TabsTrigger>
                  <TabsTrigger value="study" className="text-xs"><BookOpen className="w-3.5 h-3.5 mr-1" />Study</TabsTrigger>
                  <TabsTrigger value="collections" className="text-xs"><Layers className="w-3.5 h-3.5 mr-1" />Mine</TabsTrigger>
                  <TabsTrigger value="setlists" className="text-xs"><ListMusic className="w-3.5 h-3.5 mr-1" />Sets</TabsTrigger>
                </TabsList>

                <TabsContent value="library" className="mt-4 flex-1 min-h-0 overflow-y-auto">
                  <SheetMusicLibrary
                    searchQuery={search}
                    selectedCategory="all"
                    sortBy="title"
                    sortOrder="asc"
                    viewMode="list"
                    onPdfSelect={handlePdfSelect}
                  />
                </TabsContent>
                <TabsContent value="study" className="mt-4 flex-1 min-h-0 overflow-y-auto">
                  <StudyScoresPanel currentSelected={selectedPdf} onOpenScore={handlePdfSelect} />
                </TabsContent>
                <TabsContent value="collections" className="mt-4 flex-1 min-h-0 overflow-y-auto">
                  <MyCollectionsPanel currentSelected={selectedPdf} onOpenScore={handlePdfSelect} />
                </TabsContent>
                <TabsContent value="setlists" className="mt-4 flex-1 min-h-0 overflow-y-auto">
                  <SetlistBuilder
                    onPdfSelect={handlePdfSelect}
                    onOpenPlayer={(id) => setActiveSetlistPlayer(id)}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </Panel>

        <PanelResizeHandle className="w-3 group flex items-center justify-center mx-1 cursor-col-resize">
          <div className="w-1 h-12 rounded-full bg-border group-hover:bg-primary/50 transition" />
        </PanelResizeHandle>

        {/* Right — viewer */}
        <Panel defaultSize={selectedPdf ? 68 : 55}>
          <Card className={SOFT_CARD + ' h-full overflow-hidden'} style={SOFT_CARD_STYLE}>
            {selectedPdf ? (
              <div className="h-full flex flex-col">
                <div className="flex items-center gap-3 p-4 border-b">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 inline-flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{selectedPdf.title}</div>
                    <div className="text-sm text-muted-foreground">Tap or drag to scroll. Use Study Mode for annotations.</div>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <PDFViewerWithAnnotations
                    key={selectedPdf.url}
                    pdfUrl={selectedPdf.url}
                    musicTitle={selectedPdf.title}
                    musicId={selectedPdf.id}
                    className="w-full h-full"
                  />
                </div>
              </div>
            ) : (
              <EmptyViewerState />
            )}
          </Card>
        </Panel>
      </PanelGroup>

      <SheetMusicViewDialog open={studyDialogOpen} onOpenChange={setStudyDialogOpen} item={studyItem} />
    </div>
  );
};

function EmptyViewerState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8 py-16 space-y-3">
      <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 inline-flex items-center justify-center">
        <Music className="w-8 h-8" />
      </div>
      <h2 className="font-semibold text-lg">Pick a score to start</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Browse the <span className="font-medium text-foreground">Library</span> tab on the left to open
        any piece, or jump into your <span className="font-medium text-foreground">Study</span> packet,
        personal <span className="font-medium text-foreground">Mine</span> collections, or
        upcoming <span className="font-medium text-foreground">Sets</span>.
      </p>
    </div>
  );
}
