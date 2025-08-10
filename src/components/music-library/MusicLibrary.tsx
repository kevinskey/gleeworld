
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { SheetMusicLibrary } from './SheetMusicLibrary';
import { SetlistBuilder } from './SetlistBuilder';
import { SetlistPlayer } from './SetlistPlayer';
import { PDFViewerWithAnnotations } from '@/components/PDFViewerWithAnnotations';
import { MobileMusicLibrary } from './MobileMusicLibrary';
import { MobilePDFViewer } from './MobilePDFViewer';
import { Home, Users, Calendar, FileText, Activity, ArrowLeft, Music, Eye, ChevronDown, ChevronRight, Smartphone, Monitor } from 'lucide-react';
import { StudyScoresPanel } from './StudyScoresPanel';
import { MyCollectionsPanel } from './MyCollectionsPanel';
import { SheetMusicViewDialog } from './SheetMusicViewDialog';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useIsMobile } from '@/hooks/use-mobile';

export const MusicLibrary = ({ embedded = false, heightClass }: { embedded?: boolean; heightClass?: string }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const isMobile = useIsMobile();
  const [selectedPdf, setSelectedPdf] = useState<{url: string; title: string; id?: string} | null>(null);
  const [mobileView, setMobileView] = useState<'library' | 'viewer'>('library');
  
  const [activeSetlistPlayer, setActiveSetlistPlayer] = useState<string | null>(null);
  const [setlistOpen, setSetlistOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [studyDialogOpen, setStudyDialogOpen] = useState(false);
  const [studyItem, setStudyItem] = useState<any>(null);
  const { toast } = useToast();
  const handlePdfSelect = (pdfUrl: string, title: string, id?: string) => {
    setSelectedPdf({ url: pdfUrl, title, id });
    // On mobile, switch to viewer when PDF is selected
    if (isMobile) {
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

  // Mobile layout - show either library or viewer
  if (isMobile) {
    return (
      <>
        <div className="h-screen flex flex-col">
          {/* Mobile Header - only show when in library view */}
          {mobileView === 'library' && (
            <div className="bg-background border-b p-4">
              <PageHeader
                title="Music Library"
                description="Digital & Physical Sheet Music Collection"
                showBackButton
                backTo={(userProfile?.is_admin || userProfile?.is_super_admin) ? '/admin' : '/dashboard'}
                backgroundVariant="gradient"
              />
            </div>
          )}

          {/* Mobile Content */}
          <div className="flex-1 overflow-hidden">
            {mobileView === 'library' ? (
              <MobileMusicLibrary
                onPdfSelect={handlePdfSelect}
                onOpenSetlistPlayer={handleOpenSetlistPlayer}
                selectedPdf={selectedPdf}
              />
            ) : (
              <MobilePDFViewer
                selectedPdf={selectedPdf}
                onBack={() => setMobileView('library')}
                onStudyMode={openStudyMode}
              />
            )}
          </div>
        </div>

        {/* Study Mode Dialog for mobile */}
        <SheetMusicViewDialog
          open={studyDialogOpen}
          onOpenChange={setStudyDialogOpen}
          item={studyItem}
        />
      </>
    );
  }

  // Desktop layout - keep existing design
  return (
    <>
      <div className={`container mx-auto px-4 ${embedded ? 'pt-0 pb-0' : 'pt-16 md:pt-20 pb-4'}`}>
        <div className="mb-2">
          <PageHeader
            title="Music Library"
            description="Digital & Physical Sheet Music Collection"
            showBackButton
            backTo={(userProfile?.is_admin || userProfile?.is_super_admin) ? '/admin' : '/dashboard'}
            backgroundVariant="gradient"
          />
        </div>

        {/* Desktop two-column layout */}
        <div className={`grid grid-cols-12 gap-6 ${embedded ? (heightClass || 'h-[85vh]') : 'h-[calc(100vh-5rem)]'} overflow-hidden`}>
          {/* Left column - Library sections */}
          <div className={`${selectedPdf ? 'col-span-4' : 'col-span-5'} space-y-4 h-full overflow-y-auto pr-1`}>
            {/* Study Scores */}
            <div className="border rounded">
              <div className="flex items-center justify-between p-2">
                <button className="flex items-center gap-2 text-sm font-medium" onClick={() => setStudyOpen((o) => !o)}>
                  {studyOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} Study Scores
                </button>
              </div>
              {studyOpen && (
                <div className="p-2">
                  <StudyScoresPanel 
                    currentSelected={selectedPdf}
                    onOpenScore={handlePdfSelect}
                  />
                </div>
              )}
            </div>

            {/* My Collections */}
            <div className="border rounded">
              <div className="flex items-center justify-between p-2">
                <button className="flex items-center gap-2 text-sm font-medium" onClick={() => setCollectionsOpen((o) => !o)}>
                  {collectionsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} My Collections
                </button>
              </div>
              {collectionsOpen && (
                <div className="p-2">
                  <MyCollectionsPanel
                    currentSelected={selectedPdf}
                    onOpenScore={handlePdfSelect}
                  />
                </div>
              )}
            </div>

            {/* Setlists */}
            <div className="border rounded">
              <div className="flex items-center justify-between p-2">
                <button className="flex items-center gap-2 text-sm font-medium" onClick={() => setSetlistOpen((o) => !o)}>
                  {setlistOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} Setlists
                </button>
              </div>
              {setlistOpen && (
                <div className="p-2">
                  <SetlistBuilder 
                    onPdfSelect={handlePdfSelect} 
                    onOpenPlayer={handleOpenSetlistPlayer}
                  />
                </div>
              )}
            </div>

            {/* Music Library list */}
            <div className="border rounded">
              <div className="flex items-center justify-between p-2">
                <button className="flex items-center gap-2 text-sm font-medium" onClick={() => setLibraryOpen((o) => !o)}>
                  {libraryOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} Music Library
                </button>
              </div>
              {libraryOpen && (
                <div className="p-2">
                  <SheetMusicLibrary 
                    searchQuery=""
                    selectedCategory="all"
                    sortBy="title"
                    sortOrder="asc"
                    viewMode="list"
                    onPdfSelect={(url: string, title: string, id?: string) => handlePdfSelect(url, title, id)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right column - PDF viewer */}
          <div className={`${selectedPdf ? 'col-span-8' : 'col-span-7'} flex flex-col h-full overflow-hidden pl-1`}>
            {selectedPdf ? (
              <div className="flex-1 overflow-hidden min-h-0">
                <PDFViewerWithAnnotations 
                  key={selectedPdf.url}
                  pdfUrl={selectedPdf.url}
                  musicTitle={selectedPdf.title}
                  musicId={selectedPdf.id}
                  variant="plain"
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="flex-1 relative rounded-xl overflow-hidden bg-background shadow-xl ring-1 ring-border">
                <img
                  src="/lovable-uploads/7dee05e5-4f0d-4fa1-9260-b97fd383d709.png"
                  alt="Glee World Music Library landing image"
                  className="absolute inset-0 w-full h-full object-contain"
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
