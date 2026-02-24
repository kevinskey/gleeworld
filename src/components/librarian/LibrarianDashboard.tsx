import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Upload,
  Camera,
  FileSpreadsheet,
  Package,
  FileText,
  ArrowLeft,
  Scissors,
  BarChart3,
  Clock,
  AlertCircle,
  ChevronLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { PDFImportManager } from './PDFImportManager';
import { PhysicalInventoryManager } from './PhysicalInventoryManager';
import { LibrarianStats } from './LibrarianStats';
import { CSVImportExport } from './CSVImportExport';
import { DocumentScanner } from './DocumentScanner';
import { MusicLibraryManager } from './MusicLibraryManager';
import { BulkPDFCroppingTool } from '@/components/glee-library/BulkPDFCroppingTool';
import { SinglePDFCropTool } from './SinglePDFCropTool';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ModuleKey = 'home' | 'library' | 'pdf-import' | 'ai-tools' | 'inventory' | 'csv';

interface ModuleConfig {
  key: ModuleKey;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const modules: ModuleConfig[] = [
  { key: 'library', label: 'Music Library', icon: BookOpen, description: 'Browse & manage scores', color: 'bg-primary/10 text-primary' },
  { key: 'pdf-import', label: 'PDF Import', icon: Upload, description: 'Upload sheet music PDFs', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { key: 'ai-tools', label: 'AI Tools', icon: Scissors, description: 'Crop & process PDFs', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  { key: 'inventory', label: 'Inventory', icon: Package, description: 'Physical copy tracking', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { key: 'csv', label: 'CSV Tools', icon: FileSpreadsheet, description: 'Import & export data', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
];

export const LibrarianDashboard = () => {
  const [activeModule, setActiveModule] = useState<ModuleKey>('home');
  const [showScanner, setShowScanner] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  console.log('🔍 LibrarianDashboard component rendering');

  const goHome = () => setActiveModule('home');

  // Render the active module content
  const renderModuleContent = () => {
    switch (activeModule) {
      case 'library':
        return <MusicLibraryManager />;
      case 'pdf-import':
        return <PDFImportManager />;
      case 'ai-tools':
        return (
          <div className="space-y-6">
            <SinglePDFCropTool />
            <BulkPDFCroppingTool />
          </div>
        );
      case 'inventory':
        return <PhysicalInventoryManager />;
      case 'csv':
        return <CSVImportExport />;
      default:
        return null;
    }
  };

  // Sub-module view with back button
  if (activeModule !== 'home') {
    const currentModule = modules.find(m => m.key === activeModule);
    const Icon = currentModule?.icon || BookOpen;

    return (
      <div className={cn("min-h-[100dvh] bg-background", isMobile ? "pb-24" : "")}>
        {/* Sticky header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3 max-w-5xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={goHome}
              className="h-9 w-9 p-0 shrink-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <Icon className="h-5 w-5 shrink-0 text-primary" />
              <h1 className="text-base font-semibold truncate">{currentModule?.label}</h1>
            </div>
          </div>
        </div>

        {/* Module content */}
        <div className={cn("max-w-5xl mx-auto", isMobile ? "px-2 py-3" : "px-4 py-6")}>
          {renderModuleContent()}
        </div>
      </div>
    );
  }

  // HOME VIEW — mobile-first card grid
  return (
    <div className={cn("min-h-[100dvh] bg-background", isMobile ? "pb-24" : "")}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="h-9 w-9 p-0 shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">Music Librarian</h1>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowScanner(true)}
            className="h-9 gap-1.5"
          >
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Scan</span>
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-5">
        {/* Stats Bar */}
        <LibrarianStats />

        {/* Module Grid — 2 cols on mobile, 3 on md+ */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Tools</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {modules.map(({ key, label, icon: ModIcon, description, color }) => (
              <button
                key={key}
                onClick={() => setActiveModule(key)}
                className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all active:scale-[0.97] hover:shadow-md hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className={cn("rounded-lg p-2.5", color)}>
                  <ModIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm leading-tight">{label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Overview Cards */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">At a Glance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Quick Actions */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">Quick Actions</span>
                </div>
                <Button size="sm" className="w-full h-10 text-sm" onClick={() => setShowScanner(true)}>
                  <Camera className="h-4 w-4 mr-2" />
                  Scan New Score
                </Button>
                <Button size="sm" variant="outline" className="w-full h-10 text-sm" onClick={() => setActiveModule('inventory')}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Update Inventory
                </Button>
                <Button size="sm" variant="outline" className="w-full h-10 text-sm" onClick={() => setActiveModule('csv')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">Recent Activity</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>5 PDFs uploaded</span>
                    <Badge variant="secondary" className="text-xs">Today</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Inventory updated</span>
                    <Badge variant="secondary" className="text-xs">Yesterday</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>CSV exported</span>
                    <Badge variant="secondary" className="text-xs">2 days ago</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inventory Alerts */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="font-semibold text-sm">Alerts</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Low stock items</span>
                    <Badge variant="destructive" className="text-xs">3</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Missing location</span>
                    <Badge variant="outline" className="text-xs">12</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Needs inventory check</span>
                    <Badge variant="outline" className="text-xs">8</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Document Scanner Modal */}
      {showScanner && (
        <DocumentScanner
          onClose={() => setShowScanner(false)}
          onComplete={(pdfUrl, metadata) => {
            setShowScanner(false);
            toast({
              title: 'Document Scanned Successfully',
              description: `"${metadata.title}" has been scanned and saved to the music library.`,
            });
            setActiveModule('pdf-import');
          }}
        />
      )}
    </div>
  );
};
