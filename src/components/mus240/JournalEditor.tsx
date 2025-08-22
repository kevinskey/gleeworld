import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Save, Send, AlertTriangle, Lock, Type } from 'lucide-react';
import { useMus240Journals } from '@/hooks/useMus240Journals';
import { Assignment } from '@/data/mus240Assignments';

interface JournalEditorProps {
  assignment: Assignment;
  onPublished?: () => void;
}

export const JournalEditor: React.FC<JournalEditorProps> = ({ assignment, onPublished }) => {
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { 
    fetchUserEntry, 
    saveJournal, 
    publishJournal, 
    loading 
  } = useMus240Journals();

  useEffect(() => {
    const loadExistingEntry = async () => {
      const entry = await fetchUserEntry(assignment.id);
      if (entry) {
        setContent(entry.content);
        setWordCount(entry.word_count);
        setIsPublished(entry.is_published);
      }
    };
    loadExistingEntry();
  }, [assignment.id, fetchUserEntry]);

  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [content]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setHasChanges(true);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    alert('Copy and paste is disabled. Please type your journal entry directly.');
  };

  const handleSave = async () => {
    const result = await saveJournal(assignment.id, content);
    if (result) {
      setHasChanges(false);
    }
  };

  const handlePublish = async () => {
    if (wordCount < 250) {
      alert('Your journal must be at least 250 words before publishing.');
      return;
    }

    // Save first if there are changes
    if (hasChanges) {
      const saved = await saveJournal(assignment.id, content);
      if (!saved) return;
    }

    const published = await publishJournal(assignment.id);
    if (published) {
      setIsPublished(true);
      setHasChanges(false);
      onPublished?.();
    }
  };

  const isMinimumLength = wordCount >= 250;
  const isMaximumLength = wordCount <= 300;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            {assignment.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isPublished ? "default" : "secondary"}>
              {isPublished ? "Published" : "Draft"}
            </Badge>
            <Badge variant={isMinimumLength ? "default" : "destructive"}>
              {wordCount}/250-300 words
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Copy and paste is disabled. You must type your journal entry directly. 
            Aim for 250-300 words focusing on {assignment.instructions}
          </AlertDescription>
        </Alert>

        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onPaste={handlePaste}
            disabled={isPublished || loading}
            placeholder="Begin typing your journal entry here. Remember to focus on the assignment instructions and provide thoughtful analysis..."
            className="min-h-[300px] resize-none"
          />
          
          {isPublished && (
            <div className="absolute inset-0 bg-muted/50 flex items-center justify-center">
              <Badge variant="outline" className="bg-background">
                Journal Published - No Further Edits Allowed
              </Badge>
            </div>
          )}
        </div>

        {!isMinimumLength && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your journal needs at least {250 - wordCount} more words to meet the minimum requirement.
            </AlertDescription>
          </Alert>
        )}

        {!isMaximumLength && wordCount > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your journal exceeds the maximum length by {wordCount - 300} words. Please edit to stay within 250-300 words.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 justify-end">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isPublished || loading}
            variant="outline"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          
          <Button
            onClick={handlePublish}
            disabled={!isMinimumLength || !isMaximumLength || isPublished || loading}
          >
            <Send className="h-4 w-4 mr-2" />
            Publish for Peer Review
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p className="font-medium">Assignment Details:</p>
          <p>{assignment.description}</p>
          <p className="mt-2"><strong>Focus:</strong> {assignment.instructions}</p>
          <p><strong>Due:</strong> {new Date(assignment.dueDate).toLocaleDateString()}</p>
        </div>
      </CardContent>
    </Card>
  );
};