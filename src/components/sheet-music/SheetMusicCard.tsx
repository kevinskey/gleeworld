import { Eye, Download, Music, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";
import { useUserScores } from "@/hooks/useUserScores";

type SheetMusic = Database['public']['Tables']['gw_sheet_music']['Row'];

interface SheetMusicCardProps {
  sheetMusic: SheetMusic;
  viewMode: "grid" | "list";
  onSelect: () => void;
}

export const SheetMusicCard = ({ sheetMusic, viewMode, onSelect }: SheetMusicCardProps) => {
  const { getAverageScore, getBestScore } = useUserScores();

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sheetMusic.pdf_url) {
      const link = document.createElement('a');
      link.href = sheetMusic.pdf_url;
      link.download = `${sheetMusic.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const averageScore = getAverageScore(sheetMusic.id);
  const bestScore = getBestScore(sheetMusic.id);

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (viewMode === "list") {
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onSelect}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <Music className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold text-lg">{sheetMusic.title}</h3>
                  <p className="text-muted-foreground">
                    {sheetMusic.composer && `by ${sheetMusic.composer}`}
                    {sheetMusic.arranger && ` • arr. ${sheetMusic.arranger}`}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Voice Parts */}
              {sheetMusic.voice_parts && sheetMusic.voice_parts.length > 0 && (
                <div className="flex gap-1">
                  {sheetMusic.voice_parts.map((part) => (
                    <Badge key={part} variant="outline" className="text-xs">
                      {part}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Difficulty */}
              {sheetMusic.difficulty_level && (
                <Badge className={getDifficultyColor(sheetMusic.difficulty_level)}>
                  {sheetMusic.difficulty_level}
                </Badge>
              )}

              {/* Scores */}
              {(averageScore > 0 || bestScore > 0) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="h-4 w-4" />
                  <span>
                    Best: {bestScore.toFixed(1)}
                    {averageScore > 0 && ` • Avg: ${averageScore.toFixed(1)}`}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onSelect}>
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                {sheetMusic.pdf_url && (
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onSelect}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg line-clamp-2">{sheetMusic.title}</CardTitle>
        <div className="text-sm text-muted-foreground">
          {sheetMusic.composer && <div>by {sheetMusic.composer}</div>}
          {sheetMusic.arranger && <div>arr. {sheetMusic.arranger}</div>}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Thumbnail or placeholder */}
        <div className="aspect-[3/4] bg-muted rounded-lg mb-4 flex items-center justify-center">
          {sheetMusic.thumbnail_url ? (
            <img 
              src={sheetMusic.thumbnail_url} 
              alt={sheetMusic.title}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <Music className="h-12 w-12 text-muted-foreground" />
          )}
        </div>

        {/* Voice Parts */}
        {sheetMusic.voice_parts && sheetMusic.voice_parts.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {sheetMusic.voice_parts.map((part) => (
              <Badge key={part} variant="outline" className="text-xs">
                {part}
              </Badge>
            ))}
          </div>
        )}

        {/* Difficulty and Scores */}
        <div className="flex items-center justify-between mb-4">
          {sheetMusic.difficulty_level && (
            <Badge className={getDifficultyColor(sheetMusic.difficulty_level)}>
              {sheetMusic.difficulty_level}
            </Badge>
          )}
          
          {(averageScore > 0 || bestScore > 0) && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-3 w-3" />
              <span>{bestScore.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {sheetMusic.tags && sheetMusic.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {sheetMusic.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {sheetMusic.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{sheetMusic.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Musical Details */}
        <div className="text-xs text-muted-foreground space-y-1 mb-4">
          {sheetMusic.key_signature && (
            <div>Key: {sheetMusic.key_signature}</div>
          )}
          {sheetMusic.time_signature && (
            <div>Time: {sheetMusic.time_signature}</div>
          )}
          {sheetMusic.tempo_marking && (
            <div>Tempo: {sheetMusic.tempo_marking}</div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onSelect}>
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          {sheetMusic.pdf_url && (
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};