import { useState, useCallback, useRef } from 'react';
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
  
  // Use ref to get current study scores without dependency issues
  const studyScoresRef = useRef(studyScores);
  studyScoresRef.current = studyScores;

  const getIntegratedMusicPiece = useCallback(async (piece: any): Promise<MusicPieceIntegration> => {
    try {
      // Get setlists containing this piece
      const setlistsWithPiece = await getSetlistsContainingPiece(piece.id);
      
      // Get study scores for this piece using current ref value
      const currentStudyScores = studyScoresRef.current;
      const relatedStudyScores = currentStudyScores.filter(score => 
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
  }, [getSetlistsContainingPiece]); // Only depend on stable functions

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
      // Use the createFromCurrent function which handles the full study score creation flow
      const studyScore = await createFromCurrent();
      
      if (studyScore) {
        toast({
          title: "Study Score Created",
          description: "Your personal study score has been created and will open for annotation.",
        });
        
        // Open the newly created study score in the in-app viewer with annotation mode
        const pdfViewerEvent = new CustomEvent('openPDFViewer', {
          detail: {
            url: studyScore.pdf_url,
            title: studyScore.title,
            id: studyScore.id,
            enableAnnotations: true
          }
        });
        window.dispatchEvent(pdfViewerEvent);
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error creating study score:', error);
      toast({
        title: "Error",
        description: "Failed to create study score.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast, createFromCurrent]);

  const openStudyScore = useCallback((studyScore: any) => {
    if (studyScore.pdf_url) {
      // Open in the in-app PDF viewer with annotation capabilities
      const pdfViewerEvent = new CustomEvent('openPDFViewer', {
        detail: {
          url: studyScore.pdf_url,
          title: studyScore.title,
          id: studyScore.id,
          enableAnnotations: true
        }
      });
      window.dispatchEvent(pdfViewerEvent);
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