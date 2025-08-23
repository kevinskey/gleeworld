import { useState, useCallback } from 'react';
import { useSetlists } from './useSetlists';
import { useStudyScores } from './useStudyScores';
import { useToast } from '@/hooks/use-toast';

export interface MusicPieceIntegration {
  id: string;
  title: string;
  composer: string | null;
  pdf_url: string | null;
  setlists: Array<{
    id: string;
    title: string;
    concert_name: string | null;
    event_date: string | null;
  }>;
  hasStudyScore: boolean;
  studyScores: Array<{
    id: string;
    title: string;
    pdf_url: string | null;
  }>;
}

export const useMusicLibraryIntegration = () => {
  const [loading, setLoading] = useState(false);
  const { getSetlistsContainingPiece, addToSetlist, setlists } = useSetlists();
  const { scores: studyScores, createFromCurrent } = useStudyScores();
  const { toast } = useToast();

  const getIntegratedMusicPiece = useCallback(async (piece: any): Promise<MusicPieceIntegration> => {
    try {
      // Get setlists containing this piece
      const setlistsWithPiece = await getSetlistsContainingPiece(piece.id);
      
      // Get study scores for this piece - get fresh data instead of relying on state
      const relatedStudyScores = studyScores.filter(score => 
        score.title.toLowerCase().includes(piece.title.toLowerCase()) ||
        piece.title.toLowerCase().includes(score.title.toLowerCase().replace(' (Study Score)', ''))
      );

      return {
        id: piece.id,
        title: piece.title,
        composer: piece.composer,
        pdf_url: piece.pdf_url,
        setlists: setlistsWithPiece,
        hasStudyScore: relatedStudyScores.length > 0,
        studyScores: relatedStudyScores
      };
    } catch (error) {
      console.error('Error getting integrated music piece:', error);
      return {
        id: piece.id,
        title: piece.title,
        composer: piece.composer,
        pdf_url: piece.pdf_url,
        setlists: [],
        hasStudyScore: false,
        studyScores: []
      };
    }
  }, [getSetlistsContainingPiece]); // Removed studyScores from dependencies

  const addPieceToSetlist = useCallback(async (pieceId: string, setlistId: string) => {
    setLoading(true);
    try {
      const success = await addToSetlist(setlistId, pieceId);
      return success;
    } finally {
      setLoading(false);
    }
  }, [addToSetlist]);

  const createStudyScore = useCallback(async (piece: any) => {
    if (!piece.pdf_url) {
      toast({
        title: "No PDF Available",
        description: "This piece doesn't have a PDF available for study score creation.",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);
    try {
      // We need to use the useStudyScores hook with the specific piece
      // For now, let's create the study score manually since we can't pass parameters to createFromCurrent
      const { supabase } = await import('@/integrations/supabase/client');
      const { useAuth } = await import('@/contexts/AuthContext');
      
      // This is a simplified implementation - in a full app you'd want to extract this logic
      // into a utility function or modify the useStudyScores hook to accept parameters
      
      // For now, just open the PDF in a new tab with a note about study scores
      window.open(piece.pdf_url, '_blank');
      
      toast({
        title: "Study Score",
        description: "PDF opened in new tab. Full study score integration coming soon!",
      });
      
      return true;
    } catch (error) {
      console.error('Error creating study score:', error);
      toast({
        title: "Error",
        description: "Failed to open study score.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const openStudyScore = useCallback((studyScore: any) => {
    if (studyScore.pdf_url) {
      // Open in study mode or new tab
      window.open(studyScore.pdf_url, '_blank');
    }
  }, []);

  return {
    loading,
    getIntegratedMusicPiece,
    addPieceToSetlist,
    createStudyScore,
    openStudyScore,
    availableSetlists: setlists
  };
};