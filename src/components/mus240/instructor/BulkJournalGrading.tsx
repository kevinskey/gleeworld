import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  FileText, 
  User, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  CheckSquare,
  Zap,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface JournalEntry {
  id: string;
  student_id: string;
  assignment_id: string;
  content: string;
  submitted_at: string;
  is_published: boolean;
  word_count?: number;
  student_name?: string;
  student_email?: string;
  assignment_title?: string;
  is_graded?: boolean;
  current_grade?: number;
}

interface BulkGradingProgress {
  total: number;
  completed: number;
  current?: string;
  errors: string[];
}

export const BulkJournalGrading = () => {
  const { user } = useAuth();
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [selectedJournals, setSelectedJournals] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [bulkGrading, setBulkGrading] = useState(false);
  const [progress, setProgress] = useState<BulkGradingProgress>({ total: 0, completed: 0, errors: [] });

  useEffect(() => {
    fetchUngradedJournals();
  }, []);

  const fetchUngradedJournals = async () => {
    try {
      setLoading(true);
      
      // Get all published journal entries
      const { data: journalData, error: journalError } = await supabase
        .from('mus240_journal_entries')
        .select('*')
        .eq('is_published', true)
        .order('submitted_at', { ascending: false });

      if (journalError) throw journalError;

      // Get existing grades
      const { data: gradesData, error: gradesError } = await supabase
        .from('mus240_journal_grades')
        .select('journal_id, overall_score');

      if (gradesError) throw gradesError;

      // Get student profiles
      const studentIds = [...new Set(journalData?.map(j => j.student_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .in('user_id', studentIds);

      if (profilesError) throw profilesError;

      // Create lookups
      const gradesLookup = (gradesData || []).reduce((acc, grade) => {
        acc[grade.journal_id] = grade;
        return acc;
      }, {} as Record<string, any>);

      const profilesLookup = (profilesData || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Process journals with additional data
      const processedJournals = (journalData || []).map(journal => {
        const profile = profilesLookup[journal.student_id];
        const grade = gradesLookup[journal.id];
        const wordCount = journal.content?.trim().split(/\s+/).filter(Boolean).length || 0;
        
        return {
          ...journal,
          student_name: profile?.full_name || 'Unknown Student',
          student_email: profile?.email || '',
          assignment_title: `Assignment ${journal.assignment_id.toUpperCase()}`,
          word_count: wordCount,
          is_graded: !!grade,
          current_grade: grade?.overall_score
        };
      });

      setJournals(processedJournals);
      
      // Clear selection of journals that are now graded
      setSelectedJournals(prev => {
        const newSelection = new Set<string>();
        prev.forEach(id => {
          const journal = processedJournals.find(j => j.id === id);
          if (journal && !journal.is_graded) {
            newSelection.add(id);
          }
        });
        return newSelection;
      });

    } catch (error) {
      console.error('Error fetching journals:', error);
      toast({
        title: "Error",
        description: "Failed to load journal entries",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (ungradedOnly: boolean = true) => {
    const targetJournals = ungradedOnly 
      ? journals.filter(j => !j.is_graded)
      : journals;
    
    if (selectedJournals.size === targetJournals.length) {
      setSelectedJournals(new Set());
    } else {
      setSelectedJournals(new Set(targetJournals.map(j => j.id)));
    }
  };

  const handleJournalSelect = (journalId: string) => {
    setSelectedJournals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(journalId)) {
        newSet.delete(journalId);
      } else {
        newSet.add(journalId);
      }
      return newSet;
    });
  };

  const gradeJournalWithAI = async (journal: JournalEntry): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('grade-journal-ai', {
        body: {
          student_id: journal.student_id,
          assignment_id: journal.assignment_id,
          journal_text: journal.content,
          journal_id: journal.id,
          rubric: {
            criteria: [
              { name: "Musical Analysis", max_points: 6, description: "Use of musical terminology and analytical depth" },
              { name: "Historical Context", max_points: 6, description: "Understanding of cultural and historical significance" },
              { name: "Writing Quality", max_points: 5, description: "Clarity, structure, and evidence support" }
            ]
          }
        }
      });

      if (error) {
        console.error('AI grading error:', error);
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'AI grading failed' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Exception during AI grading:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  };

  const handleBulkGrade = async () => {
    if (selectedJournals.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select journals to grade",
        variant: "destructive"
      });
      return;
    }

    setBulkGrading(true);
    const selectedJournalList = journals.filter(j => selectedJournals.has(j.id));
    setProgress({ total: selectedJournalList.length, completed: 0, errors: [] });

    let completed = 0;
    const errors: string[] = [];

    for (const journal of selectedJournalList) {
      setProgress(prev => ({ ...prev, current: journal.student_name }));
      
      const result = await gradeJournalWithAI(journal);
      
      if (result.success) {
        completed++;
      } else {
        errors.push(`${journal.student_name}: ${result.error}`);
      }

      setProgress(prev => ({ ...prev, completed: completed, errors }));
      
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setBulkGrading(false);
    setSelectedJournals(new Set());
    
    toast({
      title: "Bulk Grading Complete",
      description: `Successfully graded ${completed} of ${selectedJournalList.length} journals`,
      variant: completed === selectedJournalList.length ? "default" : "destructive"
    });

    // Refresh the data
    await fetchUngradedJournals();
  };

  const ungradedJournals = journals.filter(j => !j.is_graded);
  const gradedJournals = journals.filter(j => j.is_graded);
  const selectedUngradedCount = Array.from(selectedJournals).filter(id => 
    ungradedJournals.some(j => j.id === id)
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading journal entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Bulk Journal Grading
          </h2>
          <p className="text-gray-600">AI-powered bulk grading for journal entries</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            {ungradedJournals.length} Ungraded
          </Badge>
          <Badge variant="outline">
            {gradedJournals.length} Graded
          </Badge>
        </div>
      </div>

      {/* Bulk Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Bulk Actions
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectAll(true)}
                disabled={bulkGrading}
              >
                {selectedUngradedCount === ungradedJournals.length ? 'Deselect All' : 'Select All Ungraded'}
              </Button>
              <Button
                onClick={handleBulkGrade}
                disabled={selectedJournals.size === 0 || bulkGrading}
                className="flex items-center gap-2"
              >
                {bulkGrading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Grade Selected ({selectedUngradedCount})
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {bulkGrading && (
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Progress: {progress.completed} of {progress.total}</span>
                <span>{Math.round((progress.completed / progress.total) * 100)}%</span>
              </div>
              <Progress value={(progress.completed / progress.total) * 100} />
              {progress.current && (
                <p className="text-sm text-muted-foreground">
                  Currently grading: {progress.current}
                </p>
              )}
              {progress.errors.length > 0 && (
                <div className="text-sm text-destructive">
                  <p className="font-medium">Errors ({progress.errors.length}):</p>
                  <ul className="list-disc list-inside space-y-1">
                    {progress.errors.slice(-3).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Journal List */}
      <div className="grid gap-4">
        {/* Ungraded Journals */}
        {ungradedJournals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertCircle className="h-5 w-5" />
                Ungraded Journals ({ungradedJournals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {ungradedJournals.map((journal) => (
                    <div key={journal.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                      <Checkbox
                        checked={selectedJournals.has(journal.id)}
                        onCheckedChange={() => handleJournalSelect(journal.id)}
                        disabled={bulkGrading}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{journal.student_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {journal.assignment_title}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(journal.submitted_at).toLocaleDateString()}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{journal.student_email}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{journal.word_count} words</span>
                          <Badge variant="secondary" className="text-xs">Pending</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Graded Journals */}
        {gradedJournals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Recently Graded ({gradedJournals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {gradedJournals.slice(0, 10).map((journal) => (
                    <div key={journal.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50/50">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div>
                          <span className="font-medium">{journal.student_name}</span>
                          <div className="text-sm text-muted-foreground">
                            {journal.assignment_title} • {journal.word_count} words
                          </div>
                        </div>
                      </div>
                      <Badge variant="default" className="bg-green-600">
                        {journal.current_grade}/17
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {journals.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No journal entries found</h3>
              <p className="text-gray-600">Published journal submissions will appear here for bulk grading.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};