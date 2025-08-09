import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Calendar, 
  Music2, 
  Clock,
  Star,
  Brain,
  List,
  FileCheck
} from "lucide-react";
import { SheetMusicNotes } from '@/modules/glee-library/notes/SheetMusicNotes';
import { MarkedScores } from '@/modules/glee-library/marked-scores/MarkedScores';
import { PersonalNotes } from '@/modules/glee-library/personal-notes/PersonalNotes';
import { SmartToolsSidebar } from '@/modules/glee-library/smart-tools/SmartToolsSidebar';
import { RehearsalLinks } from '@/modules/glee-library/rehearsal-links/RehearsalLinks';
import { PDFViewerWithAnnotations } from '@/components/PDFViewerWithAnnotations';
import { useAuth } from '@/contexts/AuthContext';

interface SheetMusic {
  id: string;
  title: string;
  composer: string | null;
  arranger: string | null;
  key_signature: string | null;
  time_signature: string | null;
  tempo_marking: string | null;
  difficulty_level: string | null;
  voice_parts: string[] | null;
  language: string | null;
  pdf_url: string | null;
  audio_preview_url: string | null;
  thumbnail_url: string | null;
  tags: string[] | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
}

interface SheetMusicViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SheetMusic | null;
}

export const SheetMusicViewDialog = ({
  open,
  onOpenChange,
  item,
}: SheetMusicViewDialogProps) => {
  const { user } = useAuth();
  const [showSmartTools, setShowSmartTools] = useState(false);
  const [setlistInfo, setSetlistInfo] = useState<any>(null);
  const [licenseInfo, setLicenseInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'marked' | 'personal' | 'rehearsals'>('overview');
  
  if (!item) return null;

  const isAdmin = user?.email?.includes('admin') || false;

  const getDifficultyColor = (level: string | null) => {
    switch (level?.toLowerCase()) {
      case "beginner": return "bg-green-100 text-green-800";
      case "intermediate": return "bg-yellow-100 text-yellow-800";
      case "advanced": return "bg-orange-100 text-orange-800";
      case "expert": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {item.title}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSmartTools(!showSmartTools)}
            >
              <Brain className="h-4 w-4 mr-2" />
              {showSmartTools ? 'Hide' : 'Show'} Smart Tools
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 h-[85vh] overflow-hidden">
          <div className={`${showSmartTools ? 'flex-1' : 'w-full'} overflow-y-auto`}>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Left: PDF stays fixed */}
              <div className="xl:col-span-2">
                {item.pdf_url ? (
                  <PDFViewerWithAnnotations 
                    pdfUrl={item.pdf_url} 
                    musicId={item.id}
                    musicTitle={item.title}
                    startInAnnotationMode
                    className="w-full"
                  />
                ) : (
                  <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="h-24 w-24 text-muted-foreground" />
                      <p className="text-muted-foreground mt-2">No PDF available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Tab content panel */}
              <div className="xl:col-span-1 space-y-4">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <TabsList className="grid w-full grid-cols-5 h-10 md:h-12 border-b">
                    <TabsTrigger value="overview" className="text-xs md:text-sm py-2 px-1">Overview</TabsTrigger>
                    <TabsTrigger value="notes" className="text-xs md:text-sm py-2 px-1">Notes</TabsTrigger>
                    <TabsTrigger value="marked" className="text-xs md:text-sm py-2 px-1">Marked</TabsTrigger>
                    <TabsTrigger value="personal" className="text-xs md:text-sm py-2 px-1">My Notes</TabsTrigger>
                    <TabsTrigger value="rehearsals" className="text-xs md:text-sm py-2 px-1">Practice</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="mt-2 space-y-4">
                  {activeTab === 'overview' && (
                    <>
                      {isAdmin && (
                        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                          <h4 className="font-medium text-sm">Performance Tools</h4>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <a href="/performance?tab=setlists" target="_blank">
                                <List className="h-4 w-4 mr-1" />
                                Add to Setlist
                              </a>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <a href="/performance?tab=licensing" target="_blank">
                                <FileCheck className="h-4 w-4 mr-1" />
                                Manage License
                              </a>
                            </Button>
                          </div>
                        </div>
                      )}

                      {item.audio_preview_url && (
                        <div className="space-y-2">
                          <h4 className="font-medium">Audio Preview</h4>
                          <audio controls className="w-full">
                            <source src={item.audio_preview_url} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}

                      {item.voice_parts && item.voice_parts.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold">Voice Parts</h3>
                          <div className="flex flex-wrap gap-2">
                            {item.voice_parts.map((part, index) => (
                              <Badge key={index} variant="outline">{part}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {item.tags && item.tags.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold">Tags</h3>
                          <div className="flex flex-wrap gap-2">
                            {item.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === 'notes' && (
                    <SheetMusicNotes musicId={item.id} />
                  )}

                  {activeTab === 'marked' && (
                    <MarkedScores 
                      musicId={item.id} 
                      musicTitle={item.title}
                      originalPdfUrl={item.pdf_url}
                      voiceParts={item.voice_parts || []} 
                    />
                  )}

                  {activeTab === 'personal' && (
                    <PersonalNotes musicId={item.id} />
                  )}

                  {activeTab === 'rehearsals' && (
                    <RehearsalLinks musicId={item.id} isAdmin={isAdmin} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {showSmartTools && (
            <div className="w-80 flex-shrink-0 overflow-y-auto">
              <SmartToolsSidebar sheetMusic={item} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};