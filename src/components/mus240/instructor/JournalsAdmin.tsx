import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, BarChart3, Calendar, User, Trash2, Bot, Sparkles, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { InstructorGradingModal } from '../InstructorGradingModal';
import { RubricCustomizer } from '../rubrics/RubricCustomizer';
import { AIGradingDemo } from '../rubrics/AIGradingDemo';

export const JournalsAdmin = () => {
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradingModal, setGradingModal] = useState<{
    isOpen: boolean;
    journal: any;
    assignment: any;
  }>({
    isOpen: false,
    journal: null,
    assignment: null
  });

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

          const { data: assignmentData } = await supabase
            .from('mus240_assignments')
            .select('title, id')
            .eq('id', journal.assignment_id)
            .single();

          return { 
            ...journal, 
            user_profile: profileData,
            assignment: assignmentData,
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
              <Card key={journal.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {journal.user_profile?.full_name || 'Unknown Student'}
                        <Badge variant="outline">Ready for AI Grading</Badge>
                      </CardTitle>
                      <p className="text-sm text-gray-600">{journal.user_profile?.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handleGradeJournal(journal)}
                        className="flex items-center gap-1"
                      >
                        <Bot className="h-4 w-4" />
                        AI Grade
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteJournal(journal.id, journal.user_profile?.full_name || 'Unknown Student')}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Journal Content Preview:</p>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg border line-clamp-3">
                        {journal.content?.substring(0, 300)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Published {new Date(journal.submitted_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {journal.content?.split(' ').length || 0} words
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        Assignment: {journal.assignment?.title || 'Unknown Assignment'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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