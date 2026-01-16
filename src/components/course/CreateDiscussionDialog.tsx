import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Calendar, Award, Info } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CreateDiscussionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
}

const DEFAULT_INSTRUCTIONS = `**Discussion Instructions:**

Post one original reflection responding to the prompts below. Your post should add a clear perspective, not summarize history.

Then, respond thoughtfully to at least one classmate by engaging their idea—agreeing, questioning, or extending it.

This is a conversation, not a debate. There are no "right" answers.

**What Counts as a Strong Original Post:**
- References at least two different eras of music
- Uses listening language ("I hear…," "This feels like…," "The music assumes…")
- Makes one clear claim or question

**What Counts as a Strong Response:**
- Builds on a peer's idea
- Gently challenges an assumption
- Connects their comment to a different era of music
- 3–5 sentences is enough`;

export const CreateDiscussionDialog: React.FC<CreateDiscussionDialogProps> = ({
  open,
  onOpenChange,
  courseId,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isGraded, setIsGraded] = useState(true);
  const [maxPoints, setMaxPoints] = useState(10);
  const [dueDate, setDueDate] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('You must be logged in');
      
      const { data, error } = await supabase
        .from('course_discussions')
        .insert({
          course_id: courseId,
          title: title.trim(),
          content: content.trim(),
          created_by: user.id,
          reply_count: 0,
          is_locked: false,
          is_graded: isGraded,
          max_points: isGraded ? maxPoints : null,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-discussions', courseId] });
      toast.success('Discussion created successfully');
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create discussion');
    },
  });

  const resetForm = () => {
    setTitle('');
    setContent('');
    setIsGraded(true);
    setMaxPoints(10);
    setDueDate('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (isGraded && maxPoints <= 0) {
      toast.error('Max points must be greater than 0');
      return;
    }
    createMutation.mutate();
  };

  const insertInstructions = () => {
    setContent(prev => prev + (prev ? '\n\n' : '') + DEFAULT_INSTRUCTIONS);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start a New Discussion</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter discussion title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={createMutation.isPending}
            />
          </div>
          
          {/* Instructions Helper */}
          <Collapsible open={showInstructions} onOpenChange={setShowInstructions}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Recommended Discussion Structure
                </span>
                <span className="text-xs text-muted-foreground">
                  {showInstructions ? 'Hide' : 'Show'}
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="p-4 bg-muted/50 rounded-lg text-sm space-y-3">
                <p className="font-semibold text-primary">Post once. Respond once.</p>
                <p className="text-muted-foreground">
                  This structure encourages voice + listening—not performative posting or parallel monologues.
                </p>
                <div className="grid gap-2 text-xs">
                  <div className="p-2 bg-background rounded">
                    <strong>Grading Rubric:</strong>
                    <ul className="mt-1 space-y-1 list-disc list-inside text-muted-foreground">
                      <li><strong>Original Post:</strong> Clear, reflective, engages music</li>
                      <li><strong>Response:</strong> Thoughtful engagement with peer</li>
                      <li><strong>Tone:</strong> Respectful, curious</li>
                      <li><strong>Length:</strong> Concise, not padded</li>
                    </ul>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={insertInstructions}
                  className="w-full"
                >
                  Insert Default Instructions into Content
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="space-y-2">
            <Label htmlFor="content">Content & Prompts</Label>
            <Textarea
              id="content"
              placeholder="What would you like students to reflect on?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={createMutation.isPending}
              rows={8}
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Due Date
            </Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={createMutation.isPending}
            />
          </div>

          {/* Grading Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="isGraded" className="text-sm font-medium">
                  Graded Discussion
                </Label>
                <p className="text-xs text-muted-foreground">
                  Post once + respond once structure
                </p>
              </div>
            </div>
            <Switch
              id="isGraded"
              checked={isGraded}
              onCheckedChange={setIsGraded}
              disabled={createMutation.isPending}
            />
          </div>

          {/* Max Points (only shown when graded) */}
          {isGraded && (
            <div className="space-y-2">
              <Label htmlFor="maxPoints">Maximum Points</Label>
              <Input
                id="maxPoints"
                type="number"
                min={1}
                max={100}
                value={maxPoints}
                onChange={(e) => setMaxPoints(parseInt(e.target.value) || 10)}
                disabled={createMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 10 points (Original Post: 5, Response: 3, Tone/Length: 2)
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Discussion
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
