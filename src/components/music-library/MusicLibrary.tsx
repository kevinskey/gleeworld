
import React, { useState, useRef, useEffect } from 'react';
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

export const MusicLibrary = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const isMobile = useIsMobile();
  const [selectedPdf, setSelectedPdf] = useState<{url: string; title: string; id?: string} | null>(null);
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
    if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [activeSetlistPlayer, setActiveSetlistPlayer] = useState<string | null>(null);
  const [setlistOpen, setSetlistOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [studyDialogOpen, setStudyDialogOpen] = useState(false);
  const [studyItem, setStudyItem] = useState<any>(null);
  const { toast } = useToast();
  const handlePdfSelect = (pdfUrl: string, title: string, id?: string) => {
    console.log('MusicLibrary: PDF selected:', { pdfUrl, title, id, isMobile });
    setSelectedPdf({ url: pdfUrl, title, id });
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
      toast({ title: 'Select a piece', description: 'Choose a score to open Study Mode' });
      return;
    }
    let item: any = null;
    if (selectedPdf.id) {
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('*')
        .eq('id', selectedPdf.id)
        .maybeSingle();
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
        created_at: new Date().toISOString(),
      };
    }
    setStudyItem(item);
    setStudyDialogOpen(true);
  };

  if (activeSetlistPlayer) {
    return (
      <SetlistPlayer
        setlistId={activeSetlistPlayer}
        onClose={handleCloseSetlistPlayer}
      />
    );
  }

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, route: '/dashboard' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, route: '/calendar' },
    { id: 'events', label: 'Events', icon: Users, route: '/event-planner' },
    { id: 'accounting', label: 'Accounting', icon: FileText, route: '/accounting' },
    { id: 'activity', label: 'Activity', icon: Activity, route: '/activity-logs' },
  ];

  // Mobile layout - simple fullscreen
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background w-full max-w-full overflow-hidden">
        {/* Simple Header with Back Button */}
        <div className="flex items-center justify-between p-3 border-b w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate((userProfile?.is_admin || userProfile?.is_super_admin) ? '/admin' : '/dashboard')}
            className="flex items-center gap-1 flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </Button>
          <h1 className="text-base font-semibold truncate mx-2">Music Library</h1>
          <div className="w-16 flex-shrink-0"></div> {/* Spacer for centering */}
        </div>

        {/* Content */}
        <div className="flex-1">
          {mobileView === 'library' ? (
            <MobileMusicLibrary
              onPdfSelect={handlePdfSelect}
              onOpenSetlistPlayer={handleOpenSetlistPlayer}
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

        {/* Study Mode Dialog */}
        <SheetMusicViewDialog
          open={studyDialogOpen}
          onOpenChange={setStudyDialogOpen}
          item={studyItem}
        />
      </div>
    );
  }

  // Desktop layout - keep existing design
  return (
    <>
      <MusicLibraryHeader />
      <div className="w-full overflow-hidden page-container">

        {/* Desktop responsive layout - 40/60 split when PDF is open */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 card-spacing min-h-[calc(100vh-8rem)] lg:h-[calc(100vh-5rem)]">
          {/* Left column - Library sections */}
          <div className={`${selectedPdf ? 'lg:col-span-3' : 'lg:col-span-5'} section-spacing lg:h-full lg:overflow-y-auto lg:pr-1 order-2 lg:order-1 w-full overflow-hidden`}>
            {/* Study Scores */}
            <div className="w-full overflow-hidden border rounded">
              <div className="flex items-center justify-between card-compact">
                <button 
                  className="flex items-center gap-1 md:gap-2 mobile-text-lg font-medium touch-target" 
                  onClick={() => {
                    console.log('Study Scores button clicked, current state:', studyOpen);
                    setStudyOpen((o) => !o);
                  }}
                >
                  {studyOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} Study Scores
                </button>
              </div>
              {studyOpen && (
                <div className="card-compact">
                  <StudyScoresPanel 
                    currentSelected={selectedPdf}
                    onOpenScore={handlePdfSelect}
                  />
                </div>
              )}
            </div>

            {/* My Collections */}
            <div className="w-full overflow-hidden border rounded">
              <div className="flex items-center justify-between card-compact">
                <button className="flex items-center gap-1 md:gap-2 mobile-text-lg font-medium touch-target" onClick={() => setCollectionsOpen((o) => !o)}>
                  {collectionsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} My Collections
                </button>
              </div>
              {collectionsOpen && (
                <div className="card-compact">
                  <MyCollectionsPanel
                    currentSelected={selectedPdf}
                    onOpenScore={handlePdfSelect}
                  />
                </div>
              )}
            </div>

            {/* Setlists */}
            <div className="w-full overflow-hidden border rounded">
              <div className="flex items-center justify-between card-compact">
                <button className="flex items-center gap-1 md:gap-2 mobile-text-lg font-medium touch-target" onClick={() => setSetlistOpen((o) => !o)}>
                  {setlistOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} Setlists
                </button>
              </div>
              {setlistOpen && (
                <div className="card-compact">
                  <SetlistBuilder 
                    onPdfSelect={handlePdfSelect} 
                    onOpenPlayer={handleOpenSetlistPlayer}
                  />
                </div>
              )}
            </div>

            {/* Music Library list */}
            <div className="w-full overflow-hidden border rounded">
              <div className="flex items-center justify-between card-compact">
                <button className="flex items-center gap-1 md:gap-2 mobile-text-lg font-medium touch-target" onClick={() => setLibraryOpen((o) => !o)}>
                  {libraryOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} Music Library
                </button>
              </div>
              {libraryOpen && (
                <div className="section-spacing">
                  {/* Search field for Music Library */}
                  <div className="card-compact">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search music library..."
                        value={librarySearchQuery}
                        onChange={(e) => setLibrarySearchQuery(e.target.value)}
                        className="pl-10 h-8 mobile-text-lg"
                      />
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
                      onPdfSelect={(url: string, title: string, id?: string) => handlePdfSelect(url, title, id)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right column - PDF viewer */}
          <div className={`${selectedPdf ? 'lg:col-span-9' : 'lg:col-span-7'} flex flex-col min-h-[60vh] lg:h-full overflow-hidden lg:pl-1 order-1 lg:order-2 w-full`}>
            <div className="flex items-center justify-between mb-1 md:mb-4 px-1 lg:px-0">
              <h2 className="page-header">PDF Viewer</h2>
              <Button size="sm" variant="outline" className="gap-1 md:gap-2 touch-target px-2 lg:px-3" aria-label="Study Mode" title="Study Mode" onClick={openStudyMode}>
                <Eye className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline mobile-text-lg">Study Mode</span>
                <span className="sm:hidden text-xs">Study</span>
              </Button>
            </div>
            {selectedPdf ? (
              <div className="flex-1 overflow-hidden rounded-lg lg:rounded-xl">
                <PDFViewerWithAnnotations 
                  key={selectedPdf.url}
                  pdfUrl={selectedPdf.url}
                  musicTitle={selectedPdf.title}
                  musicId={selectedPdf.id}
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="flex-1 relative rounded-lg lg:rounded-xl overflow-hidden bg-background shadow-lg lg:shadow-xl ring-1 ring-border mx-1 lg:mx-0">
                <img
                  src="/lovable-uploads/7dee05e5-4f0d-4fa1-9260-b97fd383d709.png"
                  alt="Glee World Music Library landing image"
                  className="absolute inset-0 w-full h-full object-contain p-2 md:p-4 lg:p-6"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Study Mode Dialog for desktop */}
      <SheetMusicViewDialog
        open={studyDialogOpen}
        onOpenChange={setStudyDialogOpen}
        item={studyItem}
      />
    </>
  );
};
