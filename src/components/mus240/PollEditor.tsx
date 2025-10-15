import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  X, 
  Plus, 
  Trash2, 
  GripVertical,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Question {
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
  audio_url?: string;
}

interface PollEditorProps {
  pollId: string | null;
  onClose: () => void;
  onSave: () => void;
}

export const PollEditor: React.FC<PollEditorProps> = ({ pollId, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([{
    question: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    explanation: ''
  }]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pollId) {
      loadPoll();
    }
  }, [pollId]);

  const loadPoll = async () => {
    if (!pollId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mus240_polls')
        .select('*')
        .eq('id', pollId)
        .single();

      if (error) throw error;

      setTitle(data.title || '');
      setDescription(data.description || '');
      
      // Parse questions from JSON
      const questionsData = Array.isArray(data.questions) 
        ? data.questions as unknown as Question[]
        : [{
            question: '',
            options: ['', '', '', ''],
            correct_answer: 0,
            explanation: ''
          }];
      setQuestions(questionsData);
    } catch (error) {
      console.error('Error loading poll:', error);
      toast.error('Failed to load poll');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a poll title');
      return;
    }

    if (questions.some(q => !q.question.trim())) {
      toast.error('All questions must have text');
      return;
    }

    if (questions.some(q => q.options.some(opt => !opt.trim()))) {
      toast.error('All answer options must be filled in');
      return;
    }

    setSaving(true);
    try {
      if (pollId) {
        // Update existing poll
        const { error } = await supabase
          .from('mus240_polls')
          .update({
            title: title.trim(),
            description: description.trim(),
            questions: questions as any
          })
          .eq('id', pollId);

        if (error) throw error;
        toast.success('Poll updated successfully!');
      } else {
        // Create new poll
        const { error } = await supabase
          .from('mus240_polls')
          .insert([{
            title: title.trim(),
            description: description.trim(),
            questions: questions as any,
            is_active: false
          }]);

        if (error) throw error;
        toast.success('Poll created successfully!');
      }
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving poll:', error);
      toast.error('Failed to save poll');
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      question: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      explanation: ''
    }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length === 1) {
      toast.error('Poll must have at least one question');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[optIndex] = value;
    setQuestions(newQuestions);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl mx-4 p-8">
          <div className="text-center text-lg">Loading poll...</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-t-lg z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {pollId ? 'Edit Poll' : 'Create New Poll'}
            </h2>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-white text-blue-700 hover:bg-blue-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Poll'}
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Poll Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Poll Title *
              </label>
              <Input
                placeholder="Enter poll title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <Textarea
                placeholder="Enter poll description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Questions</h3>
              <Button
                onClick={addQuestion}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>

            {questions.map((question, qIndex) => (
              <Card key={qIndex} className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-blue-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-5 w-5 text-gray-400" />
                    <Badge className="bg-blue-600">Question {qIndex + 1}</Badge>
                  </div>
                  <Button
                    onClick={() => removeQuestion(qIndex)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Question Text *
                    </label>
                    <Textarea
                      placeholder="Enter question..."
                      value={question.question}
                      onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                      rows={3}
                      className="bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {question.options.map((option, optIndex) => (
                      <div key={optIndex} className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Option {String.fromCharCode(65 + optIndex)} *
                          {question.correct_answer === optIndex && (
                            <Badge className="ml-2 bg-green-600">Correct Answer</Badge>
                          )}
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder={`Option ${String.fromCharCode(65 + optIndex)}...`}
                            value={option}
                            onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                            className="bg-white"
                          />
                          <Button
                            onClick={() => updateQuestion(qIndex, 'correct_answer', optIndex)}
                            variant={question.correct_answer === optIndex ? "default" : "outline"}
                            size="sm"
                            className={question.correct_answer === optIndex ? "bg-green-600" : ""}
                          >
                            {question.correct_answer === optIndex ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Explanation (Optional)
                    </label>
                    <Textarea
                      placeholder="Explain the correct answer..."
                      value={question.explanation || ''}
                      onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                      rows={2}
                      className="bg-white"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
