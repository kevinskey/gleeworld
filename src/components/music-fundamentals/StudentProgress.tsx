import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Trophy, TrendingUp, Target, Calendar, Star, Music } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ProgressData {
  totalAssignments: number;
  completedAssignments: number;
  averageScore: number;
  recentScores: Array<{ date: string; score: number; assignment: string; }>;
  sightSingingProgress: Array<{ date: string; score: number; difficulty: string; }>;
  gradeDistribution: Array<{ grade: string; count: number; }>;
}

export const StudentProgress: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProgressData();
    }
  }, [user]);

  const fetchProgressData = async () => {
    if (!user) return;

    try {
      // Fetch assignments and submissions
      const [assignmentsRes, submissionsRes, recordingsRes] = await Promise.all([
        supabase
          .from('music_fundamentals_assignments')
          .select('*')
          .eq('is_active', true),
        supabase
          .from('music_fundamentals_submissions')
          .select('*')
          .eq('student_id', user.id),
        supabase
          .from('sight_singing_recordings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      const assignments = assignmentsRes.data || [];
      const submissions = submissionsRes.data || [];
      const recordings = recordingsRes.data || [];

      // Calculate statistics
      const completedAssignments = submissions.filter(s => s.status === 'graded').length;
      const scores = submissions.filter(s => s.score !== null).map(s => s.score!);
      const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

      // Recent scores for chart
      const recentScores = submissions
        .filter(s => s.score !== null)
        .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
        .slice(0, 10)
        .map(s => ({
          date: new Date(s.submitted_at).toLocaleDateString(),
          score: s.score!,
          assignment: `Assignment ${s.assignment_id.slice(0, 8)}`
        }))
        .reverse();

      // Sight singing progress (using available columns)
      const sightSingingProgress = recordings.map(r => ({
        date: new Date(r.created_at).toLocaleDateString(),
        score: 85, // Placeholder score
        difficulty: 'beginner' // Placeholder difficulty
      }));

      // Grade distribution
      const gradeDistribution = [
        { grade: 'A (90-100)', count: scores.filter(s => s >= 90).length },
        { grade: 'B (80-89)', count: scores.filter(s => s >= 80 && s < 90).length },
        { grade: 'C (70-79)', count: scores.filter(s => s >= 70 && s < 80).length },
        { grade: 'D (60-69)', count: scores.filter(s => s >= 60 && s < 70).length },
        { grade: 'F (0-59)', count: scores.filter(s => s < 60).length },
      ];

      setProgressData({
        totalAssignments: assignments.length,
        completedAssignments,
        averageScore,
        recentScores,
        sightSingingProgress,
        gradeDistribution
      });

    } catch (error) {
      console.error('Error fetching progress data:', error);
      toast({
        title: "Error",
        description: "Failed to load progress data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (!progressData) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">No progress data available</p>
          <p className="text-muted-foreground">Complete some assignments to see your progress.</p>
        </CardContent>
      </Card>
    );
  }

  const completionPercentage = progressData.totalAssignments > 0 
    ? (progressData.completedAssignments / progressData.totalAssignments) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Completion Rate</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{completionPercentage.toFixed(1)}%</div>
              <Progress value={completionPercentage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {progressData.completedAssignments} of {progressData.totalAssignments} assignments
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-medium">Average Score</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{progressData.averageScore.toFixed(1)}</div>
              <Badge variant={progressData.averageScore >= 80 ? "default" : "secondary"} className="mt-2">
                {progressData.averageScore >= 90 ? 'Excellent' :
                 progressData.averageScore >= 80 ? 'Good' :
                 progressData.averageScore >= 70 ? 'Fair' : 'Needs Improvement'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium">Sight Singing</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{progressData.sightSingingProgress.length}</div>
              <p className="text-xs text-muted-foreground">recordings completed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Trend</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">
                {progressData.recentScores.length >= 2 ? 
                  (progressData.recentScores[progressData.recentScores.length - 1].score > 
                   progressData.recentScores[progressData.recentScores.length - 2].score ? '↗' : '↘') 
                  : '—'}
              </div>
              <p className="text-xs text-muted-foreground">recent performance</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Scores Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Assignment Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {progressData.recentScores.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={progressData.recentScores}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    dot={{ fill: '#8884d8' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No score data available yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Grade Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {progressData.gradeDistribution.some(g => g.count > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={progressData.gradeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No grade data available yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sight Singing Progress */}
      {progressData.sightSingingProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Sight Singing Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={progressData.sightSingingProgress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  dot={{ fill: '#82ca9d' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};