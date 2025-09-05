import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Plus, Play, Square, BarChart3, Users, Trash2 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { LivePollResults } from './LivePollResults';
import { StudentPollInterface } from './StudentPollInterface';

interface Poll {
  id: string;
  title: string;
  description: string;
  questions: any; // Using any to handle Supabase Json type
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export const Mus240PollSystem = () => {
  const { isAdmin: isUserAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPollTitle, setNewPollTitle] = useState('');
  const [newPollDescription, setNewPollDescription] = useState('');
  const [aiPollPrompt, setAiPollPrompt] = useState('');
  const [generatingPoll, setGeneratingPoll] = useState(false);

  const isAdmin = isUserAdmin() || isSuperAdmin();

  useEffect(() => {
    if (!roleLoading) {
      fetchPolls();
    }
  }, [roleLoading]);

  const fetchPolls = async () => {
    setLoading(true);
    try {
      let query = supabase.from('mus240_polls').select('*');
      
      if (!isAdmin) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setPolls(data || []);
    } catch (error) {
      console.error('Error fetching polls:', error);
      toast.error('Failed to fetch polls');
    } finally {
      setLoading(false);
    }
  };

  const generatePollWithAI = async () => {
    if (!aiPollPrompt.trim()) {
      toast.error('Please enter a prompt for AI poll generation');
      return;
    }

    setGeneratingPoll(true);
    try {
      const { data, error } = await supabase.functions.invoke('mus240-instructor-assistant', {
        body: { 
          task: 'poll_creation', 
          prompt: aiPollPrompt.trim()
        }
      });

      if (error) throw error;

      // Parse the AI response to extract poll data
      const response = data.response;
      let pollData;
      
      try {
        // Try to extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          pollData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON found in response');
        }
      } catch (parseError) {
        toast.error('Failed to parse AI response. Please try again.');
        return;
      }

      // Create the poll
      await createPoll(pollData.title, pollData.description || '', pollData.questions);
      setAiPollPrompt('');
      toast.success('AI-generated poll created successfully!');
    } catch (error) {
      console.error('Error generating poll with AI:', error);
      toast.error('Failed to generate poll with AI');
    } finally {
      setGeneratingPoll(false);
    }
  };

  const createPoll = async (title: string, description: string, questions: any[] = []) => {
    if (!title.trim()) {
      toast.error('Please enter a poll title');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('mus240_polls')
        .insert({
          title: title.trim(),
          description: description.trim(),
          questions: questions,
          is_active: false
        })
        .select()
        .single();

      if (error) throw error;
      setPolls(prev => [data, ...prev]);
      setNewPollTitle('');
      setNewPollDescription('');
      toast.success('Poll created successfully!');
    } catch (error) {
      console.error('Error creating poll:', error);
      toast.error('Failed to create poll');
    }
  };

  const togglePoll = async (pollId: string, isActive: boolean) => {
    try {
      // First, deactivate all other polls
      await supabase
        .from('mus240_polls')
        .update({ is_active: false })
        .neq('id', pollId);

      // Then toggle the selected poll
      const { error } = await supabase
        .from('mus240_polls')
        .update({ is_active: !isActive })
        .eq('id', pollId);

      if (error) throw error;
      
      await fetchPolls();
      toast.success(isActive ? 'Poll stopped' : 'Poll started');
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
        .from('mus240_polls')
        .delete()
        .eq('id', pollId);

      if (error) throw error;
      
      setPolls(prev => prev.filter(poll => poll.id !== pollId));
      toast.success('Poll deleted successfully');
    } catch (error) {
      console.error('Error deleting poll:', error);
      toast.error('Failed to delete poll');
    }
  };

  if (roleLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">MUS 240 Live Poll</h2>
          <p className="text-gray-600">Join the live poll session</p>
        </div>
        <StudentPollInterface />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="manage" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manage">Manage Polls</TabsTrigger>
          <TabsTrigger value="results">Live Results</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-6">
          {/* AI Poll Generator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                AI Poll Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Describe the poll you want to create (e.g., 'Create a poll about Week 5 blues development with questions about B.B. King and Chicago blues')"
                value={aiPollPrompt}
                onChange={(e) => setAiPollPrompt(e.target.value)}
                rows={3}
              />
              <Button 
                onClick={generatePollWithAI}
                disabled={generatingPoll || !aiPollPrompt.trim()}
                className="w-full"
              >
                {generatingPoll ? (
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

          {/* Manual Poll Creation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                Create New Poll
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
              <Button 
                onClick={() => createPoll(newPollTitle, newPollDescription)}
                disabled={!newPollTitle.trim()}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Poll
              </Button>
            </CardContent>
          </Card>

          {/* Existing Polls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                Your Polls
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading polls...</div>
              ) : polls.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No polls created yet. Create your first poll above!
                </div>
              ) : (
                <div className="space-y-4">
                  {polls.map((poll) => (
                    <div key={poll.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{poll.title}</h3>
                            <Badge variant={poll.is_active ? "default" : "secondary"}>
                              {poll.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          {poll.description && (
                            <p className="text-gray-600 text-sm mb-2">{poll.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{Array.isArray(poll.questions) ? poll.questions.length : 0} questions</span>
                            <span>Created {new Date(poll.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => togglePoll(poll.id, poll.is_active)}
                            variant={poll.is_active ? "destructive" : "default"}
                            size="sm"
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
                            onClick={() => deletePoll(poll.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <LivePollResults />
        </TabsContent>
      </Tabs>
    </div>
  );
};