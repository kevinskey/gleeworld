import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Play, Square, Trash2, Edit, BarChart3, RefreshCw, 
  Radio, Users, Brain, ChevronDown, ChevronUp, CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PollQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
}

interface Poll {
  id: string;
  course_id: string;
  semester: string;
  title: string;
  description: string | null;
  questions: PollQuestion[];
  is_active: boolean;
  is_live_session: boolean | null;
  current_question_index: number | null;
  show_results: boolean | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface CoursePollManagerProps {
  courseId: string;
  courseName: string;
}

export const CoursePollManager: React.FC<CoursePollManagerProps> = ({ courseId, courseName }) => {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPollTitle, setNewPollTitle] = useState('');
  const [newPollDescription, setNewPollDescription] = useState('');
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
  const [expandedPoll, setExpandedPoll] = useState<string | null>(null);
  
  // AI generation state
  const [aiPrompt, setAiPrompt] = useState('');
  const [numQuestions, setNumQuestions] = useState(3);
  const [generatingAI, setGeneratingAI] = useState(false);

  const currentSemester = 'Spring 2025'; // Could be made dynamic

  useEffect(() => {
    fetchPolls();
  }, [courseId]);

  const fetchPolls = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_academy_polls')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse questions from JSON for each poll
      const parsedPolls = (data || []).map(poll => ({
        ...poll,
        questions: Array.isArray(poll.questions) ? (poll.questions as unknown as PollQuestion[]) : []
      }));
      
