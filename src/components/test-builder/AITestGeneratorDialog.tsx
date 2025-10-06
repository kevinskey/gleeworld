import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';

interface AITestGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  onQuestionsGenerated: () => void;
}

export const AITestGeneratorDialog = ({ open, onOpenChange, testId, onQuestionsGenerated }: AITestGeneratorDialogProps) => {
  const [url, setUrl] = useState('');
  const [topic, setTopic] = useState('');
  const [courseContext, setCourseContext] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!url && !topic.trim()) {
      toast.error('Please provide a URL to scrape OR enter a topic');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('Sending request with:', { url, topic, courseContext, difficulty });
      const { data, error } = await supabase.functions.invoke('generate-test-questions', {
        body: { url, topic, courseContext, difficulty }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate questions');
      }

      // Insert questions into database
      const questionsToInsert = data.questions.map((q: any, index: number) => ({
        test_id: testId,
        question_text: q.question,
        question_type: q.type.replace('-', '_'),
        points: q.points,
        display_order: index + 1,
        required: true
      }));

      const { data: insertedQuestions, error: insertError } = await supabase
        .from('test_questions')
        .insert(questionsToInsert)
        .select();

      if (insertError) throw insertError;

      // Insert options for multiple-choice and true-false questions
      const optionsToInsert: any[] = [];
      data.questions.forEach((q: any, qIndex: number) => {
        if (q.options && Array.isArray(q.options)) {
          q.options.forEach((option: string, oIndex: number) => {
            optionsToInsert.push({
              question_id: insertedQuestions[qIndex].id,
              option_text: option,
              is_correct: q.correctAnswer === option,
              display_order: oIndex + 1
            });
          });
        }
      });

      if (optionsToInsert.length > 0) {
        const { error: optionsError } = await supabase
          .from('test_answer_options')
          .insert(optionsToInsert);

        if (optionsError) throw optionsError;
      }

      toast.success('Generated 20 questions successfully!');
      onQuestionsGenerated();
      onOpenChange(false);
      setUrl('');
      setTopic('');
      setCourseContext('');
      setDifficulty('medium');
    } catch (error: any) {
      console.error('Error generating test:', error);
      toast.error(error.message || 'Failed to generate test questions');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Test Generator
          </DialogTitle>
          <DialogDescription>
            Generate 20 high-quality test questions. Scrape a webpage URL OR provide a topic.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Webpage URL (Optional)</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/lesson"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Scrape content from a webpage to generate questions
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Topic {!url && '*'}</Label>
            <Input
              id="topic"
              placeholder="e.g., Gospel Music and the Great Migration"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Course Context</Label>
            <Textarea
              id="context"
              placeholder="Provide additional context about what should be covered (optional)"
              value={courseContext}
              onChange={(e) => setCourseContext(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty Level</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate 20 Questions
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
