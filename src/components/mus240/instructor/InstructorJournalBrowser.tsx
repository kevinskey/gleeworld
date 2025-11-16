import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  published_at?: string | null;
  assignment_id: string;
  student_id: string;
  created_at?: string;
  updated_at?: string;
  submitted_at?: string | null;
  student_name?: string;
  assignment_title?: string;
  review_count?: number;
}

export const InstructorJournalBrowser: React.FC = () => {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchJournals();
  }, [filter]);

  const fetchJournals = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('mus240_journal_entries')
        .select('*')
        .order('updated_at', { ascending: false });

      if (filter === 'published') {
        query = query.eq('is_published', true);
      } else if (filter === 'unpublished') {
        query = query.eq('is_published', false);
      }

      const { data: journalData, error: journalError } = await query;

      if (journalError) throw journalError;

      // Fetch student names
      const studentIds = [...new Set(journalData?.map(j => j.student_id) || [])];
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name')
        .in('user_id', studentIds);

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.user_id] = p.full_name;
        return acc;
      }, {} as Record<string, string>);

      // Fetch actual assignment titles from database
      const { data: assignments } = await supabase
        .from('gw_assignments')
        .select('id, title, legacy_id')
        .eq('legacy_source', 'mus240_assignments');

      const assignmentCodeMap: Record<string, string> = {};
      (assignments || []).forEach(assignment => {
        if (assignment.legacy_id) {
          assignmentCodeMap[assignment.legacy_id] = assignment.title;
        }
      });

      // Fetch peer review counts
      const { data: reviewCounts } = await supabase
        .from('mus240_peer_reviews')
        .select('journal_id');

      const countByJournal = (reviewCounts || []).reduce((acc, r) => {
        acc[r.journal_id] = (acc[r.journal_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const enrichedJournals: JournalEntry[] = (journalData || []).map(journal => ({
        ...journal,
        student_name: profileMap[journal.student_id],
        assignment_title: journal.assignment_id ? assignmentCodeMap[journal.assignment_id] || journal.assignment_id : undefined,
        review_count: countByJournal[journal.id] || 0
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Student Journals</h2>
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({journals.length})
          </Button>
          <Button
            variant={filter === 'published' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('published')}
          >
            Published
          </Button>
          <Button
            variant={filter === 'unpublished' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unpublished')}
          >
            Unpublished
          </Button>
        </div>
      </div>

      {journals.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No journals found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {journals.map((journal) => (
            <Card key={journal.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{journal.assignment_title || 'Untitled'}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {journal.student_name || 'Anonymous'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {(() => {
                          const dateStr = journal.published_at || journal.submitted_at || journal.updated_at || journal.created_at;
                          const date = dateStr ? new Date(dateStr) : new Date();
                          return isNaN(date.getTime()) ? 'Date unknown' : format(date, 'MMM d, yyyy');
                        })()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {journal.review_count} {journal.review_count === 1 ? 'review' : 'reviews'}
                      </span>
                    </div>
                  </div>
                  {journal.is_published ? (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Published
                    </Badge>
                  ) : (
                    <Badge variant="outline">Draft</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {journal.content.substring(0, 200)}...
                </p>
                <Button 
                  onClick={() => navigate(`/classes/mus240/journal/${journal.id}/review`)}
                  variant="outline"
                >
                  View Journal
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
