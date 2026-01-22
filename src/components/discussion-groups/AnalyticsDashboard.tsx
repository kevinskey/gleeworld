import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart3,
  Users,
  MessageSquare,
  Clock,
  AlertTriangle,
  TrendingUp,
  FileText,
  Volume2
} from 'lucide-react';

interface AnalyticsDashboardProps {
  posts: any[];
  students: any[];
  groups: any[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  posts,
  students,
  groups
}) => {
  const analytics = useMemo(() => {
    // Participation metrics
    const studentsWithPosts = new Set(posts.map(p => p.author_id));
    const participationRate = students.length > 0 
      ? (studentsWithPosts.size / students.length) * 100 
      : 0;

    // Post type breakdown
    const individualPosts = posts.filter(p => p.post_type === 'individual');
    const peerResponses = posts.filter(p => p.post_type === 'peer_response');
    const synthesisPosts = posts.filter(p => p.post_type === 'synthesis');

    // Word count distribution
    const wordCounts = posts.map(p => p.word_count || 0);
    const avgWordCount = wordCounts.length > 0 
      ? wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length 
      : 0;
    const minWordCount = wordCounts.length > 0 ? Math.min(...wordCounts) : 0;
    const maxWordCount = wordCounts.length > 0 ? Math.max(...wordCounts) : 0;

    // Silent students (no posts)
    const silentStudents = students.filter(s => !studentsWithPosts.has(s.user_id));

    // Low-effort detection (posts under 100 words)
    const lowEffortPosts = posts.filter(p => (p.word_count || 0) < 100);

    // Redundant language detection (simple word frequency)
    const allText = posts.map(p => p.content || '').join(' ').toLowerCase();
    const words = allText.split(/\s+/).filter(w => w.length > 4);
    const wordFreq: Record<string, number> = {};
    words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
    const repeatedPhrases = Object.entries(wordFreq)
      .filter(([_, count]) => count > 5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Response network (who responded to whom)
    const responseNetwork: Record<string, string[]> = {};
    peerResponses.forEach(response => {
      const parentPost = posts.find(p => p.id === response.parent_post_id);
      if (parentPost && response.author_id !== parentPost.author_id) {
        if (!responseNetwork[response.author_id]) {
          responseNetwork[response.author_id] = [];
        }
        responseNetwork[response.author_id].push(parentPost.author_id);
      }
    });

    // Group activity
    const groupActivity = groups.map(group => {
      const groupPosts = posts.filter(p => p.group_id === group.id);
      const memberCount = group.discussion_group_members?.length || 0;
      const activeMembers = new Set(groupPosts.map(p => p.author_id)).size;
      return {
        name: group.name,
        memberCount,
        activeMembers,
        postCount: groupPosts.length,
        activityRate: memberCount > 0 ? (activeMembers / memberCount) * 100 : 0
      };
    });

    return {
      participationRate,
      totalPosts: posts.length,
      individualPosts: individualPosts.length,
      peerResponses: peerResponses.length,
      synthesisPosts: synthesisPosts.length,
      avgWordCount: Math.round(avgWordCount),
      minWordCount,
      maxWordCount,
      silentStudents,
      lowEffortPosts,
      repeatedPhrases,
      groupActivity
    };
  }, [posts, students, groups]);

  return (
    <div className="space-y-4">
      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Participation</p>
                <p className="text-2xl font-bold">{analytics.participationRate.toFixed(0)}%</p>
              </div>
              <Users className="h-8 w-8 text-primary/30" />
            </div>
            <Progress value={analytics.participationRate} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Posts</p>
                <p className="text-2xl font-bold">{analytics.totalPosts}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-primary/30" />
            </div>
            <div className="flex gap-1 mt-2">
              <Badge variant="outline" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                {analytics.individualPosts}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <MessageSquare className="h-3 w-3 mr-1" />
                {analytics.peerResponses}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {analytics.synthesisPosts}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Word Count</p>
                <p className="text-2xl font-bold">{analytics.avgWordCount}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary/30" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Range: {analytics.minWordCount} - {analytics.maxWordCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Silent Students</p>
                <p className="text-2xl font-bold text-amber-500">{analytics.silentStudents.length}</p>
              </div>
              <Volume2 className="h-8 w-8 text-amber-500/30" />
            </div>
            {analytics.silentStudents.length > 0 && (
              <p className="text-xs text-amber-500 mt-2">Needs attention</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Engagement alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Engagement Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {analytics.silentStudents.length > 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-sm font-medium text-amber-600">Silent Students</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {analytics.silentStudents.slice(0, 5).map(s => (
                        <Badge key={s.user_id} variant="outline" className="text-xs">
                          {s.gw_profiles?.full_name || 'Student'}
                        </Badge>
                      ))}
                      {analytics.silentStudents.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{analytics.silentStudents.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {analytics.lowEffortPosts.length > 0 && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm font-medium text-red-600">Low-Effort Posts</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analytics.lowEffortPosts.length} posts under 100 words
                    </p>
                  </div>
                )}

                {analytics.silentStudents.length === 0 && analytics.lowEffortPosts.length === 0 && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-sm font-medium text-green-600">All Clear!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No engagement issues detected
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Common themes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Trending Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="flex flex-wrap gap-2">
                {analytics.repeatedPhrases.map(([word, count]) => (
                  <Badge 
                    key={word} 
                    variant="secondary"
                    className="text-xs"
                  >
                    {word} ({count})
                  </Badge>
                ))}
                {analytics.repeatedPhrases.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Not enough content to analyze
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Group activity */}
      {groups.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Group Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.groupActivity.map(group => (
                <div key={group.name} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-20">{group.name}</span>
                  <Progress value={group.activityRate} className="flex-1 h-2" />
                  <span className="text-xs text-muted-foreground w-24 text-right">
                    {group.activeMembers}/{group.memberCount} active
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {group.postCount} posts
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
