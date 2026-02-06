import { useState, useRef, useEffect } from 'react';
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
  FileCheck,
  Scissors
} from "lucide-react";
import { SheetMusicNotes } from '@/modules/glee-library/notes/SheetMusicNotes';
import { MarkedScores } from '@/modules/glee-library/marked-scores/MarkedScores';
import { PersonalNotes } from '@/modules/glee-library/personal-notes/PersonalNotes';
import { SmartToolsSidebar } from '@/modules/glee-library/smart-tools/SmartToolsSidebar';
import { PDFViewerWithAnnotations } from '@/components/PDFViewerWithAnnotations';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { SheetMusicHistory } from '@/components/music-library/SheetMusicHistory';
import { PracticeLinks } from '@/modules/glee-library/practice/PracticeLinks';
import { useAudioCompanion } from '@/contexts/AudioCompanionContext';
import { PDFCropEditor } from '@/components/glee-library/PDFCropEditor';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const { isAdmin, profile } = useUserRole();
  const { stop, closeYouTube } = useAudioCompanion();
  
  const [setlistInfo, setSetlistInfo] = useState<any>(null);
  const [licenseInfo, setLicenseInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'marked' | 'practice' | 'smart'>('overview');
  const [showCropEditor, setShowCropEditor] = useState(false);
  const pdfRef = useRef<any>(null);

  // Stop YouTube playback when dialog closes
  useEffect(() => {
    if (!open) {
      stop();
      closeYouTube();
    }
  }, [open, stop, closeYouTube]);
  
  if (!item) return null;

  // Allow admins, super-admins, and librarians to crop PDFs
  const canCropPDF =
    isAdmin() ||
    profile?.exec_board_role?.toLowerCase() === 'librarian' ||
    profile?.role?.toLowerCase() === 'librarian';

  const handleSaveCroppedPDF = async (blob: Blob) => {
    if (!item || !user) return;
    
    try {
      // Upload the cropped PDF to storage
      const fileName = `${item.id}_cropped_${Date.now()}.pdf`;
      const filePath = `sheet-music/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('glee-library')
        .upload(filePath, blob, {
          contentType: 'application/pdf',
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('glee-library')
        .getPublicUrl(filePath);
      
      // Update the sheet music record with new PDF URL
      const { error: updateError } = await supabase
        .from('gw_sheet_music')
        .update({ 
          pdf_url: urlData.publicUrl,
          crop_recommendations: {
            applied: true,
            appliedAt: new Date().toISOString(),
            appliedBy: user.id
          }
        })
        .eq('id', item.id);
      
      if (updateError) throw updateError;
      
      toast.success('Cropped PDF saved successfully!');
      setShowCropEditor(false);
      
      // Refresh the page to show the new PDF
      window.location.reload();
    } catch (error) {
      console.error('Error saving cropped PDF:', error);
      toast.error('Failed to save cropped PDF');
    }
  };

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
      <DialogContent 
        className="!fixed !inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 !p-0 !w-screen !h-screen !max-w-none !max-h-none overflow-hidden !rounded-none !border-0 !z-[9990]" 
        style={{ 
          top: 'calc(var(--gw-header-h, 0px) + var(--gw-radio-bar-height, 0px))', 
          height: 'calc(100vh - var(--gw-header-h, 0px) - var(--gw-radio-bar-height, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        <DialogHeader className="hidden" />
        <div 
          className="absolute right-3 z-50 flex gap-2"
          style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
        >
          {item.pdf_url && canCropPDF && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCropEditor(true)}
            >
              <Scissors className="h-4 w-4 mr-1" />
              Crop
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>

        <div className="flex gap-0 h-full overflow-hidden">
          <div className="w-full overflow-y-auto">
            <div className="grid grid-cols-1 h-full">
              {/* Left: PDF stays fixed */}
              <div className="col-span-1 h-full">
                {item.pdf_url ? (
                  <PDFViewerWithAnnotations 
                    pdfUrl={item.pdf_url} 
                    musicId={item.id}
                    musicTitle={item.title}
                    startInAnnotationMode
                    className="w-full h-full rounded-none border-0"
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
              <div className="hidden">
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

        {/* Crop Editor Dialog */}
        {showCropEditor && item.pdf_url && (
          <Dialog open={showCropEditor} onOpenChange={setShowCropEditor}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crop & Straighten PDF</DialogTitle>
              </DialogHeader>
              <PDFCropEditor
                pdfUrl={item.pdf_url}
                title={item.title}
                onSave={handleSaveCroppedPDF}
                onClose={() => setShowCropEditor(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};