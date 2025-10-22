import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, User, Calendar, MessageSquare, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface JournalEntry {
  id: string;
  content: string;
  is_published: boolean;
  published_at: string;
  assignment_id: string;
  student_id: string;
  student?: {
    full_name: string;
  };
  assignment?: {
    title: string;
  };
  review_count?: number;
  has_reviewed?: boolean;
}

export const JournalBrowserForReview: React.FC = () => {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchJournals();
  }, [user]);

  const fetchJournals = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch published journals (not by current user)
      const { data: journalData, error: journalError } = await supabase
        .from('mus240_journal_entries')
        .select(`
          *,
          student:gw_profiles!student_id(full_name),
          assignment:mus240_assignments!assignment_id(title)
        `)
        .eq('is_published', true)
        .neq('student_id', user.id)
        .order('published_at', { ascending: false });

      if (journalError) throw journalError;

      // Fetch peer review counts for each journal
      const { data: reviewCounts, error: countError } = await supabase
        .from('mus240_peer_reviews')
        .select('journal_id');

      if (countError) throw countError;

      // Fetch user's reviews
      const { data: myReviews, error: myReviewError } = await supabase
        .from('mus240_peer_reviews')
        .select('journal_id')
        .eq('reviewer_id', user.id);

      if (myReviewError) throw myReviewError;

      // Process data
      const reviewedJournalIds = new Set(myReviews?.map(r => r.journal_id) || []);
      const countByJournal = (reviewCounts || []).reduce((acc, r) => {
        acc[r.journal_id] = (acc[r.journal_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const enrichedJournals = (journalData || []).map(journal => ({
        ...journal,
        review_count: countByJournal[journal.id] || 0,
        has_reviewed: reviewedJournalIds.has(journal.id)
      }));

      setJournals(enrichedJournals);
    } catch (error) {
      console.error('Error fetching journals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8">Loading journals...</div>;
  }

  if (journals.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No journals available for review yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Journals to Review</h2>
        <Badge variant="outline">{journals.length} available</Badge>
      </div>

      <div className="grid gap-4">
        {journals.map((journal) => (
          <Card key={journal.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{journal.assignment?.title || 'Untitled'}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {journal.student?.full_name || 'Anonymous'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(journal.published_at), 'MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {journal.review_count} {journal.review_count === 1 ? 'review' : 'reviews'}
                    </span>
                  </div>
                </div>
                {journal.has_reviewed && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Reviewed
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                {journal.content.substring(0, 200)}...
              </p>
              <Button 
                onClick={() => navigate(`/classes/mus240/journal/${journal.id}/review`)}
                variant={journal.has_reviewed ? "outline" : "default"}
              >
                {journal.has_reviewed ? 'View & Edit Review' : 'Write Review'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