      setPolls(parsedPolls);
    } catch (error) {
      console.error('Error fetching polls:', error);
      toast.error('Failed to fetch polls');
    } finally {
      setLoading(false);
    }
  };

  const createPoll = async () => {
    if (!newPollTitle.trim()) {
      toast.error('Please enter a poll title');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gw_academy_polls')
        .insert({
          course_id: courseId,
          semester: currentSemester,
          title: newPollTitle.trim(),
          description: newPollDescription.trim() || null,
          questions: [],
          is_active: false,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      
      setPolls(prev => [{
        ...data,
        questions: []
      }, ...prev]);
      setNewPollTitle('');
      setNewPollDescription('');
      toast.success('Poll created successfully!');
      
      // Open editor for the new poll
      setEditingPoll({
        ...data,
        questions: []
      });
    } catch (error) {
      console.error('Error creating poll:', error);
      toast.error('Failed to create poll');
    }
  };

  const togglePoll = async (pollId: string, currentlyActive: boolean) => {
    try {
      // Deactivate all other polls first if activating
      if (!currentlyActive) {
        await supabase
          .from('gw_academy_polls')
          .update({ is_active: false, is_live_session: false })
          .eq('course_id', courseId)
          .neq('id', pollId);
      }

      const { error } = await supabase
        .from('gw_academy_polls')
        .update({ 
          is_active: !currentlyActive,
          is_live_session: !currentlyActive 
        })
        .eq('id', pollId);

      if (error) throw error;
      
      await fetchPolls();
      toast.success(currentlyActive ? 'Poll deactivated' : 'Poll activated');
    } catch (error) {
      console.error('Error toggling poll:', error);
      toast.error('Failed to toggle poll');
    }
  };

  const deletePoll = async (pollId: string) => {
    if (!confirm('Are you sure you want to delete this poll? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('gw_academy_polls')
        .delete()
        .eq('id', pollId);

      if (error) throw error;
      
      setPolls(prev => prev.filter(p => p.id !== pollId));
      toast.success('Poll deleted successfully');
    } catch (error) {
      console.error('Error deleting poll:', error);
      toast.error('Failed to delete poll');
    }
  };

  const savePollQuestions = async (pollId: string, questions: PollQuestion[]) => {
    try {
      const { error } = await supabase
        .from('gw_academy_polls')
        .update({ questions: questions as any })
        .eq('id', pollId);

      if (error) throw error;
      
      setPolls(prev => prev.map(p => 
        p.id === pollId ? { ...p, questions } : p
      ));
      toast.success('Poll saved successfully!');
      setEditingPoll(null);
    } catch (error) {
      console.error('Error saving poll:', error);
      toast.error('Failed to save poll');
    }
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a prompt for AI poll generation');
      return;
    }

    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('mus240-instructor-assistant', {
        body: { 
          task: 'poll_creation', 
          prompt: `For the course "${courseName}": ${aiPrompt.trim()}. Create exactly ${numQuestions} questions.`
        }
      });

      if (error) throw error;

      if (!data || !data.response) {
        throw new Error('No response data received');
      }

      // Parse the AI response
      let pollData;
      const response = data.response;
      
      if (typeof response === 'object') {
        pollData = response;
      } else if (typeof response === 'string') {
        try {
          pollData = JSON.parse(response);
        } catch {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            pollData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No valid JSON found in response');
          }
        }
      }

      if (!pollData.title || !pollData.questions) {
        throw new Error('Invalid poll data structure');
      }

      // Create the poll with AI-generated content
      const { data: newPoll, error: insertError } = await supabase
        .from('gw_academy_polls')
        .insert({
          course_id: courseId,
          semester: currentSemester,
          title: pollData.title,
          description: pollData.description || '',
          questions: pollData.questions,
          is_active: false,
          created_by: user?.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setPolls(prev => [{
        ...newPoll,
        questions: pollData.questions
      }, ...prev]);
      
      setAiPrompt('');
      toast.success('AI-generated poll created successfully!');
    } catch (error) {
      console.error('Error generating poll with AI:', error);
      toast.error('Failed to generate poll with AI. Please try again.');
    } finally {
      setGeneratingAI(false);
    }
  };

  if (editingPoll) {
    return (
      <PollQuestionEditor
        poll={editingPoll}
        onSave={(questions) => savePollQuestions(editingPoll.id, questions)}
        onCancel={() => setEditingPoll(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Polls & Quizzes</h2>
          <p className="text-muted-foreground">Create and manage polls for {courseName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPolls}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* AI Poll Generator */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
            <Brain className="h-5 w-5" />
            AI Poll Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <Textarea
                placeholder={`Describe the poll you want to create (e.g., "Create a quiz about ${courseName} key concepts")`}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={2}
                className="border-purple-200 focus:border-purple-400 text-base"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Questions</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value) || 3)}
                className="border-purple-200 focus:border-purple-400"
              />
            </div>
          </div>
          <Button 
            onClick={generateWithAI}
            disabled={generatingAI || !aiPrompt.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {generatingAI ? (
              <>
                <Brain className="h-4 w-4 mr-2 animate-pulse" />
                Generating Poll...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Generate Poll with AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Create New Poll */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Poll Manually
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Poll title..."
            value={newPollTitle}
            onChange={(e) => setNewPollTitle(e.target.value)}
          />
          <Textarea
            placeholder="Poll description (optional)..."
            value={newPollDescription}
            onChange={(e) => setNewPollDescription(e.target.value)}
            rows={2}
          />
          <Button onClick={createPoll} disabled={!newPollTitle.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Create Poll
          </Button>
        </CardContent>
      </Card>

      {/* Polls List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Manage Polls ({polls.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading polls...</div>
          ) : polls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              No polls created yet. Create your first poll above!
            </div>
          ) : (
            <div className="space-y-3">
              {polls.map((poll) => (
                <div
                  key={poll.id}
                  className="border rounded-lg bg-card overflow-hidden"
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{poll.title}</h4>
                        {poll.is_active && (
                          <Badge variant="default" className="bg-green-500">
                            Active
                          </Badge>
                        )}
                        {poll.is_live_session && (
                          <Badge variant="secondary">
                            <Radio className="h-3 w-3 mr-1 animate-pulse" />
                            Live
                          </Badge>
                        )}
                      </div>
                      {poll.description && (
                        <p className="text-sm text-muted-foreground">{poll.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {poll.questions.length} question{poll.questions.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedPoll(expandedPoll === poll.id ? null : poll.id)}
                      >
                        {expandedPoll === poll.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPoll(poll)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={poll.is_active ? "secondary" : "default"}
                        size="sm"
                        onClick={() => togglePoll(poll.id, poll.is_active)}
                      >
                        {poll.is_active ? (
                          <>
                            <Square className="h-4 w-4 mr-1" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Start
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePoll(poll.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded View - Show Questions */}
                  {expandedPoll === poll.id && poll.questions.length > 0 && (
                    <div className="border-t bg-muted/30 p-4">
                      <div className="space-y-3">
                        {poll.questions.map((q, idx) => (
                          <div key={idx} className="bg-background p-3 rounded-lg">
                            <p className="font-medium text-sm mb-2">
                              {idx + 1}. {q.question}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {q.options.map((opt, optIdx) => (
                                <div 
                                  key={optIdx}
                                  className={`text-xs p-2 rounded ${
                                    optIdx === q.correct_answer 
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                                      : 'bg-muted'
                                  }`}
                                >
                                  {optIdx === q.correct_answer && (
                                    <CheckCircle2 className="h-3 w-3 inline mr-1" />
                                  )}
                                  {opt}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Question Editor Component
interface PollQuestionEditorProps {
  poll: Poll;
  onSave: (questions: PollQuestion[]) => void;
  onCancel: () => void;
}

const PollQuestionEditor: React.FC<PollQuestionEditorProps> = ({ poll, onSave, onCancel }) => {
  const [questions, setQuestions] = useState<PollQuestion[]>(
    poll.questions.length > 0 ? poll.questions : [{
      question: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      explanation: ''
    }]
  );

  const addQuestion = () => {
    setQuestions([...questions, {
      question: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      explanation: ''
    }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, field: keyof PollQuestion, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    const newOptions = [...updated[qIndex].options];
    newOptions[optIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options: newOptions };
    setQuestions(updated);
  };

  const handleSave = () => {
    // Validate
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question.trim()) {
        toast.error(`Question ${i + 1} is empty`);
        return;
      }
      if (questions[i].options.some(opt => !opt.trim())) {
        toast.error(`All options for Question ${i + 1} must be filled`);
        return;
      }
    }
    onSave(questions);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Edit: {poll.title}</h2>
          <p className="text-muted-foreground">Add questions to your poll</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave}>Save Poll</Button>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, qIndex) => (
          <Card key={qIndex}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Question {qIndex + 1}</CardTitle>
                {questions.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(qIndex)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter your question..."
                value={q.question}
                onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                rows={2}
              />
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Options (click to set correct answer)</p>
                {q.options.map((opt, optIndex) => (
                  <div key={optIndex} className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={q.correct_answer === optIndex ? "default" : "outline"}
                      size="sm"
                      className="shrink-0"
                      onClick={() => updateQuestion(qIndex, 'correct_answer', optIndex)}
                    >
                      {String.fromCharCode(65 + optIndex)}
                    </Button>
                    <Input
                      placeholder={`Option ${String.fromCharCode(65 + optIndex)}...`}
                      value={opt}
                      onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                      className={q.correct_answer === optIndex ? 'border-green-500' : ''}
                    />
                  </div>
                ))}
              </div>

              <Textarea
                placeholder="Explanation (optional) - shown after answering"
                value={q.explanation || ''}
                onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                rows={2}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={addQuestion} variant="outline" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Question
      </Button>
    </div>
  );
};
