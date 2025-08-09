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
import { PDFViewerWithAnnotations } from '@/components/PDFViewerWithAnnotations';
import { useAuth } from '@/contexts/AuthContext';
import { SheetMusicHistory } from '@/components/music-library/SheetMusicHistory';
import { PracticeLinks } from '@/modules/glee-library/practice/PracticeLinks';

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
  
  const [setlistInfo, setSetlistInfo] = useState<any>(null);
  const [licenseInfo, setLicenseInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'marked' | 'practice' | 'smart'>('overview');
  
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
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 h-[85vh] overflow-hidden">
          <div className="w-full overflow-y-auto">
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
                    <TabsTrigger value="practice" className="text-xs md:text-sm py-2 px-1">Practice</TabsTrigger>
                    <TabsTrigger value="smart" className="text-xs md:text-sm py-2 px-1">Smart Tools</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="mt-2 space-y-4">
                  {activeTab === 'overview' && (
                    <SheetMusicHistory musicId={item.id} />
                  )}


                  {activeTab === 'notes' && (
                    <div className="space-y-2">
                      <Tabs defaultValue="shared" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="shared">Shared</TabsTrigger>
                          <TabsTrigger value="personal">Personal</TabsTrigger>
                        </TabsList>
                        <TabsContent value="shared">
                          <SheetMusicNotes musicId={item.id} />
                        </TabsContent>
                        <TabsContent value="personal">
                          <PersonalNotes musicId={item.id} />
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}

                  {activeTab === 'marked' && (
                    <MarkedScores 
                      musicId={item.id} 
                      musicTitle={item.title}
                      originalPdfUrl={item.pdf_url}
                      voiceParts={item.voice_parts || []} 
                    />
                  )}

                  {activeTab === 'practice' && (
                    <PracticeLinks musicId={item.id} voiceParts={item.voice_parts || []} />
                  )}

                  {activeTab === 'smart' && (
                    <SmartToolsSidebar sheetMusic={item} />
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};