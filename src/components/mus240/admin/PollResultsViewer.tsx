import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, PieChart as PieChartIcon, RefreshCw, Download, Users, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PollResult {
  id: string;
  title: string;
  description?: string;
  questions: any;
  is_active: boolean;
  created_at: string;
  expires_at?: string;
  total_responses: number;
  unique_voters: number;
}

interface VoteOption {
  option_text: string;
  vote_count: number;
  percentage: number;
}

const CHART_COLORS = ['#f59e0b', '#f97316', '#ef4444', '#84cc16', '#06b6d4', '#8b5cf6'];

export const PollResultsViewer = () => {
  const [polls, setPolls] = useState<PollResult[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<string>('');
  const [pollDetails, setPollDetails] = useState<PollResult | null>(null);
  const [votingData, setVotingData] = useState<VoteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const { toast } = useToast();

  useEffect(() => {
    loadPolls();
  }, []);

  useEffect(() => {
    if (selectedPoll) {
      loadPollDetails(selectedPoll);
    }
  }, [selectedPoll]);

  const loadPolls = async () => {
    try {
      const { data, error } = await supabase
        .from('mus240_polls')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const pollsWithStats = data?.map(poll => ({
        ...poll,
        total_responses: 0, // Will be calculated per poll
        unique_voters: 0 // Will be calculated per poll
      })) || [];

      setPolls(pollsWithStats);
      
      if (pollsWithStats.length > 0 && !selectedPoll) {
        setSelectedPoll(pollsWithStats[0].id);
      }
    } catch (error) {
      console.error('Error loading polls:', error);
      toast({
        title: 'Error',
        description: 'Failed to load polls',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPollDetails = async (pollId: string) => {
    try {
      setLoading(true);

      // Get poll details
      const { data: pollData, error: pollError } = await supabase
        .from('mus240_polls')
        .select('*')
        .eq('id', pollId)
        .single();

      if (pollError) throw pollError;

      // Get response counts
      const { data: responseData, error: responseError } = await supabase
        .from('mus240_poll_responses')
        .select('*')
        .eq('poll_id', pollId);

      if (responseError) {
        console.log('Poll responses error:', responseError);
        // Set basic stats if no responses table
        setPollDetails({
          ...pollData,
          total_responses: 0,
          unique_voters: 0
        });
        setVotingData([]);
        return;
      }

      // Calculate response statistics  
      const uniqueVoters = new Set();
      const totalResponses = responseData?.length || 0;

      // For now, show basic stats - detailed question analysis would need more complex parsing
      const basicStats = [{
        option_text: 'Total Responses',
        vote_count: totalResponses,
        percentage: 100
      }];

      setPollDetails({
        ...pollData,
        total_responses: totalResponses,
        unique_voters: uniqueVoters.size
      });

      setVotingData(basicStats);
    } catch (error) {
      console.error('Error loading poll details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load poll details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportResults = () => {
    if (!pollDetails || !votingData) return;

    const csvContent = [
      ['Option', 'Votes', 'Percentage'],
      ...votingData.map(item => [item.option_text, item.vote_count, `${item.percentage}%`])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poll-results-${pollDetails.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && polls.length === 0) {
    return (
      <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading polls...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Poll Selection */}
      <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Poll Results Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Poll</label>
              <Select value={selectedPoll} onValueChange={setSelectedPoll}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a poll to view results" />
                </SelectTrigger>
                <SelectContent>
                  {polls.map(poll => (
                    <SelectItem key={poll.id} value={poll.id}>
                      {poll.title} ({poll.is_active ? 'Active' : 'Inactive'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChartType(chartType === 'bar' ? 'pie' : 'bar')}
                className="flex items-center gap-2"
              >
                {chartType === 'bar' ? <PieChartIcon className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
                {chartType === 'bar' ? 'Pie Chart' : 'Bar Chart'}
              </Button>
              <Button variant="outline" size="sm" onClick={loadPolls}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {pollDetails && (
        <>
          {/* Poll Summary */}
          <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{pollDetails.title}</CardTitle>
                  {pollDetails.description && (
                    <p className="text-gray-600 mt-2">{pollDetails.description}</p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={exportResults}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg">
                  <Users className="h-6 w-6 text-amber-600" />
                  <div>
                    <p className="font-semibold text-lg">{pollDetails.total_responses}</p>
                    <p className="text-sm text-gray-600">Total Responses</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                  <div>
                    <p className="font-semibold text-lg">{pollDetails.unique_voters}</p>
                    <p className="text-sm text-gray-600">Unique Voters</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-lg">{pollDetails.is_active ? 'Active' : 'Inactive'}</p>
                    <p className="text-sm text-gray-600">Status</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Visualization */}
          <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
            <CardHeader>
              <CardTitle>Voting Results</CardTitle>
            </CardHeader>
            <CardContent>
              {votingData.length > 0 ? (
                <div className="space-y-6">
                  {/* Chart */}
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'bar' ? (
                        <BarChart data={votingData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="option_text" 
                            tick={{ fontSize: 12 }}
                            interval={0}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="vote_count" fill="#f59e0b" />
                        </BarChart>
                      ) : (
                        <PieChart>
                          <Pie
                            data={votingData}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="vote_count"
                            label={({ option_text, percentage }) => `${option_text}: ${percentage}%`}
                          >
                            {votingData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  </div>

                  {/* Detailed Results */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Detailed Results</h4>
                    {votingData.map((option, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{option.option_text}</span>
                          <span className="text-sm text-gray-600">
                            {option.vote_count} votes ({option.percentage}%)
                          </span>
                        </div>
                        <Progress value={option.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No votes recorded for this poll yet.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};