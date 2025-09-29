import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Eye, BarChart3, Calendar, User, Trash2, Bot, Sparkles, Target, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { InstructorGradingModal } from '../InstructorGradingModal';
import { RubricCustomizer } from '../rubrics/RubricCustomizer';
import { AIGradingDemo } from '../rubrics/AIGradingDemo';

export const JournalsAdmin = () => {
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJournals, setExpandedJournals] = useState<Set<string>>(new Set());
  const [gradingModal, setGradingModal] = useState<{
    isOpen: boolean;
    journal: any;
    assignment: any;
  }>({
    isOpen: false,
    journal: null,
    assignment: null
  });

  const toggleJournalExpanded = (journalId: string) => {
    setExpandedJournals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(journalId)) {
        newSet.delete(journalId);
      } else {
        newSet.add(journalId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    fetchJournals();
  }, []);

  const fetchJournals = async () => {
    try {
      const { data, error } = await supabase
        .from('mus240_journal_entries')
        .select('*')
        .eq('is_published', true)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      const journalsWithProfiles = await Promise.all(
        (data || []).map(async (journal) => {
          const { data: profileData } = await supabase
            .from('gw_profiles')
            .select('full_name, email')
            .eq('user_id', journal.student_id)
            .single();

          // Use the lookup table to resolve assignment names from shorthand codes
          const { data: assignmentData } = await supabase
            .from('mus240_assignment_codes')
            .select(`
              assignment_id,
              mus240_assignments!inner (
                id,
                title,
                description
              )
            `)
            .eq('code', journal.assignment_id)
            .maybeSingle();

          // Fallback to direct UUID lookup if code lookup fails
          let assignment = assignmentData?.mus240_assignments;
          if (!assignment) {
            const { data: directAssignment } = await supabase
              .from('mus240_assignments')
              .select('title, id, description')
              .eq('id', journal.assignment_id)
              .maybeSingle();
            assignment = directAssignment;
          }

          return { 
            ...journal, 
            user_profile: profileData,
            assignment: assignment || { 
              id: journal.assignment_id, 
              title: `Unknown Assignment (${journal.assignment_id})`,
              description: 'Assignment not found'
            },
            author_name: profileData?.full_name || 'Unknown Student'
          };
        })
      );

      setJournals(journalsWithProfiles);
    } catch (error) {
      console.error('Error fetching journals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeJournal = (journal: any) => {
    console.log('Selected journal for grading:', journal);
    console.log('Journal student_id:', journal.student_id);
    setGradingModal({
      isOpen: true,
      journal,
      assignment: journal.assignment || { id: journal.assignment_id, title: 'Unknown Assignment' }
    });
  };
  const handleDeleteJournal = async (journalId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete ${studentName}'s journal entry? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete journal entry directly
      await supabase
        .from('mus240_journal_entries')
        .delete()
        .eq('id', journalId);

      alert('Journal entry deleted successfully');
      fetchJournals();
    } catch (error) {
      console.error('Error deleting journal:', error);
      alert('Failed to delete journal entry');
    }
  };

  if (loading) return <div>Loading journals...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            AI-Enhanced Journal Grading
          </h2>
          <p className="text-gray-600">Advanced rubric-based grading with artificial intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            AI Powered
          </Badge>
          <Badge variant="outline">
            {journals.length} Journals
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="journals" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="journals" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Student Journals
          </TabsTrigger>
          <TabsTrigger value="rubrics" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Rubric Manager
          </TabsTrigger>
          <TabsTrigger value="demo" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI Demo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="journals" className="mt-6">

          <div className="space-y-4">
            {journals.map((journal) => (
              <Collapsible 
                key={journal.id}
                open={expandedJournals.has(journal.id)}
                onOpenChange={() => toggleJournalExpanded(journal.id)}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          {expandedJournals.has(journal.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {journal.user_profile?.full_name || 'Unknown Student'}
                              <Badge variant="outline">Ready for AI Grading</Badge>
                            </CardTitle>
                            <p className="text-sm text-gray-600">{journal.user_profile?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          {new Date(journal.submitted_at).toLocaleDateString()}
                          <Badge variant="secondary" className="text-xs">
                            {journal.content?.split(' ').length || 0} words
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <div className="flex justify-end gap-2 border-b pb-3">
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGradeJournal(journal);
                            }}
                            className="flex items-center gap-1"
                          >
                            <Bot className="h-4 w-4" />
                            AI Grade
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteJournal(journal.id, journal.user_profile?.full_name || 'Unknown Student');
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Assignment: {journal.assignment?.title || 'Unknown Assignment'}</p>
                          <div className="text-sm bg-muted/50 p-4 rounded-lg border max-h-96 overflow-y-auto">
                            <p className="whitespace-pre-wrap">{journal.content}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
            
            {journals.length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No journals to grade</h3>
                  <p className="text-gray-600">Student journal submissions will appear here for AI grading.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="rubrics" className="mt-6">
          <RubricCustomizer />
        </TabsContent>

        <TabsContent value="demo" className="mt-6">
          <AIGradingDemo />
        </TabsContent>
      </Tabs>

      {gradingModal.isOpen && (
        <InstructorGradingModal
          isOpen={gradingModal.isOpen}
          onClose={() => setGradingModal({ isOpen: false, journal: null, assignment: null })}
          assignment={gradingModal.assignment}
          journal={gradingModal.journal}
          onGradeComplete={() => {
            fetchJournals();
            setGradingModal({ isOpen: false, journal: null, assignment: null });
          }}
        />
      )}
    </div>
  );
};