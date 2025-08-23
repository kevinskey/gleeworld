import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Play, 
  Plus, 
  BookOpen, 
  Music, 
  List, 
  Eye,
  MoreHorizontal 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EnhancedTooltip } from "@/components/ui/enhanced-tooltip";
import { useMusicLibraryIntegration, MusicPieceIntegration } from '@/hooks/useMusicLibraryIntegration';

interface MusicLibraryCardProps {
  piece: any; // Original sheet music data
}

export const MusicLibraryCard: React.FC<MusicLibraryCardProps> = ({ piece }) => {
  const [integratedPiece, setIntegratedPiece] = useState<MusicPieceIntegration | null>(null);
  const [loadingIntegration, setLoadingIntegration] = useState(true);
  
  const {
    loading,
    getIntegratedMusicPiece,
    addPieceToSetlist,
    createStudyScore,
    openStudyScore,
    availableSetlists
  } = useMusicLibraryIntegration();

  useEffect(() => {
    const loadIntegration = async () => {
      setLoadingIntegration(true);
      const integrated = await getIntegratedMusicPiece(piece);
      setIntegratedPiece(integrated);
      setLoadingIntegration(false);
    };

    loadIntegration();
  }, [piece, getIntegratedMusicPiece]);

  const handleAddToSetlist = async (setlistId: string) => {
    await addPieceToSetlist(piece.id, setlistId);
    // Refresh integration data to show updated setlist membership
    const updated = await getIntegratedMusicPiece(piece);
    setIntegratedPiece(updated);
  };

  const handleCreateStudyScore = async () => {
    const success = await createStudyScore(piece);
    if (success) {
      // Refresh integration data to show new study score
      const updated = await getIntegratedMusicPiece(piece);
      setIntegratedPiece(updated);
    }
  };

  const handleOpenStudyScore = (studyScore: any) => {
    openStudyScore(studyScore);
  };

  if (loadingIntegration || !integratedPiece) {
    return (
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg animate-pulse">
        <div className="flex-1">
          <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-muted rounded w-1/2"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-16 bg-muted rounded"></div>
          <div className="h-8 w-16 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Music className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-semibold">{integratedPiece.title}</h4>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              by {integratedPiece.composer || 'Unknown'}
            </p>
            
            {/* Integration Status Badges */}
            <div className="flex items-center gap-2 mb-3">
              
              {integratedPiece.setlists.length > 0 && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <List className="h-3 w-3" />
                  {integratedPiece.setlists.length} setlist{integratedPiece.setlists.length > 1 ? 's' : ''}
                </Badge>
              )}
              
              {integratedPiece.hasStudyScore && (
                <Badge variant="default" className="text-xs flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  Study Score
                </Badge>
              )}
              
              {piece.voice_parts && piece.voice_parts.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {Array.isArray(piece.voice_parts) ? piece.voice_parts.join(', ') : piece.voice_parts}
                </Badge>
              )}
            </div>

            {/* Setlist Membership */}
            {integratedPiece.setlists.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1">In setlists:</p>
                <div className="flex flex-wrap gap-1">
                  {integratedPiece.setlists.slice(0, 2).map((setlist) => (
                    <Badge key={setlist.id} variant="outline" className="text-xs">
                      {setlist.title}
                    </Badge>
                  ))}
                  {integratedPiece.setlists.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{integratedPiece.setlists.length - 2} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {/* Primary Actions */}
            {piece.pdf_url && (
              <EnhancedTooltip content="Download sheet music PDF">
                <Button size="sm" variant="outline" asChild>
                  <a href={piece.pdf_url} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </a>
                </Button>
              </EnhancedTooltip>
            )}
            
            {piece.audio_preview_url && (
              <EnhancedTooltip content="Listen to audio preview">
                <Button size="sm" variant="outline" asChild>
                  <a href={piece.audio_preview_url} target="_blank" rel="noopener noreferrer">
                    <Play className="h-4 w-4 mr-1" />
                    Audio
                  </a>
                </Button>
              </EnhancedTooltip>
            )}

            {/* Study Score Actions */}
            {integratedPiece.hasStudyScore ? (
              <EnhancedTooltip content="View or create study scores">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="default">
                      <BookOpen className="h-4 w-4 mr-1" />
                      Study
                    </Button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Study Scores</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {integratedPiece.studyScores.map((studyScore) => (
                    <DropdownMenuItem 
                      key={studyScore.id}
                      onClick={() => handleOpenStudyScore(studyScore)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {studyScore.title}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleCreateStudyScore} disabled={loading}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Study Score
                  </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
              </EnhancedTooltip>
            ) : (
              <EnhancedTooltip content="Create study score for practice">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCreateStudyScore}
                  disabled={loading || !piece.pdf_url}
                >
                  <BookOpen className="h-4 w-4 mr-1" />
                  Study
                </Button>
              </EnhancedTooltip>
            )}

            {/* More Actions Menu */}
            <EnhancedTooltip content="More actions and setlist options">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Add to Setlist</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableSetlists.length > 0 ? (
                  availableSetlists.map((setlist) => (
                    <DropdownMenuItem 
                      key={setlist.id}
                      onClick={() => handleAddToSetlist(setlist.id)}
                      disabled={loading || integratedPiece.setlists.some(s => s.id === setlist.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {setlist.title}
                      {integratedPiece.setlists.some(s => s.id === setlist.id) && ' ✓'}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>
                    No setlists available
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
              </DropdownMenu>
            </EnhancedTooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};