import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, GraduationCap, Bot } from 'lucide-react';
import { useMus240Journals } from '@/hooks/useMus240Journals';
import { useJournalGrading } from '@/hooks/useJournalGrading';
import { useAuth } from '@/contexts/AuthContext';
import { Assignment } from '@/data/mus240Assignments';
import { InstructorGradingModal } from './InstructorGradingModal';

interface JournalReaderProps {
  assignment: Assignment;
}

export const JournalReader: React.FC<JournalReaderProps> = ({ assignment }) => {
  const { user } = useAuth();
  const [journals, setJournals] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [selectedJournal, setSelectedJournal] = useState<string | null>(null);
  const [isInstructor, setIsInstructor] = useState(false);
  const [gradingModal, setGradingModal] = useState<{ isOpen: boolean; journal: any }>({
    isOpen: false,
    journal: null
  });
  const [grades, setGrades] = useState<Record<string, any>>({});

  const { 
    fetchPublishedJournals, 
    fetchJournalComments, 
    addJournalComment,
    loading 
  } = useMus240Journals();

  const { fetchAllGradesForAssignment } = useJournalGrading();

  useEffect(() => {
    const loadJournals = async () => {
      const publishedJournals = await fetchPublishedJournals(assignment.id);
      setJournals(publishedJournals || []);

      // Load grades for instructor view
      if (user) {
        // Check if user is instructor (simplified check - you may want to enhance this)
        const profile = user.user_metadata || {};
        const userIsInstructor = profile.role === 'instructor' || profile.is_admin;
        setIsInstructor(userIsInstructor);

        if (userIsInstructor) {
          const assignmentGrades = await fetchAllGradesForAssignment(assignment.id);
          const gradeMap = assignmentGrades?.reduce((acc: any, grade: any) => {
            acc[grade.student_id] = grade;
            return acc;
          }, {}) || {};
          setGrades(gradeMap);
        }
      }
    };
    loadJournals();
  }, [assignment.id, fetchPublishedJournals, fetchAllGradesForAssignment, user]);

  const loadComments = async (journalId: string) => {
    const journalComments = await fetchJournalComments(journalId);
    setComments(journalComments || []);
    setSelectedJournal(journalId);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedJournal) return;
    
    const success = await addJournalComment(selectedJournal, newComment);
    if (success) {
      setNewComment('');
      loadComments(selectedJournal); // Reload comments
    }
  };

  const handleGradeJournal = (journal: any) => {
    setGradingModal({ isOpen: true, journal });
  };

  const handleGradeComplete = (grade: any) => {
    setGrades(prev => ({
      ...prev,
      [gradingModal.journal.user_id]: grade
    }));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (journals.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">No published journals yet</p>
          <p className="text-muted-foreground">
            Check back later when your classmates have published their journal entries.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {journals.map((journal) => {
        const grade = grades[journal.user_id];
        
        return (
          <Card key={journal.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {journal.author_name || 'Anonymous'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {grade && (
                    <Badge variant="default">
                      {grade.overall_score}% ({grade.letter_grade})
                    </Badge>
                  )}
                  {isInstructor && (
                    <Button
                      onClick={() => handleGradeJournal(journal)}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <GraduationCap className="h-3 w-3" />
                      {grade ? 'View Grade' : 'Grade'}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{journal.content}</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  Published {new Date(journal.published_at).toLocaleDateString()}
                </span>
                <Button 
                  onClick={() => loadComments(journal.id)}
                  variant="ghost" 
                  size="sm"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  View Comments
                </Button>
              </div>

              {/* Comments Section */}
              {selectedJournal === journal.id && (
                <div className="space-y-4 mt-4 pt-4 border-t">
                  <h4 className="font-medium">Comments</h4>
                  
                  {comments.length > 0 ? (
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <div key={comment.id} className="bg-muted/50 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{comment.author_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No comments yet.</p>
                  )}

                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add a thoughtful comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                    <Button 
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Grading Modal */}
      <InstructorGradingModal
        isOpen={gradingModal.isOpen}
        onClose={() => setGradingModal({ isOpen: false, journal: null })}
        assignment={assignment}
        journal={gradingModal.journal}
        existingGrade={gradingModal.journal ? grades[gradingModal.journal.user_id] : null}
        onGradeComplete={handleGradeComplete}
      />
    </div>
  );
};
