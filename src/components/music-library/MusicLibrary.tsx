
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { SheetMusicLibrary } from './SheetMusicLibrary';
import { SetlistBuilder } from './SetlistBuilder';
import { SetlistPlayer } from './SetlistPlayer';
import { PDFViewerWithAnnotations } from '@/components/PDFViewerWithAnnotations';
import { Home, Users, Calendar, FileText, Activity, ArrowLeft, Music, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import { StudyScoresPanel } from './StudyScoresPanel';
import { MyCollectionsPanel } from './MyCollectionsPanel';
import { SheetMusicViewDialog } from './SheetMusicViewDialog';
import { MusicLibraryHeader } from './MusicLibraryHeader';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const MusicLibrary = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPdf, setSelectedPdf] = useState<{url: string; title: string; id?: string} | null>(null);
  
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

  return (
    <>
      <MusicLibraryHeader />
      <div className="container mx-auto px-4 pt-16 md:pt-20 pb-6">
        {/* Two-column layout with fixed height and scrollable columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-5rem)] overflow-hidden">
        {/* Left column */}
        <div className={`${selectedPdf ? 'lg:col-span-4' : 'lg:col-span-5'} space-y-4 h-full overflow-y-auto pr-1`}>
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

          {/* Music Library list (collapsible at bottom) */}
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

        {/* Right column: PDF viewer */}
        <div className={`${selectedPdf ? 'lg:col-span-8' : 'lg:col-span-7'} flex flex-col h-full overflow-hidden pl-1`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">PDF Viewer</h2>
            <Button size="sm" variant="outline" className="gap-2" aria-label="Study Mode" title="Study Mode" onClick={openStudyMode}>
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Study Mode</span>
            </Button>
          </div>
          {selectedPdf ? (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Loading: {selectedPdf.title}</p>
              <PDFViewerWithAnnotations 
                key={selectedPdf.url}
                pdfUrl={selectedPdf.url}
                musicTitle={selectedPdf.title}
                musicId={selectedPdf.id}
                className="w-full"
              />
            </div>
          ) : (
            <div className="flex-1 relative rounded-lg overflow-hidden">
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
    <SheetMusicViewDialog
      open={studyDialogOpen}
      onOpenChange={setStudyDialogOpen}
      item={studyItem}
    />
    </>
  );
};
