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
import { LiveQuestionController } from './LiveQuestionController';
import { LiveStudentInterface } from './LiveStudentInterface';

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
  const { isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPollTitle, setNewPollTitle] = useState('');
  const [newPollDescription, setNewPollDescription] = useState('');
  const [aiPollPrompt, setAiPollPrompt] = useState('');
  const [numQuestions, setNumQuestions] = useState(3);
  const [generatingPoll, setGeneratingPoll] = useState(false);
  const [viewMode, setViewMode] = useState<'student' | 'admin'>('student');

  const hasAdminAccess = isAdmin() || isSuperAdmin();

  useEffect(() => {
    if (!roleLoading) {
      fetchPolls();
    }
  }, [roleLoading]);

  const fetchPolls = async () => {
    setLoading(true);
    try {
      let query = supabase.from('mus240_polls').select('*');
      
      if (!hasAdminAccess) {
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
    console.log('Starting AI poll generation...');
    
    try {
      // First, test if the edge function is reachable with a simple ping
      console.log('Testing edge function connectivity...');
      
      const testResponse = await supabase.functions.invoke('mus240-instructor-assistant', {
        body: { 
          task: 'test', 
          prompt: 'test'
        }
      });
      
      console.log('Test response:', testResponse);
      
      // If test fails, don't proceed
      if (testResponse.error) {
        console.error('Edge function not reachable:', testResponse.error);
        throw new Error('Edge function connectivity issue');
      }

      // Now make the actual request
      console.log('Making actual AI poll request...');
      const { data, error } = await supabase.functions.invoke('mus240-instructor-assistant', {
        body: { 
          task: 'poll_creation', 
          prompt: `${aiPollPrompt.trim()}. Create exactly ${numQuestions} questions.`
        }
      });

      console.log('AI poll response received:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (!data || !data.response) {
        console.error('No response data received:', data);
        throw new Error('No response data received');
      }

      // Parse the AI response to extract poll data
      const response = data.response;
      console.log('Raw response:', response);
      let pollData;
      
      try {
        // If response is already a parsed object
        if (typeof response === 'object') {
          pollData = response;
        } else if (typeof response === 'string') {
          // Try parsing as JSON directly first
          try {
            pollData = JSON.parse(response);
          } catch {
            // Try to extract JSON from the response string
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              pollData = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error('No valid JSON found in response');
            }
          }
        } else {
          throw new Error('Unexpected response format');
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response that failed to parse:', response);
        toast.error('Failed to parse AI response. Please try again.');
        return;
      }

      console.log('Parsed poll data:', pollData);

      // Validate poll data structure
      if (!pollData.title || !pollData.questions || !Array.isArray(pollData.questions)) {
        console.error('Invalid poll data structure:', pollData);
        throw new Error('Invalid poll data structure received');
      }

      // Create the poll
      await createPoll(pollData.title, pollData.description || '', pollData.questions);
      setAiPollPrompt('');
      toast.success('AI-generated poll created successfully!');
      console.log('AI poll generation completed successfully');
    } catch (error) {
      console.error('Error generating poll with AI:', error);
      
      // More specific error messages
      if (error.message.includes('timeout') || error.message.includes('Failed to fetch')) {
        toast.error('Connection timeout. Please check your internet connection and try again.');
      } else if (error.message.includes('Edge Function') || error.message.includes('connectivity')) {
        toast.error('Service temporarily unavailable. The AI service may be restarting. Please wait a moment and try again.');
      } else if (error.message.includes('OpenAI') || error.message.includes('API')) {
        toast.error('AI service error. Please try again with a different prompt.');
      } else {
        toast.error('Failed to generate poll with AI. Please try again.');
      }
    } finally {
      setGeneratingPoll(false);
      console.log('AI poll generation process ended');
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

  // Show student view for non-admins or when admin chooses student view
  if (!hasAdminAccess || viewMode === 'student') {
    return (
      <div className="space-y-6 bg-white/95 backdrop-blur-sm p-8 rounded-3xl shadow-2xl border border-white/30">
        {hasAdminAccess && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setViewMode('admin')}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 font-medium shadow-lg"
            >
              Switch to Admin View
            </button>
          </div>
        )}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">MUS 240 Live Poll</h2>
          <p className="text-lg text-gray-600">Join the live poll session</p>
        </div>
        <LiveStudentInterface />
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white/95 backdrop-blur-sm p-8 rounded-3xl shadow-2xl border border-white/30">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Admin Poll Management</h2>
        <button
          onClick={() => setViewMode('student')}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 font-medium shadow-lg"
        >
          Switch to Student View
        </button>
      </div>
      <Tabs defaultValue="manage" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manage">Manage Polls</TabsTrigger>
          <TabsTrigger value="results">Live Results</TabsTrigger>
          <TabsTrigger value="student">Student View</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-6">
          {/* AI Poll Generator */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-2xl border border-purple-200 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">AI Poll Generator</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <Textarea
                    placeholder="Describe the poll you want to create (e.g., 'Create a poll about Week 5 blues development with questions about B.B. King and Chicago blues')"
                    value={aiPollPrompt}
                    onChange={(e) => setAiPollPrompt(e.target.value)}
                    rows={3}
                    className="border-purple-200 focus:border-purple-400 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Questions</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(parseInt(e.target.value) || 3)}
                    className="w-full border-purple-200 focus:border-purple-400 rounded-xl"
                  />
                  <p className="text-xs text-gray-500">Number of questions (1-10)</p>
                </div>
              </div>
              <button 
                onClick={generatePollWithAI}
                disabled={generatingPoll || !aiPollPrompt.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generatingPoll ? (
                  <>
                    <Brain className="h-5 w-5 animate-pulse" />
                    Generating Poll...
                  </>
                ) : (
                  <>
                    <Brain className="h-5 w-5" />
                    Generate Poll with AI
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Manual Poll Creation */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-2xl border border-blue-200 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Create New Poll</h3>
            </div>
            <div className="space-y-4">
              <Input
                placeholder="Poll title..."
                value={newPollTitle}
                onChange={(e) => setNewPollTitle(e.target.value)}
                className="border-blue-200 focus:border-blue-400 rounded-xl"
              />
              <Textarea
                placeholder="Poll description (optional)..."
                value={newPollDescription}
                onChange={(e) => setNewPollDescription(e.target.value)}
                rows={2}
                className="border-blue-200 focus:border-blue-400 rounded-xl"
              />
              <button 
                onClick={() => createPoll(newPollTitle, newPollDescription)}
                disabled={!newPollTitle.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl hover:from-blue-600 hover:to-cyan-700 transition-all duration-300 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Create Poll
              </button>
            </div>
          </div>

          {/* Existing Polls */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Your Polls</h3>
            </div>
            <div>
              {loading ? (
                <div className="text-center py-8 text-gray-600">Loading polls...</div>
              ) : polls.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-white/50 rounded-xl border-2 border-dashed border-gray-300">
                  No polls created yet. Create your first poll above!
                </div>
              ) : (
                <div className="space-y-4">
                  {polls.map((poll) => (
                    <div key={poll.id} className="bg-white/80 backdrop-blur-sm border border-white/30 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="text-xl font-semibold text-gray-900">{poll.title}</h4>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              poll.is_active 
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white animate-pulse' 
                                : 'bg-gray-200 text-gray-700'
                            }`}>
                              {poll.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          {poll.description && (
                            <p className="text-gray-600 text-sm mb-3">{poll.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{Array.isArray(poll.questions) ? poll.questions.length : 0} questions</span>
                            <span>Created {new Date(poll.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => togglePoll(poll.id, poll.is_active)}
                            className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 shadow-lg flex items-center gap-2 ${
                              poll.is_active 
                                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700' 
                                : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700'
                            }`}
                          >
                            {poll.is_active ? (
                              <>
                                <Square className="h-4 w-4" />
                                Stop
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4" />
                                Start
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => deletePoll(poll.id)}
                            className="px-3 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl transition-all duration-300 shadow-sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="results">
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-3xl shadow-2xl border border-white/30">
            {polls.find(p => p.is_active) ? (
              <LiveQuestionController 
                poll={polls.find(p => p.is_active)! as any} 
                onPollUpdate={(updatedPoll) => {
                  setPolls(prev => prev.map(p => p.id === updatedPoll.id ? { ...p, ...updatedPoll } : p));
                }}
              />
            ) : (
              <div className="text-center py-8 text-gray-600">
                No active poll for live control
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="student">
          <div className="space-y-6 bg-white/95 backdrop-blur-sm p-8 rounded-3xl shadow-2xl border border-white/30">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Student Experience Preview</h2>
              <p className="text-lg text-gray-600">This is what students see when they join polls</p>
            </div>
            <StudentPollInterface />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};