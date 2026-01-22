import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Send, Save, AlertCircle, CheckCircle2, Lock, 
  FileText, HelpCircle
} from 'lucide-react';
import { 
  DiscussionPrompt, 
  DiscussionPost,
  usePostMutation,
  useSubmitPost,
  validatePost 
} from '@/hooks/useDiscussionGroups';
import { cn } from '@/lib/utils';

interface IndividualPostEditorProps {
  prompt: DiscussionPrompt;
  existingPost?: DiscussionPost | null;
  isPhaseActive: boolean;
  onSubmitted?: () => void;
}

export const IndividualPostEditor: React.FC<IndividualPostEditorProps> = ({
  prompt,
  existingPost,
  isPhaseActive,
  onSubmitted
}) => {
  const [content, setContent] = useState(existingPost?.content || '');
  const [showValidation, setShowValidation] = useState(false);
  
  const postMutation = usePostMutation(prompt.id);
  const submitMutation = useSubmitPost();
  
  useEffect(() => {
    if (existingPost?.content) {
      setContent(existingPost.content);
    }
  }, [existingPost]);
  
  const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
  const wordProgress = Math.min((wordCount / prompt.word_max) * 100, 100);
  const validation = validatePost(content, prompt.word_min, prompt.word_max);
  
  const isLocked = existingPost && !existingPost.is_draft;
  const canEdit = isPhaseActive && !isLocked;
  
  const handleSaveDraft = async () => {
    await postMutation.mutateAsync({
      content,
      post_type: 'individual',
      is_draft: true
    });
  };
  
  const handleSubmit = async () => {
    setShowValidation(true);
    if (!validation.valid) return;
    
    if (existingPost) {
      await submitMutation.mutateAsync(existingPost.id);
    } else {
      await postMutation.mutateAsync({
        content,
        post_type: 'individual',
        is_draft: false
      });
    }
    onSubmitted?.();
  };
  
  if (isLocked) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Your Individual Post
            </CardTitle>
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Lock className="h-3 w-3 mr-1" />
              Submitted
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert bg-background/50 p-4 rounded-lg">
            {existingPost?.content.split('\n').map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span>{existingPost?.word_count} words</span>
            <span>Submitted {existingPost?.submitted_at ? new Date(existingPost.submitted_at).toLocaleDateString() : ''}</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!isPhaseActive) {
    return (
      <Card className="opacity-75">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            Individual Post Phase
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {existingPost ? 
              'This phase has ended. Your post has been locked.' : 
              'This phase is not currently active.'
            }
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Your Individual Post
          </CardTitle>
          <Badge variant="outline">
            {wordCount} / {prompt.word_min}–{prompt.word_max} words
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your thoughts on the discussion prompt. Reference the stimulus material and include at least one question for your peers..."
          className="min-h-[200px] resize-y"
          disabled={!canEdit}
        />
        
        {/* Word count progress */}
        <div className="space-y-1">
          <Progress 
            value={wordProgress} 
            className={cn(
              "h-2",
              wordCount < prompt.word_min && "bg-muted",
              wordCount >= prompt.word_min && wordCount <= prompt.word_max && "[&>div]:bg-green-500",
              wordCount > prompt.word_max && "[&>div]:bg-destructive"
            )}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Min: {prompt.word_min}</span>
            <span>Max: {prompt.word_max}</span>
          </div>
        </div>
        
        {/* Validation */}
        {showValidation && !validation.valid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Guidelines */}
        <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-2">
          <p className="font-medium flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Post Guidelines
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-6">
            <li>Reference the stimulus material</li>
            <li>Include at least one question for peers</li>
            <li>Stay within word limits ({prompt.word_min}–{prompt.word_max})</li>
            <li>Once submitted, your post cannot be edited</li>
          </ul>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button 
            variant="outline" 
            onClick={handleSaveDraft}
            disabled={postMutation.isPending || !content.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={postMutation.isPending || submitMutation.isPending || !content.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            Submit & Lock
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
