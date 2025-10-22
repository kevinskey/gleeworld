import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PeerReview {
  id: string;
  journal_id: string;
  reviewer_id: string;
  feedback: string;
  created_at: string;
  reviewer?: {
    full_name: string;
    email: string;
  };
}

export const usePeerReviews = (journalId?: string) => {
  const [reviews, setReviews] = useState<PeerReview[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (journalId) {
      fetchReviews();
    }
  }, [journalId]);

  const fetchReviews = async () => {
    if (!journalId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mus240_peer_reviews')
        .select(`
          *,
          reviewer:gw_profiles!reviewer_id(full_name, email)
        `)
        .eq('journal_id', journalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching peer reviews:', error);
      toast.error('Failed to load peer reviews');
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (journalId: string, feedback: string) => {
    if (!user || !feedback.trim()) {
      toast.error('Please provide feedback');
      return false;
    }

    try {
      const { error } = await supabase
        .from('mus240_peer_reviews')
        .insert({
          journal_id: journalId,
          reviewer_id: user.id,
          feedback: feedback.trim()
        });

      if (error) throw error;
      
      toast.success('Peer review submitted!');
      fetchReviews();
      return true;
    } catch (error: any) {
      console.error('Error submitting peer review:', error);
      if (error.code === '23505') {
        toast.error('You have already reviewed this journal');
      } else {
        toast.error('Failed to submit review');
      }
      return false;
    }
  };

  const updateReview = async (reviewId: string, feedback: string) => {
    if (!feedback.trim()) {
      toast.error('Please provide feedback');
      return false;
    }

    try {
      const { error } = await supabase
        .from('mus240_peer_reviews')
        .update({ feedback: feedback.trim() })
        .eq('id', reviewId)
        .eq('reviewer_id', user?.id);

      if (error) throw error;
      
      toast.success('Review updated!');
      fetchReviews();
      return true;
    } catch (error) {
      console.error('Error updating review:', error);
      toast.error('Failed to update review');
      return false;
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from('mus240_peer_reviews')
        .delete()
        .eq('id', reviewId)
        .eq('reviewer_id', user?.id);

      if (error) throw error;
      
      toast.success('Review deleted');
      fetchReviews();
      return true;
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
      return false;
    }
  };

  const getMyReviewForJournal = (journalId: string): PeerReview | null => {
    return reviews.find(r => r.journal_id === journalId && r.reviewer_id === user?.id) || null;
  };

  return {
    reviews,
    loading,
    submitReview,
    updateReview,
    deleteReview,
    getMyReviewForJournal,
    refetch: fetchReviews
  };
};
