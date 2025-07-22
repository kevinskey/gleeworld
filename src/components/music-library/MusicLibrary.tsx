
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { SheetMusicLibrary } from './SheetMusicLibrary';
import { SetlistBuilder } from './SetlistBuilder';
import { SetlistDiagnostics } from './SetlistDiagnostics';
import { PDFViewer } from '@/components/PDFViewer';
import { Settings, Home, Users, Calendar, FileText, Activity, ArrowLeft } from 'lucide-react';

export const MusicLibrary = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPdf, setSelectedPdf] = useState<{url: string; title: string} | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const handlePdfSelect = (pdfUrl: string, title: string) => {
    setSelectedPdf({ url: pdfUrl, title });
  };

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

    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
          <h1 className="text-2xl font-bold mb-2">Music Library</h1>
          <p className="text-muted-foreground">
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
        <div className="mb-6">
          <SetlistDiagnostics />
        </div>
      )}

      <div className="flex flex-col xl:grid xl:grid-cols-10 gap-6">
        {/* Setlists Column - 30% on desktop, full width on mobile */}
        <div className="xl:col-span-4 space-y-4">
          <h2 className="text-lg font-semibold">Setlist Builder</h2>
          <SetlistBuilder onPdfSelect={handlePdfSelect} />
        </div>

        {/* PDF Viewer Column - 70% on desktop, full width on mobile */}
        <div className="xl:col-span-6 space-y-4">
          <h2 className="text-lg font-semibold">PDF Viewer</h2>
          {selectedPdf ? (
            <div className="sticky top-6">
              <PDFViewer 
                pdfUrl={selectedPdf.url}
                className="min-h-[500px] md:min-h-[600px]"
              />
            </div>
          ) : (
            <div className="sticky top-6 p-8 border-2 border-dashed border-muted rounded-lg text-center text-muted-foreground">
              <p className="text-sm">Select sheet music to view PDF</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};
