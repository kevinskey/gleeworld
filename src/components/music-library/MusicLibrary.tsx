
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { SheetMusicLibrary } from './SheetMusicLibrary';
import { SetlistBuilder } from './SetlistBuilder';
import { SetlistDiagnostics } from './SetlistDiagnostics';
import { SetlistPlayer } from './SetlistPlayer';
import { PDFViewerWithAnnotations } from '@/components/PDFViewerWithAnnotations';
import { Settings, Home, Users, Calendar, FileText, Activity, ArrowLeft, Music } from 'lucide-react';

export const MusicLibrary = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPdf, setSelectedPdf] = useState<{url: string; title: string} | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [activeSetlistPlayer, setActiveSetlistPlayer] = useState<string | null>(null);

  const handlePdfSelect = (pdfUrl: string, title: string) => {
    console.log('MusicLibrary: handlePdfSelect called with URL:', pdfUrl, 'Title:', title);
    console.log('MusicLibrary: Setting selectedPdf to:', { url: pdfUrl, title });
    setSelectedPdf({ url: pdfUrl, title });
  };

  const handleOpenSetlistPlayer = (setlistId: string) => {
    setActiveSetlistPlayer(setlistId);
  };

  const handleCloseSetlistPlayer = () => {
    setActiveSetlistPlayer(null);
  };

  // If setlist player is active, show only the player
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
      {/* Site Header Navigation */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-primary">GleeWorld</h1>
              
              <nav className="hidden md:flex space-x-6">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.route || 
                    (item.route === '/dashboard' && location.pathname === '/');
                  
                  return (
                    <Button
                      key={item.id}
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      onClick={() => navigate(item.route)}
                      className="flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  );
                })}
                <Button
                  variant={location.pathname === '/music-library' ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Music Library
                </Button>
              </nav>
            </div>
          </div>
        </div>
      </header>

    <div className="container mx-auto px-4 py-4">
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Menu
            </Button>
          </div>
          <h1 className="text-2xl font-bold mb-1">Music Library</h1>
          <p className="text-muted-foreground text-sm">
            Manage your sheet music collection and create performance setlists
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          {showDiagnostics ? 'Hide' : 'Show'} Diagnostics
        </Button>
      </div>

      {showDiagnostics && (
        <div className="mb-4">
          <SetlistDiagnostics />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">
        {/* Setlists Column - Smaller when PDF is active */}
        <div className={`xl:col-span-${selectedPdf ? '3' : '5'} space-y-4`}>
          <h2 className="text-lg font-semibold">Setlist Builder</h2>
          <SetlistBuilder 
            onPdfSelect={handlePdfSelect} 
            onOpenPlayer={handleOpenSetlistPlayer}
          />
        </div>

        {/* PDF Viewer Column - Takes most space when active */}
        <div className={`xl:col-span-${selectedPdf ? '7' : '5'} space-y-4`}>
          <h2 className="text-lg font-semibold">PDF Viewer</h2>
          {selectedPdf ? (
            <PDFViewerWithAnnotations 
              pdfUrl={selectedPdf.url}
              musicTitle={selectedPdf.title}
              className="w-full"
            />
          ) : (
            <div className="p-8 border-2 border-dashed border-muted rounded-lg text-center text-muted-foreground">
              <div>
                <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">Select sheet music to view PDF</p>
                <p className="text-sm">Choose a song from the setlist builder to display the score</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};
