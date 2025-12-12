import React, { useState, useRef, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { SheetMusicLibrary } from './SheetMusicLibrary';
import { SetlistBuilder } from './SetlistBuilder';
import { SetlistPlayer } from './SetlistPlayer';
import { PDFViewerWithAnnotations } from '@/components/PDFViewerWithAnnotations';
import { MobileMusicLibrary } from './MobileMusicLibrary';
import { MobilePDFViewer } from './MobilePDFViewer';
import { Home, Users, Calendar, FileText, Activity, ArrowLeft, ArrowUp, Music, Eye, ChevronDown, ChevronRight, Smartphone, Monitor, Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { StudyScoresPanel } from './StudyScoresPanel';
import { MyCollectionsPanel } from './MyCollectionsPanel';
import { SheetMusicViewDialog } from './SheetMusicViewDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MusicLibraryHeader } from '@/components/music-library/MusicLibraryHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import { Breadcrumbs } from './Breadcrumbs';

export const MusicLibrary = () => {
  const [leftColumnCollapsed, setLeftColumnCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user
  } = useAuth();
  const {
    userProfile
  } = useUserProfile(user);
  const isMobile = useIsMobile();
  const [selectedPdf, setSelectedPdf] = useState<{
    url: string;
    title: string;
    id?: string;
  } | null>(null);
  const [mobileView, setMobileView] = useState<'library' | 'viewer'>('library');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    if (!isMobile) return;
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollTop(el.scrollTop > 300);
    el.addEventListener('scroll', onScroll);
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [isMobile]);
  const scrollToTop = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  const [activeSetlistPlayer, setActiveSetlistPlayer] = useState<string | null>(null);
  const [setlistOpen, setSetlistOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [studyDialogOpen, setStudyDialogOpen] = useState(false);
  const [studyItem, setStudyItem] = useState<any>(null);
  const {
    toast
  } = useToast();
  
  // Breadcrumb state
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  
  // Handle URL query parameter for auto-opening a score (from assistant)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const viewScoreId = searchParams.get('view');
    
    if (viewScoreId) {
      // Fetch the score and open it
      const fetchAndOpenScore = async () => {
        try {
          const { data: score, error } = await supabase
            .from('gw_sheet_music')
            .select('id, title, pdf_url')
            .eq('id', viewScoreId)
            .maybeSingle();
          
          if (error) {
            console.error('Error fetching score:', error);
            toast({
              title: 'Error',
              description: 'Could not load the requested score.',
              variant: 'destructive',
            });
            return;
          }
          
          if (score && score.pdf_url) {
            handlePdfSelect(score.pdf_url, score.title, score.id);
            // Clear the query param to avoid re-triggering
            navigate('/music-library', { replace: true });
          } else {
            toast({
              title: 'Score not found',
              description: 'The requested score could not be found or has no PDF.',
              variant: 'destructive',
            });
          }
        } catch (err) {
          console.error('Error opening score from URL:', err);
        }
      };
      
      fetchAndOpenScore();
    }
  }, [location.search]);
  
  const handlePdfSelect = (pdfUrl: string, title: string, id?: string) => {
    console.log('MusicLibrary: PDF selected:', {
      pdfUrl,
      title,
      id,
      isMobile
    });
    setSelectedPdf({
      url: pdfUrl,
      title,
      id
    });
    // On mobile, switch to viewer when PDF is selected
    if (isMobile) {
      console.log('MusicLibrary: Switching to viewer mode');
      setMobileView('viewer');
    }
  };
  const handleOpenSetlistPlayer = (setlistId: string) => {
    setActiveSetlistPlayer(setlistId);
  };
  const handleCloseSetlistPlayer = () => {
    setActiveSetlistPlayer(null);
  };
  const openStudyMode = async () => {
    if (!selectedPdf) {
      toast({
        title: 'Select a piece',
        description: 'Choose a score to open Study Mode'
      });
      return;
    }
    let item: any = null;
    if (selectedPdf.id) {
      const {
        data,
        error
      } = await supabase.from('gw_sheet_music').select('*').eq('id', selectedPdf.id).maybeSingle();
      if (!error && data) item = data;
    }
    if (!item) {
      item = {
        id: selectedPdf.id || 'temp',
        title: selectedPdf.title,
        composer: null,
        arranger: null,
        key_signature: null,
        time_signature: null,
        tempo_marking: null,
        difficulty_level: null,
        voice_parts: null,
        language: null,
        pdf_url: selectedPdf.url,
        audio_preview_url: null,
        thumbnail_url: null,
        tags: null,
        is_public: false,
        created_by: '',
        created_at: new Date().toISOString()
      };
    }
    setStudyItem(item);
    setStudyDialogOpen(true);
  };
  if (activeSetlistPlayer) {
    return <SetlistPlayer setlistId={activeSetlistPlayer} onClose={handleCloseSetlistPlayer} />;
  }
  const navigationItems = [{
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    route: '/dashboard'
  }, {
    id: 'calendar',
    label: 'Calendar',
    icon: Calendar,
    route: '/calendar'
  }, {
    id: 'events',
    label: 'Events',
    icon: Users,
    route: '/event-planner'
  }, {
    id: 'accounting',
    label: 'Accounting',
    icon: FileText,
    route: '/accounting'
  }, {
    id: 'activity',
    label: 'Activity',
    icon: Activity,
    route: '/activity-logs'
  }];

  // Mobile layout - simple fullscreen
  if (isMobile) {
    return <div className="bg-background w-full overflow-hidden">{/* Removed max-w-full as it's redundant */}
        {/* Simple Header with Back Button */}
        

        {/* Content */}
        <div className="flex-1">
          {mobileView === 'library' ? <MobileMusicLibrary onPdfSelect={handlePdfSelect} onOpenSetlistPlayer={handleOpenSetlistPlayer} selectedPdf={selectedPdf} scrollContainerRef={scrollRef} /> : <MobilePDFViewer selectedPdf={selectedPdf} onBack={() => setMobileView('library')} onStudyMode={openStudyMode} />}
        </div>

        {/* Study Mode Dialog */}
        <SheetMusicViewDialog open={studyDialogOpen} onOpenChange={setStudyDialogOpen} item={studyItem} />
      </div>;
  }

  // Desktop layout with resizable panels
  return <>
      <MusicLibraryHeader />
      <div className="w-full overflow-hidden px-0">
        {/* Desktop resizable layout */}
        <PanelGroup direction="horizontal" className="min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-3rem)]">
          {/* Left column - Library sections */}
          {!leftColumnCollapsed && (
            <>
              <Panel defaultSize={selectedPdf ? 20 : 35} minSize={15} maxSize={50} className="section-spacing lg:h-full lg:overflow-y-auto">
                <div className="space-y-4">
                  {/* Study Scores */}
                  <div className="w-full overflow-hidden border rounded">
                    <div className="flex items-center justify-between card-compact">
                      <button className="flex items-center gap-1 md:gap-2 mobile-text-lg font-medium touch-target" onClick={() => {
                      console.log('Study Scores button clicked, current state:', studyOpen);
                      const newState = !studyOpen;
                      setStudyOpen(newState);
                      setCurrentSection(newState ? 'study-scores' : null);
                    }}>
                        {studyOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} Study Scores
                      </button>
                    </div>
                    {studyOpen && <div className="card-compact">
                        <StudyScoresPanel currentSelected={selectedPdf} onOpenScore={handlePdfSelect} />
                      </div>}
                  </div>

                  {/* My Collections */}
                  <div className="w-full overflow-hidden border rounded">
                    <div className="flex items-center justify-between card-compact">
                      <button className="flex items-center gap-1 md:gap-2 mobile-text-lg font-medium touch-target" onClick={() => {
                      const newState = !collectionsOpen;
                      setCollectionsOpen(newState);
                      setCurrentSection(newState ? 'my-collections' : null);
                    }}>
                        {collectionsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} My Collections
                      </button>
                    </div>
                    {collectionsOpen && <div className="card-compact">
                        <MyCollectionsPanel currentSelected={selectedPdf} onOpenScore={handlePdfSelect} />
                      </div>}
                  </div>

                  {/* Setlists */}
                  <div className="w-full overflow-hidden border rounded">
                    <div className="flex items-center justify-between card-compact">
                      <button className="flex items-center gap-1 md:gap-2 mobile-text-lg font-medium touch-target" onClick={() => {
                      const newState = !setlistOpen;
                      setSetlistOpen(newState);
                      setCurrentSection(newState ? 'setlists' : null);
                    }}>
                        {setlistOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} Setlists
                      </button>
                    </div>
                    {setlistOpen && <div className="card-compact">
                        <SetlistBuilder onPdfSelect={handlePdfSelect} onOpenPlayer={handleOpenSetlistPlayer} />
                      </div>}
                  </div>

                  {/* Music Library list */}
                  <div className="w-full overflow-hidden border rounded">
                    <div className="flex items-center justify-between card-compact">
                      <button className="flex items-center gap-1 md:gap-2 mobile-text-lg font-medium touch-target" onClick={() => {
                      const newState = !libraryOpen;
                      setLibraryOpen(newState);
                      setCurrentSection(newState ? 'music-library' : null);
                    }}>
                        {libraryOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} Music Library
                      </button>
                    </div>
                    {libraryOpen && <div className="section-spacing">
                        {/* Search field for Music Library */}
                        <div className="card-compact">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input placeholder="Search music library..." value={librarySearchQuery} onChange={e => setLibrarySearchQuery(e.target.value)} className="pl-10 h-8 mobile-text-lg" />
                          </div>
                        </div>
                        
                        {/* Sheet Music Library */}
                        <div className="card-compact">
                          <SheetMusicLibrary 
                            searchQuery={librarySearchQuery} 
                            selectedCategory="all" 
                            sortBy="title" 
                            sortOrder="asc" 
                            viewMode="list" 
                            onPdfSelect={(url: string, title: string, id?: string) => {
                              console.log('MusicLibrary: PDF selected from SheetMusicLibrary:', { url, title, id });
                              handlePdfSelect(url, title, id);
                            }} 
                          />
                        </div>
                      </div>}
                  </div>
                </div>
              </Panel>
              
              <PanelResizeHandle className="w-2 bg-border hover:bg-muted transition-colors cursor-col-resize" />
            </>
          )}

          {/* Right column - PDF viewer */}
          <Panel defaultSize={leftColumnCollapsed ? 100 : selectedPdf ? 80 : 65} className="flex flex-col min-h-[120vh] lg:h-auto overflow-visible">
            {/* Breadcrumbs */}
            {currentSection && (
              <div className="mb-2 px-1 lg:px-0">
                <Breadcrumbs
                  items={[
                    {
                      label: 'Music Library',
                      onClick: () => setCurrentSection(null)
                    },
                    {
                      label: currentSection === 'study-scores' ? 'Study Scores' :
                             currentSection === 'my-collections' ? 'My Collections' :
                             currentSection === 'setlists' ? 'Setlists' : 'Music Library',
                      isActive: true
                    }
                  ]}
                />
              </div>
            )}
            
            <div className="flex items-center justify-between mb-1 px-1 lg:px-0">
              <h2 className="text-sm font-semibold">PDF Viewer</h2>
              <div className="flex items-center gap-2">
                {selectedPdf && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setLeftColumnCollapsed(!leftColumnCollapsed)}
                    className="gap-1 touch-target px-2"
                    aria-label={leftColumnCollapsed ? "Show sidebar" : "Hide sidebar"}
                  >
                    {leftColumnCollapsed ? "Show" : "Hide"} Sidebar
                  </Button>
                )}
                <Button size="sm" variant="outline" className="gap-1 md:gap-2 touch-target px-2 lg:px-3" aria-label="Study Mode" title="Study Mode" onClick={openStudyMode}>
                  <Eye className="h-3 w-3 lg:h-4 lg:w-4" />
                  <span className="hidden sm:inline mobile-text-lg">Study Mode</span>
                  <span className="sm:hidden text-xs">Study</span>
                </Button>
              </div>
            </div>
            {selectedPdf ? <div className="flex-1 overflow-hidden rounded-lg lg:rounded-xl">
                <PDFViewerWithAnnotations key={selectedPdf.url} pdfUrl={selectedPdf.url} musicTitle={selectedPdf.title} musicId={selectedPdf.id} className="w-full h-full" />
              </div> : <div className="flex-1 relative rounded-lg lg:rounded-xl overflow-hidden bg-background shadow-lg lg:shadow-xl ring-1 ring-border mx-1 lg:mx-0">
                <img src="/lovable-uploads/7dee05e5-4f0d-4fa1-9260-b97fd383d709.png" alt="Glee World Music Library landing image" className="absolute inset-0 w-full h-full object-contain object-top" loading="lazy" />
              </div>}
          </Panel>
        </PanelGroup>
      </div>

      {/* Study Mode Dialog for desktop */}
      <SheetMusicViewDialog open={studyDialogOpen} onOpenChange={setStudyDialogOpen} item={studyItem} />
    </>;
};