import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, BarChart3, Calendar, User, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { InstructorGradingModal } from '../InstructorGradingModal';

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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Journals Administration</h2>
        <p className="text-gray-600">View and grade student listening journals</p>
      </div>

      <div className="space-y-4">
        {journals.map((journal) => (
          <Card key={journal.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {journal.user_profile?.full_name || 'Unknown Student'}
                    <Badge variant="outline">Ungraded</Badge>
                  </CardTitle>
                  <p className="text-sm text-gray-600">{journal.user_profile?.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleGradeJournal(journal)}
                  >
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Grade
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
                  <p className="text-sm text-gray-600 mb-1">Journal Content:</p>
                  <p className="text-sm bg-gray-50 p-3 rounded line-clamp-3">
                    {journal.content?.substring(0, 300)}...
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Published {new Date(journal.submitted_at).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    Assignment: {journal.assignment?.title || 'Unknown Assignment'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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