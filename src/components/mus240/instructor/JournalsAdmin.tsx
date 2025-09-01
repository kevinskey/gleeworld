import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Search, Filter, BarChart3, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { InstructorGradingModal } from '@/components/mus240/InstructorGradingModal';
import { Assignment } from '@/data/mus240Assignments';

interface JournalEntry {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  is_published: boolean;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  user_profile?: {
    full_name: string;
    email: string;
  };
  grade?: {
    overall_score: number;
    letter_grade: string;
    graded_at: string;
  };
}

export const JournalsAdmin = () => {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [filteredJournals, setFilteredJournals] = useState<JournalEntry[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssignment, setFilterAssignment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    fetchJournals();
    fetchAssignments();
  }, []);

  useEffect(() => {
    filterJournals();
  }, [journals, searchTerm, filterAssignment, filterStatus]);

  const fetchJournals = async () => {
    try {
      const { data, error } = await supabase
        .from('mus240_journal_entries')
        .select(`
          *
        `)
        .eq('is_published', true)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles and grades for each journal
      const journalsWithGrades = await Promise.all(
        (data || []).map(async (journal) => {
          // Fetch user profile
          const { data: profileData } = await supabase
            .from('gw_profiles')
            .select('full_name, email')
            .eq('user_id', journal.student_id)
            .single();

          // Fetch grade
          const { data: gradeData } = await supabase
            .from('mus240_journal_grades')
            .select('overall_score, letter_grade, graded_at')
            .eq('journal_id', journal.id)
            .single();

          return {
            ...journal,
            user_profile: profileData,
            grade: gradeData
          };
        })
      );

      setJournals(journalsWithGrades);
    } catch (error) {
      console.error('Error fetching journals:', error);
      toast.error('Failed to load journals');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('mus240_assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const filterJournals = () => {
    let filtered = journals;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(journal =>
        journal.user_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        journal.user_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        journal.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Assignment filter
    if (filterAssignment && filterAssignment !== 'all') {
      filtered = filtered.filter(journal => journal.assignment_id === filterAssignment);
    }

    // Status filter
    if (filterStatus && filterStatus !== 'all') {
      if (filterStatus === 'graded') {
        filtered = filtered.filter(journal => journal.grade);
      } else if (filterStatus === 'ungraded') {
        filtered = filtered.filter(journal => !journal.grade);
      }
    }

    setFilteredJournals(filtered);
  };

  const openGradingModal = (journal: JournalEntry) => {
    // Create a mock assignment since we're using different data structure
    const mockAssignment = {
      id: journal.assignment_id,
      title: assignments.find(a => a.id === journal.assignment_id)?.title || 'Unknown Assignment',
      description: '',
      prompt: assignments.find(a => a.id === journal.assignment_id)?.prompt || '',
      points: assignments.find(a => a.id === journal.assignment_id)?.points || 100,
      dueDate: assignments.find(a => a.id === journal.assignment_id)?.due_date || '',
      type: 'listening_journal'
    };

    const mockJournal = {
      id: journal.id,
      user_id: journal.student_id,
      content: journal.content,
      author_name: journal.user_profile?.full_name || 'Unknown Student'
    };

    setSelectedJournal(mockJournal);
    setSelectedAssignment(mockAssignment);
    setGradingModalOpen(true);
  };

  const handleGradeComplete = () => {
    setGradingModalOpen(false);
    setSelectedJournal(null);
    setSelectedAssignment(null);
    fetchJournals(); // Refresh the list
  };

  const getWordCount = (content: string) => {
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  if (loading) {
    return <div>Loading journals...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Journals Administration</h2>
          <p className="text-gray-600">View and grade student listening journals</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search students or content..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterAssignment} onValueChange={setFilterAssignment}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignments</SelectItem>
                {assignments.map((assignment) => (
                  <SelectItem key={assignment.id} value={assignment.id}>
                    {assignment.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Journals</SelectItem>
                <SelectItem value="graded">Graded</SelectItem>
                <SelectItem value="ungraded">Ungraded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{filteredJournals.length}</p>
              <p className="text-sm text-gray-600">Total Journals</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {filteredJournals.filter(j => j.grade).length}
              </p>
              <p className="text-sm text-gray-600">Graded</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {filteredJournals.filter(j => !j.grade).length}
              </p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Journals List */}
      <div className="space-y-4">
        {filteredJournals.map((journal) => (
          <Card key={journal.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {journal.user_profile?.full_name || 'Unknown Student'}
                    {journal.grade && (
                      <Badge variant="default">
                        {journal.grade.overall_score}% ({journal.grade.letter_grade})
                      </Badge>
                    )}
                    {!journal.grade && (
                      <Badge variant="outline">Ungraded</Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-gray-600">{journal.user_profile?.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openGradingModal(journal)}
                  >
                    {journal.grade ? (
                      <>
                        <Eye className="h-4 w-4 mr-1" />
                        View Grade
                      </>
                    ) : (
                      <>
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Grade
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Assignment:</p>
                  <p className="font-medium">
                    {assignments.find(a => a.id === journal.assignment_id)?.title || 'Unknown Assignment'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Journal Content:</p>
                  <p className="text-sm bg-gray-50 p-3 rounded line-clamp-3">
                    {journal.content.length > 300 
                      ? `${journal.content.substring(0, 300)}...` 
                      : journal.content
                    }
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <BarChart3 className="h-4 w-4" />
                    {getWordCount(journal.content)} words
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Published {new Date(journal.submitted_at).toLocaleDateString()}
                  </div>
                  {journal.grade && (
                    <div className="flex items-center gap-1">
                      <BarChart3 className="h-4 w-4" />
                      Graded {new Date(journal.grade.graded_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredJournals.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No journals found</h3>
            <p className="text-gray-600">No published journals match your current filters.</p>
          </CardContent>
        </Card>
      )}

      {/* Grading Modal */}
      {selectedJournal && selectedAssignment && (
        <InstructorGradingModal
          isOpen={gradingModalOpen}
          onClose={() => setGradingModalOpen(false)}
          assignment={selectedAssignment}
          journal={selectedJournal}
          existingGrade={selectedJournal.grade}
          onGradeComplete={handleGradeComplete}
        />
      )}
    </div>
  );
};