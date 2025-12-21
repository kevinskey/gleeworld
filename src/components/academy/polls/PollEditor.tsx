import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, GripVertical, Save, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AcademyPoll, PollQuestion } from './AcademyPollSystem';

interface PollEditorProps {
  poll: AcademyPoll;
  onClose: () => void;
}

export const PollEditor: React.FC<PollEditorProps> = ({ poll, onClose }) => {
  const [title, setTitle] = useState(poll.title);
  const [description, setDescription] = useState(poll.description || '');
  const [questions, setQuestions] = useState<PollQuestion[]>(poll.questions);
  const [saving, setSaving] = useState(false);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { question: '', options: ['', '', '', ''], correct_answer: undefined }
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof PollQuestion, value: any) => {
    setQuestions(questions.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions(questions.map((q, i) => {
      if (i !== questionIndex) return q;
      const newOptions = [...q.options];
      newOptions[optionIndex] = value;
      return { ...q, options: newOptions };
    }));
  };

  const addOption = (questionIndex: number) => {
    setQuestions(questions.map((q, i) => {
      if (i !== questionIndex) return q;
      return { ...q, options: [...q.options, ''] };
    }));
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuestions(questions.map((q, i) => {
      if (i !== questionIndex) return q;
      const newOptions = q.options.filter((_, oi) => oi !== optionIndex);
      // Adjust correct answer if needed
      let newCorrect = q.correct_answer;
      if (q.correct_answer === optionIndex) {
        newCorrect = undefined;
      } else if (q.correct_answer !== undefined && q.correct_answer > optionIndex) {
        newCorrect = q.correct_answer - 1;
      }
      return { ...q, options: newOptions, correct_answer: newCorrect };
    }));
  };

  const setCorrectAnswer = (questionIndex: number, optionIndex: number) => {
    setQuestions(questions.map((q, i) => 
      i === questionIndex ? { ...q, correct_answer: optionIndex } : q
    ));
  };

  const savePoll = async () => {
    if (!title.trim()) {
      toast.error('Please enter a poll title');
      return;
    }

    // Validate questions
    const validQuestions = questions.filter(q => 
      q.question.trim() && q.options.filter(o => o.trim()).length >= 2
    );

    setSaving(true);
    try {
      const { error } = await supabase
        .from('gw_academy_polls')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          questions: validQuestions as unknown as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', poll.id);

      if (error) throw error;
      
      toast.success('Poll saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving poll:', error);
      toast.error('Failed to save poll');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={savePoll} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Poll'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Poll</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Poll title..."
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description (optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Poll description..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Questions ({questions.length})</CardTitle>
          <Button onClick={addQuestion} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Question
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {questions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No questions yet. Click "Add Question" to get started.
            </p>
          ) : (
            questions.map((question, qIdx) => (
              <div key={qIdx} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Q{qIdx + 1}</Badge>
                    </div>
                    <Textarea
                      value={question.question}
                      onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                      placeholder="Enter your question..."
                      rows={2}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(qIdx)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2 ml-4">
                  <label className="text-sm font-medium">Options</label>
                  {question.options.map((option, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <Button
                        variant={question.correct_answer === oIdx ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCorrectAnswer(qIdx, oIdx)}
                        title="Set as correct answer"
                      >
                        {question.correct_answer === oIdx ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          String.fromCharCode(65 + oIdx)
                        )}
                      </Button>
                      <Input
                        value={option}
                        onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + oIdx)}...`}
                        className="flex-1"
                      />
                      {question.options.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(qIdx, oIdx)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {question.options.length < 6 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addOption(qIdx)}
                      className="ml-10"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Option
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
