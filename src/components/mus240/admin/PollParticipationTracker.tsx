import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Trophy, TrendingUp, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Poll {
  id: string;
  title: string;
  created_at: string;
  is_active: boolean;
}

interface ParticipationStat {
  student_id: string;
  student_name: string;
  student_email: string;
  response_count: number;
  points_awarded: number;
}

export const PollParticipationTracker = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<string>('');
  const [participationStats, setParticipationStats] = useState<ParticipationStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalParticipation, setTotalParticipation] = useState(0);

  useEffect(() => {
    loadPolls();
  }, []);

  useEffect(() => {
    if (selectedPoll) {
      loadParticipationStats(selectedPoll);
    }
  }, [selectedPoll]);

  const loadPolls = async () => {
    try {
      const { data, error } = await supabase
        .from('mus240_polls')
        .select('id, title, created_at, is_active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPolls(data || []);
      
      if (data && data.length > 0) {
        setSelectedPoll(data[0].id);
      }
    } catch (error) {
      console.error('Error loading polls:', error);
      toast.error('Failed to load polls');
    }
  };

  const loadParticipationStats = async (pollId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_poll_participation_stats', {
        poll_id_param: pollId
      });

      if (error) throw error;
      
      setParticipationStats(data || []);
      setTotalParticipation(data?.length || 0);
    } catch (error) {
      console.error('Error loading participation stats:', error);
      toast.error('Failed to load participation stats');
    } finally {
      setLoading(false);
    }
  };

  const selectedPollData = polls.find(p => p.id === selectedPoll);
  const totalResponses = participationStats.reduce((sum, stat) => sum + Number(stat.response_count), 0);
  const averageResponsesPerStudent = totalParticipation > 0 ? (totalResponses / totalParticipation).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600" />
            Poll Participation Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Poll</label>
              <Select value={selectedPoll} onValueChange={setSelectedPoll}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a poll to view participation" />
                </SelectTrigger>
                <SelectContent>
                  {polls.map(poll => (
                    <SelectItem key={poll.id} value={poll.id}>
                      {poll.title} {poll.is_active && '(Active)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPollData && (
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>Created: {new Date(selectedPollData.created_at).toLocaleDateString()}</span>
                <Badge variant={selectedPollData.is_active ? "default" : "secondary"}>
                  {selectedPollData.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{totalParticipation}</p>
              <p className="text-sm text-muted-foreground">Students Participated</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{totalResponses}</p>
              <p className="text-sm text-muted-foreground">Total Responses</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <Award className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-2xl font-bold">{averageResponsesPerStudent}</p>
              <p className="text-sm text-muted-foreground">Avg Responses/Student</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Participation Details */}
      <Card>
        <CardHeader>
          <CardTitle>Student Participation Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading participation stats...</p>
            </div>
          ) : participationStats.length > 0 ? (
            <div className="space-y-4">
              {participationStats.map((stat, index) => (
                <div key={stat.student_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{stat.student_name}</p>
                      <p className="text-sm text-muted-foreground">{stat.student_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">{stat.response_count} responses</p>
                      <p className="text-sm text-muted-foreground">
                        {stat.points_awarded} participation {Number(stat.points_awarded) === 1 ? 'point' : 'points'}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      +{stat.points_awarded}pts
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No participation data available for this poll.</p>
              <p className="text-sm mt-1">Students will appear here once they submit responses.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Award className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Automatic Participation Credit</p>
              <p>Students automatically receive 1 participation point each time they respond to a poll question. These points are added to their semester participation grade.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};