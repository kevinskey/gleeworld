import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  FileText, 
  User, 
  Calendar, 
  Music2, 
  Clock,
  Languages,
  Star
} from "lucide-react";

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
  if (!item) return null;

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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {item.title}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PDF Preview/Thumbnail */}
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
            
            {/* Action Buttons */}
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

            {/* Audio Preview */}
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

          {/* Details */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Details</h3>
              
              {item.composer && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Composer:</strong> {item.composer}
                  </span>
                </div>
              )}
              
              {item.arranger && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Arranger:</strong> {item.arranger}
                  </span>
                </div>
              )}
              
              {item.language && (
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Language:</strong> {item.language}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>Added:</strong> {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Musical Details */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Musical Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {item.key_signature && (
                  <div>
                    <strong className="text-sm">Key Signature:</strong>
                    <p className="text-sm text-muted-foreground">{item.key_signature}</p>
                  </div>
                )}
                
                {item.time_signature && (
                  <div>
                    <strong className="text-sm">Time Signature:</strong>
                    <p className="text-sm text-muted-foreground">{item.time_signature}</p>
                  </div>
                )}
                
                {item.tempo_marking && (
                  <div className="col-span-2">
                    <strong className="text-sm">Tempo Marking:</strong>
                    <p className="text-sm text-muted-foreground">{item.tempo_marking}</p>
                  </div>
                )}
              </div>
              
              {item.difficulty_level && (
                <div>
                  <strong className="text-sm">Difficulty Level:</strong>
                  <div className="mt-1">
                    <Badge className={getDifficultyColor(item.difficulty_level)}>
                      {item.difficulty_level}
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            {/* Voice Parts */}
            {item.voice_parts && item.voice_parts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Voice Parts</h3>
                <div className="flex flex-wrap gap-2">
                  {item.voice_parts.map((part, index) => (
                    <Badge key={index} variant="outline">
                      {part}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};