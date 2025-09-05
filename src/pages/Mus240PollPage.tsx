import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  BarChart3, 
  Users, 
  Clock, 
  MessageSquare, 
  CheckCircle, 
  Plus,
  BarChart,
  Vote,
  TrendingUp,
  Eye
} from 'lucide-react';

interface Poll {
  id: string;
  question: string;
  options: string[];
  responses: { [key: string]: number };
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  totalResponses: number;
  userResponse?: string;
}

interface PollResponse {
  pollId: string;
  selectedOption: string;
  userId: string;
}

export const Mus240PollPage = () => {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newPoll, setNewPoll] = useState({
    question: '',
    options: ['', '']
  });
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
      loadPolls();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    try {
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin, role')
        .eq('user_id', user?.id)
        .single();

      setIsAdmin(
        profile?.is_admin || 
        profile?.is_super_admin || 
        ['admin', 'super-admin'].includes(profile?.role)
      );
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const loadPolls = async () => {
    try {
      // Mock data for now - replace with actual database calls
      const mockPolls: Poll[] = [
        {
          id: '1',
          question: 'Which time signature is most challenging for sight-reading?',
          options: ['4/4', '3/4', '6/8', '2/4', '5/4'],
          responses: { '4/4': 2, '3/4': 5, '6/8': 12, '2/4': 1, '5/4': 8 },
          isActive: true,
          createdBy: 'Dr. Johnson',
          createdAt: new Date().toISOString(),
          totalResponses: 28
        },
        {
          id: '2', 
          question: 'What interval do you find most difficult to identify by ear?',
          options: ['Perfect 4th', 'Major 7th', 'Minor 2nd', 'Tritone', 'Perfect 5th'],
          responses: { 'Perfect 4th': 3, 'Major 7th': 15, 'Minor 2nd': 4, 'Tritone': 9, 'Perfect 5th': 1 },
          isActive: true,
          createdBy: 'Dr. Johnson',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          totalResponses: 32
        },
        {
          id: '3',
          question: 'Which mode would you like to study more in depth?',
          options: ['Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Locrian'],
          responses: { 'Dorian': 8, 'Phrygian': 12, 'Lydian': 6, 'Mixolydian': 10, 'Locrian': 4 },
          isActive: false,
          createdBy: 'Dr. Johnson', 
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          totalResponses: 40
        }
      ];

      setPolls(mockPolls);
    } catch (error) {
      console.error('Error loading polls:', error);
      toast.error('Failed to load polls');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId: string, selectedOption: string) => {
    try {
      // Update local state immediately for better UX
      setPolls(prev => prev.map(poll => {
        if (poll.id === pollId) {
          const newResponses = { ...poll.responses };
          newResponses[selectedOption] = (newResponses[selectedOption] || 0) + 1;
          return {
            ...poll,
            responses: newResponses,
            totalResponses: poll.totalResponses + 1,
            userResponse: selectedOption
          };
        }
        return poll;
      }));

      toast.success('Vote recorded successfully!');
    } catch (error) {
      console.error('Error submitting vote:', error);
      toast.error('Failed to submit vote');
    }
  };

  const createPoll = async () => {
    if (!newPoll.question.trim() || newPoll.options.some(opt => !opt.trim())) {
      toast.error('Please fill in all poll fields');
      return;
    }

    try {
      const poll: Poll = {
        id: Date.now().toString(),
        question: newPoll.question,
        options: newPoll.options.filter(opt => opt.trim()),
        responses: {},
        isActive: true,
        createdBy: user?.email || 'Unknown',
        createdAt: new Date().toISOString(),
        totalResponses: 0
      };

      setPolls(prev => [poll, ...prev]);
      setNewPoll({ question: '', options: ['', ''] });
      setShowCreateForm(false);
      toast.success('Poll created successfully!');
    } catch (error) {
      console.error('Error creating poll:', error);
      toast.error('Failed to create poll');
    }
  };

  const addOption = () => {
    setNewPoll(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const updateOption = (index: number, value: string) => {
    setNewPoll(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const removeOption = (index: number) => {
    if (newPoll.options.length > 2) {
      setNewPoll(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <BarChart className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg">Loading MUS 240 polls...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BarChart className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold text-gray-900">MUS 240 Polling System</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Interactive polls for music theory learning and assessment
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <BarChart3 className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{polls.length}</p>
                  <p className="text-sm text-gray-600">Total Polls</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Vote className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{polls.filter(p => p.isActive).length}</p>
                  <p className="text-sm text-gray-600">Active Polls</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Users className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{polls.reduce((sum, poll) => sum + poll.totalResponses, 0)}</p>
                  <p className="text-sm text-gray-600">Total Responses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <TrendingUp className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{Math.round(polls.reduce((sum, poll) => sum + poll.totalResponses, 0) / Math.max(polls.length, 1))}</p>
                  <p className="text-sm text-gray-600">Avg Response Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Controls */}
        {isAdmin && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Instructor Controls
              </CardTitle>
              <CardDescription>
                Create and manage polls for your MUS 240 students
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showCreateForm ? (
                <Button onClick={() => setShowCreateForm(true)} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Poll
                </Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="question">Poll Question</Label>
                    <Textarea
                      id="question"
                      placeholder="Enter your poll question..."
                      value={newPoll.question}
                      onChange={(e) => setNewPoll(prev => ({ ...prev, question: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label>Answer Options</Label>
                    {newPoll.options.map((option, index) => (
                      <div key={index} className="flex gap-2 mt-2">
                        <Input
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                        />
                        {newPoll.options.length > 2 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeOption(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addOption}
                      className="mt-2"
                    >
                      Add Option
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={createPoll}>Create Poll</Button>
                    <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Polls List */}
        <div className="space-y-6">
          {polls.map(poll => (
            <Card key={poll.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl mb-2">{poll.question}</CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span>By {poll.createdBy}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(poll.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {poll.totalResponses} responses
                      </span>
                    </CardDescription>
                  </div>
                  <Badge variant={poll.isActive ? "default" : "secondary"}>
                    {poll.isActive ? "Active" : "Closed"}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                {poll.userResponse ? (
                  // Show results if user has already voted
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600 mb-4">
                      <CheckCircle className="h-5 w-5" />
                      <span>You voted for: {poll.userResponse}</span>
                    </div>
                    
                    <div className="space-y-3">
                      {poll.options.map(option => {
                        const count = poll.responses[option] || 0;
                        const percentage = poll.totalResponses > 0 ? (count / poll.totalResponses) * 100 : 0;
                        
                        return (
                          <div key={option} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className={option === poll.userResponse ? "font-semibold text-green-600" : ""}>
                                {option}
                              </span>
                              <span className="text-sm text-gray-500">
                                {count} votes ({Math.round(percentage)}%)
                              </span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : poll.isActive ? (
                  // Show voting interface if poll is active and user hasn't voted
                  <div className="space-y-4">
                    <RadioGroup onValueChange={(value) => handleVote(poll.id, value)}>
                      {poll.options.map(option => (
                        <div key={option} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`${poll.id}-${option}`} />
                          <Label htmlFor={`${poll.id}-${option}`} className="cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ) : (
                  // Show results for closed polls
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-gray-500 mb-4">
                      <Eye className="h-5 w-5" />
                      <span>Poll Results (Closed)</span>
                    </div>
                    
                    <div className="space-y-3">
                      {poll.options.map(option => {
                        const count = poll.responses[option] || 0;
                        const percentage = poll.totalResponses > 0 ? (count / poll.totalResponses) * 100 : 0;
                        
                        return (
                          <div key={option} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span>{option}</span>
                              <span className="text-sm text-gray-500">
                                {count} votes ({Math.round(percentage)}%)
                              </span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {polls.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <BarChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Polls Available</h3>
              <p className="text-gray-500">
                {isAdmin 
                  ? "Create your first poll to get started with interactive learning!"
                  : "Check back later when your instructor creates new polls."
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};