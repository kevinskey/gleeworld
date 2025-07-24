import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  FileText, 
  User, 
  Calendar, 
  Music2, 
  Clock,
  Languages,
  Star,
  Brain
} from "lucide-react";
import { SheetMusicNotes } from '@/modules/glee-library/notes/SheetMusicNotes';
import { MarkedScores } from '@/modules/glee-library/marked-scores/MarkedScores';
import { PersonalNotes } from '@/modules/glee-library/personal-notes/PersonalNotes';
import { SmartToolsSidebar } from '@/modules/glee-library/smart-tools/SmartToolsSidebar';
import { RehearsalLinks } from '@/modules/glee-library/rehearsal-links/RehearsalLinks';
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
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
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

        <div className={`flex gap-6 ${showSmartTools ? 'max-h-[80vh] overflow-hidden' : ''}`}>
          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="marked">Marked Scores</TabsTrigger>
                <TabsTrigger value="personal">My Notes</TabsTrigger>
                <TabsTrigger value="rehearsals">Rehearsals</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={`${item.title} thumbnail`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="h-24 w-24 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {item.pdf_url && (
                        <Button asChild className="flex-1">
                          <a href={item.pdf_url} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-4 w-4 mr-2" />
                            View PDF
                          </a>
                        </Button>
                      )}
                      {item.pdf_url && (
                        <Button variant="outline" asChild>
                          <a href={item.pdf_url} download>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>

                    {item.audio_preview_url && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Audio Preview</h4>
                        <audio controls className="w-full">
                          <source src={item.audio_preview_url} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold">Details</h3>
                      {item.composer && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm"><strong>Composer:</strong> {item.composer}</span>
                        </div>
                      )}
                      {item.arranger && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm"><strong>Arranger:</strong> {item.arranger}</span>
                        </div>
                      )}
                      {item.language && (
                        <div className="flex items-center gap-2">
                          <Languages className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm"><strong>Language:</strong> {item.language}</span>
                        </div>
                      )}
                    </div>

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
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="notes" className="mt-4">
                <SheetMusicNotes musicId={item.id} />
              </TabsContent>
              
              <TabsContent value="marked" className="mt-4">
                <MarkedScores musicId={item.id} voiceParts={item.voice_parts || []} />
              </TabsContent>
              
              <TabsContent value="personal" className="mt-4">
                <PersonalNotes musicId={item.id} />
              </TabsContent>
              
              <TabsContent value="rehearsals" className="mt-4">
                <RehearsalLinks musicId={item.id} isAdmin={isAdmin} />
              </TabsContent>
            </Tabs>
          </div>

          {showSmartTools && (
            <SmartToolsSidebar sheetMusic={item} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};