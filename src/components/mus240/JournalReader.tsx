import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageCircle, Eye, User, Clock, CheckCircle, Target } from 'lucide-react';
import { useMus240Journals } from '@/hooks/useMus240Journals';
import { Assignment } from '@/data/mus240Assignments';

interface JournalEntry {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  word_count: number;
  created_at: string;
  student_name?: string;
}

interface JournalReaderProps {
  assignment: Assignment;
}

export const JournalReader: React.FC<JournalReaderProps> = ({ assignment }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [commentText, setCommentText] = useState('');
  const [readEntries, setReadEntries] = useState<Set<string>>(new Set());
  
  const { 
    fetchPublishedEntries, 
    fetchComments, 
    addComment, 
    markAsRead,
    comments,
    readingProgress,
    fetchReadingProgress,
    loading 
  } = useMus240Journals();

  useEffect(() => {
    const loadEntries = async () => {
      const publishedEntries = await fetchPublishedEntries(assignment.id);
      setEntries(publishedEntries);
    };
    
    loadEntries();
    fetchReadingProgress(assignment.id);
  }, [assignment.id, fetchPublishedEntries, fetchReadingProgress]);

  const handleReadEntry = async (entry: JournalEntry) => {
    setSelectedEntry(entry);
    await fetchComments(entry.id);
    
    if (!readEntries.has(entry.id)) {
      await markAsRead(entry.id);
      setReadEntries(prev => new Set([...prev, entry.id]));
      // Refresh reading progress
      fetchReadingProgress(assignment.id);
    }
  };

  const handleAddComment = async () => {
    if (!selectedEntry || !commentText.trim()) return;
    
    const comment = await addComment(selectedEntry.id, commentText.trim());
    if (comment) {
      setCommentText('');
    }
  };

  const progress = readingProgress[assignment.id];
  const hasMetRequirement = progress?.journals_read >= (progress?.required_reads || 2);

  return (
    <div className="space-y-6">
      {/* Reading Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Reading Requirement Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant={hasMetRequirement ? "default" : "secondary"}>
              {progress?.journals_read || 0} / {progress?.required_reads || 2} journals read
            </Badge>
            {hasMetRequirement && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Requirement completed!</span>
              </div>
            )}
          </div>
          {!hasMetRequirement && (
            <Alert className="mt-3">
              <AlertDescription>
                You must read and comment on at least {(progress?.required_reads || 2) - (progress?.journals_read || 0)} more journal(s) 
                to complete this week's peer review requirement.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Journal List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Peer Journals ({entries.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entries.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No peer journals have been published yet.
              </p>
            ) : (
              entries.map((entry) => (
                <Card 
                  key={entry.id} 
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedEntry?.id === entry.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleReadEntry(entry)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">
                          {entry.student_name || 'Anonymous'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {readEntries.has(entry.id) && (
                          <Badge variant="outline" className="text-xs">
                            <Eye className="h-3 w-3 mr-1" />
                            Read
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {entry.word_count} words
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(entry.created_at).toLocaleDateString()}
                    </div>
                    <p className="text-sm mt-2 line-clamp-2">
                      {entry.content.substring(0, 120)}...
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Selected Journal and Comments */}
        {selectedEntry && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Journal & Comments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Journal Content */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">
                    {selectedEntry.student_name || 'Anonymous'}
                  </span>
                  <Badge variant="outline">
                    {selectedEntry.word_count} words
                  </Badge>
                </div>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {selectedEntry.content}
                  </p>
                </div>
              </div>

              {/* Comments Section */}
              <div className="space-y-3">
                <h4 className="font-medium">Comments</h4>
                
                {comments[selectedEntry.id]?.map((comment) => (
                  <div key={comment.id} className="bg-background border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {comment.commenter_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                ))}

                {(!comments[selectedEntry.id] || comments[selectedEntry.id].length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No comments yet. Be the first to provide feedback!
                  </p>
                )}

                {/* Add Comment */}
                <div className="space-y-2">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a thoughtful comment about this journal entry..."
                    className="min-h-[80px]"
                  />
                  <Button 
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || loading}
                    size="sm"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Add Comment
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};