import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Save, Send, AlertTriangle, Type, Trash2, Upload, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMus240Journals } from '@/hooks/useMus240Journals';
import { useJournalGrading } from '@/hooks/useJournalGrading';
import { Assignment } from '@/data/mus240Assignments';
import { JournalGradeDisplay } from './JournalGradeDisplay';

interface JournalEditorProps {
  assignment: Assignment;
  onPublished?: () => void;
}

export const JournalEditor: React.FC<JournalEditorProps> = ({ assignment, onPublished }) => {
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [userEntry, setUserEntry] = useState<any>(null);
  const [grade, setGrade] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const { 
    fetchUserEntry, 
    saveJournal, 
    publishJournal, 
    deleteJournal,
    loading 
  } = useMus240Journals();

  const { fetchStudentGrade } = useJournalGrading();

  useEffect(() => {
    const loadExistingEntry = async () => {
      const entry = await fetchUserEntry(assignment.id);
      if (entry) {
        setContent(entry.content);
        setWordCount(entry.word_count);
        setIsPublished(entry.is_published);
        setUserEntry(entry);
        
        // Load grade if exists - fix: use student_id instead of user_id
        const gradeData = await fetchStudentGrade(assignment.id, entry.student_id);
        setGrade(gradeData);
      }
    };
    loadExistingEntry();
  }, [assignment.id]);

  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [content]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setHasChanges(true);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // Allow paste (no restrictions)
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Unsupported File Type",
        description: "Please upload a TXT, PDF, or Word document.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      // For text files, read directly
      if (file.type === 'text/plain') {
        const text = await file.text();
        setContent(text);
        setHasChanges(true);
        toast({
          title: "File Loaded",
          description: "Text file content has been loaded into the editor."
        });
      } else {
        // For PDF/Word files, inform user to use copy/paste from the document
        toast({
          title: "File Type Notice",
          description: "Please open your PDF or Word document, copy the text, and paste it into the editor.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: "Error Reading File",
        description: "Failed to read the file. Please try copying and pasting the content instead.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    const result = await saveJournal(assignment.id, content);
    if (result) {
      setHasChanges(false);
    }
  };

  const handlePublish = async () => {
    if (wordCount < 250) {
      toast({
        title: "Word count too low",
        description: "Your journal must be at least 250 words before publishing.",
        variant: "destructive"
      });
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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this journal entry? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteJournal(assignment.id);
      setContent('');
      setWordCount(0);
      setIsPublished(false);
      setUserEntry(null);
      setHasChanges(false);
      setGrade(null);
      toast({
        title: "Journal deleted",
        description: "Your journal entry has been deleted successfully."
      });
    } catch (error: any) {
      if (error.message.includes("Cannot delete journal with existing comments")) {
        toast({
          title: "Cannot delete journal",
          description: "Cannot delete this journal because it has comments from other students.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Failed to delete",
          description: "Failed to delete journal entry. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const isMinimumLength = wordCount >= 250;
  const isWithinWordLimit = wordCount >= 250 && wordCount <= 300;

  return (
    <div className="space-y-6">
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
              {grade && (
                <Badge variant="default">
                  Graded: {grade.overall_score}% ({grade.letter_grade})
                </Badge>
              )}
              <Badge variant={isMinimumLength ? "default" : "destructive"}>
                {wordCount}/250-300 words
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              You can type directly, paste text, or upload a text file (.txt) for your journal entry. 
              Aim for 250-300 words focusing on the assignment prompt below.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isPublished || loading || uploading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPublished || loading || uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Loading...' : 'Upload File'}
              </Button>
              <span className="text-sm text-muted-foreground self-center">
                Supported: .txt, .pdf, .doc, .docx
              </span>
            </div>

            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                onPaste={handlePaste}
                disabled={isPublished || loading || uploading}
                placeholder="Begin typing your journal entry here, paste text, or upload a file. Remember to focus on the assignment instructions and provide thoughtful analysis..."
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
          </div>

          {!isMinimumLength && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your journal needs at least {250 - wordCount} more words to meet the minimum requirement.
              </AlertDescription>
            </Alert>
          )}

          {wordCount > 300 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your journal exceeds the maximum length by {wordCount - 300} words. Please edit to stay within 250-300 words.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 justify-between">
            <div>
              {userEntry && !isPublished && (
                <Button
                  onClick={handleDelete}
                  disabled={loading}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
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
                disabled={!isWithinWordLimit || isPublished || loading}
              >
                <Send className="h-4 w-4 mr-2" />
                Publish for Peer Review
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
            <p className="font-medium mb-2">Assignment Details:</p>
            <p className="mb-3">{assignment.description}</p>
            
            <div className="space-y-2">
              <p className="font-medium">Instructions:</p>
              <div className="text-xs space-y-1 pl-2">
                {assignment.instructions.split('\n').map((line, index) => {
                  if (line.trim() === '') return null; // Skip empty lines
                  if (line.startsWith('•')) {
                    return (
                      <p key={index} className="flex items-start gap-1">
                        <span className="text-primary">•</span>
                        <span>{line.substring(1).trim()}</span>
                      </p>
                    );
                  }
                  return (
                    <p key={index} className={line.includes('Guidelines') || line.includes('Prompt') ? 'font-semibold mt-3 mb-1' : ''}>
                      {line}
                    </p>
                  );
                })}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <p><strong>Due:</strong> {new Date(assignment.dueDate + 'T12:00:00').toLocaleDateString()}</p>
              {new Date() > new Date(assignment.dueDate + 'T12:00:00') && (
                <p className="text-amber-600 font-medium text-sm">
                  ⚠️ Assignment past due - Late work policy applies (5% per day)
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Show grade if it exists */}
      {grade && <JournalGradeDisplay grade={grade} />}
    </div>
  );
};
