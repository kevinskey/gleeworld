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
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

interface AICreateTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
}

export const AICreateTestDialog = ({ open, onOpenChange, courseId }: AICreateTestDialogProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [testTitle, setTestTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [courseContext, setCourseContext] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!url && (!testTitle.trim() || !topic.trim())) {
      toast.error('Please provide a URL to scrape OR enter a test title and topic');
      return;
    }

    setIsGenerating(true);
    try {
      // Step 1: Generate questions with AI (and get suggested title if scraping)
      toast.success('Generating test questions...');
      
      const { data: aiData, error: aiError } = await supabase.functions.invoke('generate-test-questions', {
        body: { url, topic, courseContext, difficulty }
      });

      if (aiError) throw aiError;

      if (!aiData.success) {
        throw new Error(aiData.error || 'Failed to generate questions');
      }

      // Use AI-suggested title if we scraped a URL, otherwise use user-provided title
      const finalTitle = url && aiData.testTitle ? aiData.testTitle : testTitle;

      // Step 2: Create the test
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      const { data: newTest, error: testError } = await supabase
        .from('glee_academy_tests')
        .insert({
          course_id: courseId,
          title: finalTitle,
          description: url ? `AI-generated test from ${url}` : `AI-generated test on ${topic}`,
          total_points: 100,
          passing_score: 70,
          duration_minutes: 60,
          is_published: false,
          allow_retakes: true,
          show_correct_answers: true,
          randomize_questions: false,
          created_by: user.user.id
        })
        .select()
        .single();

      if (testError) throw testError;

      // Step 3: Insert questions
      const questionsToInsert = aiData.questions.map((q: any, index: number) => ({
        test_id: newTest.id,
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

      // Step 4: Insert options for multiple-choice and true-false questions
      const optionsToInsert: any[] = [];
      aiData.questions.forEach((q: any, qIndex: number) => {
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

      toast.success('Test created with 20 AI-generated questions!');
      queryClient.invalidateQueries({ queryKey: ['tests', courseId] });
      onOpenChange(false);
      
      // Navigate to the test editor
      navigate(`/test-builder/${newTest.id}`);
      
      // Reset form
      setUrl('');
      setTestTitle('');
      setTopic('');
      setCourseContext('');
      setDifficulty('medium');
    } catch (error: any) {
      console.error('Error creating AI test:', error);
      toast.error(error.message || 'Failed to create test');
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
            AI Create Complete Test
          </DialogTitle>
          <DialogDescription>
            Create a new test with 20 AI-generated questions. Scrape a webpage URL OR provide topic details.
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
              Provide a URL to scrape content and auto-generate the test title
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
            <Label htmlFor="test-title">Test Title {!url && '*'}</Label>
            <Input
              id="test-title"
              placeholder="e.g., Gospel Music Unit Test"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
            />
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
            <Label htmlFor="context">Course Context (Optional)</Label>
            <Textarea
              id="context"
              placeholder="Provide additional context about what should be covered"
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
                  Creating Test...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create Test with 20 Questions
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
