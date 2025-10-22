import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Calendar, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { PeerReviewForm } from '@/components/mus240/peer-review/PeerReviewForm';
import { PeerReviewList } from '@/components/mus240/peer-review/PeerReviewList';
import { usePeerReviews } from '@/hooks/usePeerReviews';
import { AIGradeViewer } from '@/components/mus240/admin/AIGradeViewer';

interface JournalDetails {
  id: string;
  content: string;
  published_at: string;
  student?: {
    full_name: string;
  };
  assignment?: {
    title: string;
  };
}

export const JournalReviewPage = () => {
  const { journalId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [journal, setJournal] = useState<JournalDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { reviews, submitReview, updateReview, getMyReviewForJournal } = usePeerReviews(journalId);

  useEffect(() => {
    if (journalId) {
      fetchJournal();
    }
  }, [journalId]);

  const fetchJournal = async () => {
    if (!journalId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mus240_journal_entries')
        .select(`
          id,
          content,
          published_at,
          student_id
        `)
        .eq('id', journalId)
        .eq('is_published', true)
        .single();

      if (error) throw error;
      
      // Check if user is trying to review their own journal
      if (data.student_id === user?.id) {
        navigate('/classes/mus240/peer-review');
        return;
      }

      // Fetch student and assignment details separately
      const [studentRes, assignmentRes] = await Promise.all([
        supabase
          .from('gw_profiles')
          .select('full_name')
          .eq('id', data.student_id)
          .single(),
        supabase
          .from('mus240_journal_entries')
          .select('assignment_id')
          .eq('id', journalId)
          .single()
          .then(async (res) => {
            if (res.data?.assignment_id) {
              return supabase
                .from('mus240_assignments')
                .select('title')
                .eq('id', res.data.assignment_id)
                .single();
            }
            return { data: null, error: null };
          })
      ]);

      setJournal({
        ...data,
        student: studentRes.data || undefined,
        assignment: assignmentRes.data || undefined
      });
    } catch (error) {
      console.error('Error fetching journal:', error);
      navigate('/classes/mus240/peer-review');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (feedback: string) => {
    if (!journalId) return false;

    const myReview = getMyReviewForJournal(journalId);
    if (myReview) {
      return await updateReview(myReview.id, feedback);
    } else {
      return await submitReview(journalId, feedback);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!journal) {
    return null;
  }

  const myReview = getMyReviewForJournal(journalId!);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/classes/mus240/peer-review')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Journals
        </Button>

        <div className="space-y-6">
          {/* Journal Content */}
          <Card>
            <CardHeader>
              <div className="space-y-2">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <BookOpen className="h-6 w-6" />
                  {journal.assignment?.title || 'Journal Entry'}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {journal.student?.full_name || 'Anonymous'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(journal.published_at), 'MMMM d, yyyy')}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap">{journal.content}</p>
              </div>
            </CardContent>
          </Card>

          {/* AI Grade (if available) */}
          {journalId && <AIGradeViewer journalId={journalId} />}

          {/* Peer Review Form */}
          <PeerReviewForm 
            onSubmit={handleReviewSubmit}
            existingReview={myReview || undefined}
          />

          {/* Other Peer Reviews */}
          <PeerReviewList reviews={reviews.filter(r => r.reviewer_id !== user?.id)} />
        </div>
      </div>
    </div>
  );
};
