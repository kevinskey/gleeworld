import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, User, Calendar, MessageSquare, CheckCircle2, Bot, Loader2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AIDetectionAlert } from '../AIDetectionAlert';

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
  ai_writing_detected?: boolean;
  ai_detection_confidence?: number | null;
}

export const InstructorJournalBrowser: React.FC = () => {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'unpublished' | 'graded' | 'not-graded'>('all');
  const [bulkGrading, setBulkGrading] = useState(false);
  const [bulkRegrading, setBulkRegrading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
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

      // Fetch AI detection data and grades from mus240_journal_grades
      const journalIds = journalData?.map(j => j.id) || [];
      const { data: gradesData } = await supabase
        .from('mus240_journal_grades')
        .select('journal_id, ai_writing_detected, ai_detection_confidence')
        .in('journal_id', journalIds);

      const aiDetectionMap = (gradesData || []).reduce((acc, g) => {
        acc[g.journal_id] = {
          detected: g.ai_writing_detected || false,
          confidence: g.ai_detection_confidence
        };
        return acc;
      }, {} as Record<string, { detected: boolean; confidence: number | null }>);

      // Create set of graded journal IDs
      const gradedJournalIds = new Set((gradesData || []).map(g => g.journal_id));

      let enrichedJournals: JournalEntry[] = (journalData || []).map(journal => ({
        ...journal,
        student_name: profileMap[journal.student_id],
        assignment_title: journal.assignment_id ? assignmentCodeMap[journal.assignment_id] || journal.assignment_id : undefined,
        review_count: countByJournal[journal.id] || 0,
        ai_writing_detected: aiDetectionMap[journal.id]?.detected || false,
        ai_detection_confidence: aiDetectionMap[journal.id]?.confidence || null
      }));

      // Apply graded/not-graded filter
      if (filter === 'graded') {
        enrichedJournals = enrichedJournals.filter(j => gradedJournalIds.has(j.id));
      } else if (filter === 'not-graded') {
        enrichedJournals = enrichedJournals.filter(j => !gradedJournalIds.has(j.id));
      }

      setJournals(enrichedJournals);
    } catch (error) {
      console.error('Error fetching journals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkGradeAll = async () => {
    if (!confirm('AI will grade all journals. Students will then be able to revise their work once before you apply final grades. Continue?')) {
      return;
    }

    try {
      // Only grade journals that do NOT yet have an AI grade
      const journalIds = journals.map(j => j.id);
      const { data: existingGrades, error: gradesError } = await supabase
        .from('mus240_journal_grades')
        .select('journal_id')
        .in('journal_id', journalIds);

      if (gradesError) {
        console.error('Error checking existing grades:', gradesError);
      }

      const gradedIds = new Set((existingGrades || []).map(g => g.journal_id));
      const journalsToGrade = journals.filter(j => !gradedIds.has(j.id));

      if (journalsToGrade.length === 0) {
        toast.success('All journals on this page have already been graded.');
        return;
      }

      setBulkGrading(true);
      setBulkProgress({ current: 0, total: journalsToGrade.length });

      let completed = 0;

      for (const journal of journalsToGrade) {
        try {
          setBulkProgress({ current: completed + 1, total: journalsToGrade.length });

          const { error } = await supabase.functions.invoke('grade-mus240-journal', {
            body: { journalId: journal.id },
          });

          if (error) {
            console.error(`Failed to grade journal ${journal.id}:`, error);
            toast.error(`Failed to grade ${journal.student_name || 'student'}'s journal`);
          }

          completed++;
        } catch (err) {
          console.error('Error grading journal:', err);
        }
      }

      toast.success(`AI graded ${completed} of ${journalsToGrade.length} journals. Students can now revise.`);

      fetchJournals();
    } catch (error) {
      console.error('Bulk grading error:', error);
      toast.error('Failed to complete bulk grading');
    } finally {
      setBulkGrading(false);
    }
  };

  const handleBulkRegradeAll = async () => {
    if (!confirm('This will regrade ALL journals with fresh AI analysis and updated rubric scoring. This will overwrite existing grades. Continue?')) {
      return;
    }

    try {
      const journalsToRegrade = journals.filter(j => j.is_published);

      if (journalsToRegrade.length === 0) {
        toast.error('No published journals to regrade.');
        return;
      }

      setBulkRegrading(true);
      setBulkProgress({ current: 0, total: journalsToRegrade.length });

      let completed = 0;
      let failed = 0;

      // Fetch assignment data for each journal
      const { data: assignments } = await supabase
        .from('gw_assignments')
        .select('id, title, legacy_id, points, description')
        .eq('legacy_source', 'mus240_assignments');

      const assignmentMap = new Map();
      (assignments || []).forEach(a => {
        if (a.legacy_id) {
          assignmentMap.set(a.legacy_id, a);
        }
      });

      for (const journal of journalsToRegrade) {
        try {
          setBulkProgress({ current: completed + 1, total: journalsToRegrade.length });

          const assignment = assignmentMap.get(journal.assignment_id);
          if (!assignment) {
            console.error(`No assignment found for journal ${journal.id} with assignment_id ${journal.assignment_id}`);
            failed++;
            continue;
          }

          const { error } = await supabase.functions.invoke('grade-journal-v2', {
            body: {
              journalId: journal.id,
              content: journal.content,
              prompt: assignment.description || assignment.title,
              maxPoints: assignment.points || 20,
              assignmentId: assignment.id
            },
          });

          if (error) {
            console.error(`Failed to regrade journal ${journal.id}:`, error);
            failed++;
          } else {
            completed++;
          }
        } catch (err) {
          console.error('Error regrading journal:', err);
          failed++;
        }
      }

      if (failed > 0) {
        toast.warning(`Regraded ${completed} journals. ${failed} failed.`);
      } else {
        toast.success(`Successfully regraded all ${completed} journals with updated rubric scoring!`);
      }

      fetchJournals();
    } catch (error) {
      console.error('Bulk regrading error:', error);
      toast.error('Failed to complete bulk regrading');
    } finally {
      setBulkRegrading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8">Loading journals...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/mus-240/instructor/console')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Console
        </Button>
      </div>
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Student Journals</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleBulkGradeAll}
            disabled={bulkGrading || bulkRegrading || journals.length === 0}
            className="gap-2"
            variant="outline"
          >
            {bulkGrading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Grading {bulkProgress.current} of {bulkProgress.total}...
              </>
            ) : (
              <>
                <Bot className="h-4 w-4" />
                Bulk Grade New
              </>
            )}
          </Button>
          <Button
            onClick={handleBulkRegradeAll}
            disabled={bulkGrading || bulkRegrading || journals.length === 0}
            className="gap-2"
            variant="default"
          >
            {bulkRegrading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Regrading {bulkProgress.current} of {bulkProgress.total}...
              </>
            ) : (
              <>
                <Bot className="h-4 w-4" />
                Bulk Regrade All
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
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
        <Button
          variant={filter === 'graded' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('graded')}
        >
          Graded
        </Button>
        <Button
          variant={filter === 'not-graded' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('not-graded')}
        >
          Not Graded
        </Button>
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
                  <div className="flex flex-col items-end gap-2">
                    {journal.is_published ? (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="outline">Draft</Badge>
                    )}
                    {journal.ai_writing_detected && (
                      <AIDetectionAlert
                        detected={journal.ai_writing_detected}
                        confidence={journal.ai_detection_confidence}
                        compact={true}
                      />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {journal.content.substring(0, 200)}...
                </p>
                <Button 
                  onClick={() => navigate(`/mus-240/instructor/journal/${journal.id}/grade`)}
                  variant="outline"
                >
                  Grade Submission
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
