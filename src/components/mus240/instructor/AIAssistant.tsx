import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Lightbulb, FileText, BarChart3, Search, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const AIAssistant = () => {
  const [task, setTask] = useState('');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const taskOptions = [
    { value: 'assignment_ideas', label: 'Assignment Ideas', icon: Lightbulb },
    { value: 'rubric_creation', label: 'Rubric Creation', icon: FileText },
    { value: 'grading_assistance', label: 'Grading Assistance', icon: BarChart3 },
    { value: 'research_assistance', label: 'Research Assistance', icon: Search },
    { value: 'poll_creation', label: 'Create Polls', icon: BarChart3 }
  ];

  const quickPrompts = {
    assignment_ideas: [
      "Generate 3 listening journal assignments focusing on blues evolution",
      "Create an assignment comparing hip-hop and jazz improvisation",
      "Design a listening journal about gospel music's influence on soul"
    ],
    rubric_creation: [
      "Create a rubric for evaluating listening journal quality",
      "Design assessment criteria for musical analysis depth",
      "Generate a rubric for cultural context understanding"
    ],
    grading_assistance: [
      "Help me provide constructive feedback on a weak journal entry",
      "Suggest ways to encourage deeper musical analysis",
      "Create feedback templates for common journal issues"
    ],
    research_assistance: [
      "Find sources on African American music's influence on American culture",
      "Suggest multimedia resources for teaching about the Harlem Renaissance",
      "Research connections between spirituals and civil rights movement"
    ],
    poll_creation: [
      "Create polls for Week 1: West African Foundations",
      "Generate polls for Week 5: Blues Development",
      "Create polls for Week 10: Hip-Hop Culture",
      "Generate multiple choice questions about this week's listening assignments"
    ]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !prompt.trim()) {
      toast.error('Please select a task and enter a prompt');
      return;
    }

    setLoading(true);
    setResponse('');

    try {
      const { data, error } = await supabase.functions.invoke('mus240-instructor-assistant', {
        body: { task, prompt }
      });

      if (error) throw error;
      
      setResponse(data.response);
      toast.success('AI assistance completed!');
    } catch (error) {
      console.error('Error getting AI assistance:', error);
      toast.error('Failed to get AI assistance');
    } finally {
      setLoading(false);
    }
  };

  const useQuickPrompt = (quickPrompt: string) => {
    setPrompt(quickPrompt);
  };

  const formatResponse = (text: string) => {
    // Basic formatting for AI responses
    return text.split('\n').map((line, index) => {
      if (line.trim().startsWith('##')) {
        return <h3 key={index} className="text-lg font-semibold mt-4 mb-2">{line.replace('##', '').trim()}</h3>;
      }
      if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
        return <p key={index} className="font-semibold mt-2">{line.replace(/\*\*/g, '').trim()}</p>;
      }
      if (line.trim().startsWith('-')) {
        return <li key={index} className="ml-4">{line.replace('-', '').trim()}</li>;
      }
      if (line.trim()) {
        return <p key={index} className="mb-2">{line}</p>;
      }
      return <br key={index} />;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Brain className="h-6 w-6 text-purple-600" />
          AI Teaching Assistant
        </h2>
        <p className="text-gray-600">Get AI-powered help with course management and pedagogy</p>
      </div>

      {/* Task Selection */}
      <Card>
        <CardHeader>
          <CardTitle>What would you like help with?</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Select value={task} onValueChange={setTask}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a task..." />
                </SelectTrigger>
                <SelectContent>
                  {taskOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Prompts */}
            {task && quickPrompts[task as keyof typeof quickPrompts] && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Quick prompts:</p>
                <div className="space-y-2">
                  {quickPrompts[task as keyof typeof quickPrompts].map((quickPrompt, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-left justify-start h-auto p-2 whitespace-normal"
                      onClick={() => useQuickPrompt(quickPrompt)}
                    >
                      {quickPrompt}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Textarea
                placeholder="Describe what you need help with..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <Button type="submit" disabled={loading || !task || !prompt.trim()}>
              {loading ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Getting AI help...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Get AI Assistance
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* AI Response */}
      {response && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              AI Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              {formatResponse(response)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              Assignment Ideas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Generate creative listening journal assignments that connect music to cultural contexts and encourage critical thinking.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Rubric Creation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Create detailed, fair assessment rubrics with clear criteria and performance levels for music education.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Grading Assistance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Get help providing constructive feedback and creating grading templates that encourage deeper engagement.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-purple-600" />
              Research Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Find scholarly sources, historical contexts, and multimedia resources for teaching African American music.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              Poll Creation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Generate interactive polls and quiz questions based on weekly topics and listening assignments.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};