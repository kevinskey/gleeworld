import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Users, CheckCircle, Award, TrendingUp, BookOpen, Link as LinkIcon, StickyNote, Beaker } from 'lucide-react';

interface GroupAnalysis {
  id: string;
  name: string;
  description: string;
  member_count: number;
  max_members: number;
  leader_id: string;
  activity_score: number;
  participation_points: number;
  members: {
    user_id: string;
    full_name: string;
    role: string;
    individual_score: number;
  }[];
  metrics: {
    notes_count: number;
    links_count: number;
    sandboxes_count: number;
    recent_activity: boolean;
    collaboration_level: 'high' | 'medium' | 'low';
  };
}

interface Props {
  onCreditAwarded?: () => void;
}

export const GroupParticipationAnalyzer: React.FC<Props> = ({ onCreditAwarded }) => {
  const [groups, setGroups] = useState<GroupAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [awarding, setAwarding] = useState(false);

  const analyzeGroups = async () => {
    setAnalyzing(true);
    try {
      // Fetch all groups with members
      const { data: groupsData, error: groupsError } = await supabase
        .from('mus240_project_groups')
        .select(`
          *,
          members:mus240_group_memberships(
            member_id,
            role,
            gw_profiles!member_id(
              user_id,
              full_name
            )
          )
        `)
        .eq('semester', 'Fall 2025');

      if (groupsError) throw groupsError;

      const analysisResults: GroupAnalysis[] = [];

      for (const group of groupsData) {
        // Calculate activity metrics for each group
        const [notesResult, linksResult, sandboxesResult] = await Promise.all([
          supabase.from('mus240_group_notes')
            .select('id, created_at')
            .eq('group_id', group.id),
          supabase.from('mus240_group_links')
            .select('id, created_at')
            .eq('group_id', group.id),
          supabase.from('mus240_group_sandboxes')
            .select('id, created_at')
            .eq('group_id', group.id)
        ]);

        const notes_count = notesResult.data?.length || 0;
        const links_count = linksResult.data?.length || 0;
        const sandboxes_count = sandboxesResult.data?.length || 0;

        // Check for recent activity (within last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentNotes = notesResult.data?.filter(note => 
          new Date(note.created_at) > sevenDaysAgo
        ).length || 0;
        const recentLinks = linksResult.data?.filter(link => 
          new Date(link.created_at) > sevenDaysAgo
        ).length || 0;
        const recentSandboxes = sandboxesResult.data?.filter(sandbox => 
          new Date(sandbox.created_at) > sevenDaysAgo
        ).length || 0;

        const recent_activity = (recentNotes + recentLinks + recentSandboxes) > 0;
        const total_content = notes_count + links_count + sandboxes_count;

        // Calculate activity score (0-100)
        let activity_score = 0;
        activity_score += Math.min(notes_count * 5, 25); // Up to 25 points for notes
        activity_score += Math.min(links_count * 3, 15); // Up to 15 points for links  
        activity_score += Math.min(sandboxes_count * 10, 30); // Up to 30 points for sandboxes
        activity_score += recent_activity ? 10 : 0; // 10 points for recent activity
        activity_score += group.member_count >= 3 ? 20 : 0; // 20 points for adequate membership

        // Determine collaboration level
        let collaboration_level: 'high' | 'medium' | 'low' = 'low';
        if (activity_score >= 70 && total_content >= 10) collaboration_level = 'high';
        else if (activity_score >= 40 && total_content >= 5) collaboration_level = 'medium';

        // Calculate participation points to award
        let participation_points = 0;
        if (collaboration_level === 'high') participation_points = 15;
        else if (collaboration_level === 'medium') participation_points = 10;
        else if (activity_score >= 20) participation_points = 5;

        // Calculate individual member scores
        const memberAnalysis = (group.members || []).map(member => ({
          user_id: member.gw_profiles?.user_id || member.member_id,
          full_name: member.gw_profiles?.full_name || 'Unknown',
          role: member.role,
          individual_score: participation_points
        }));

        analysisResults.push({
          id: group.id,
          name: group.name,
          description: group.description,
          member_count: group.member_count,
          max_members: group.max_members,
          leader_id: group.leader_id,
          activity_score,
          participation_points,
          members: memberAnalysis,
          metrics: {
            notes_count,
            links_count,
            sandboxes_count,
            recent_activity,
            collaboration_level
          }
        });
      }

      setGroups(analysisResults);
      toast.success(`Analyzed ${analysisResults.length} groups`);
    } catch (error) {
      console.error('Error analyzing groups:', error);
      toast.error('Failed to analyze groups');
    } finally {
      setAnalyzing(false);
    }
  };

  const awardParticipationCredits = async () => {
    setAwarding(true);
    try {
      const updates = [];
      
      for (const group of groups) {
        if (group.participation_points > 0) {
          for (const member of group.members) {
            updates.push({
              student_id: member.user_id,
              semester: 'Fall 2025',
              points_earned: group.participation_points,
              source: 'group_participation',
              notes: `Group work participation: ${group.name} (${group.metrics.collaboration_level} collaboration)`
            });
          }
        }
      }

      if (updates.length === 0) {
        toast.info('No participation credits to award');
        return;
      }

      // Upsert participation grades
      for (const update of updates) {
        const { error } = await supabase.from('mus240_participation_grades')
          .upsert({
            ...update,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'student_id,semester,source'
          });

        if (error) throw error;
      }

      toast.success(`Awarded participation credits to ${updates.length} students`);
      onCreditAwarded?.();
    } catch (error) {
      console.error('Error awarding credits:', error);
      toast.error('Failed to award participation credits');
    } finally {
      setAwarding(false);
    }
  };

  const getCollaborationColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-100 text-green-800 border-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  const totalStudentsWithCredits = groups.reduce((sum, group) => 
    sum + (group.participation_points > 0 ? group.members.length : 0), 0
  );
  const totalCreditsToAward = groups.reduce((sum, group) => 
    sum + (group.participation_points * group.members.length), 0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Group Participation Analysis</h2>
          <p className="text-slate-600">Evaluate group activity and award participation credits</p>
        </div>
        <div className="space-x-2">
          <Button 
            onClick={analyzeGroups} 
            disabled={analyzing}
            variant="outline"
          >
            {analyzing ? 'Analyzing...' : 'Analyze Groups'}
          </Button>
          {groups.length > 0 && (
            <Button 
              onClick={awardParticipationCredits}
              disabled={awarding}
              className="bg-green-600 hover:bg-green-700"
            >
              {awarding ? 'Awarding...' : `Award Credits (${totalStudentsWithCredits} students)`}
            </Button>
          )}
        </div>
      </div>

      {groups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Credit Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">{groups.length}</div>
                <div className="text-sm text-slate-600">Groups Analyzed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{totalStudentsWithCredits}</div>
                <div className="text-sm text-slate-600">Students Eligible</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalCreditsToAward}</div>
                <div className="text-sm text-slate-600">Total Points</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {groups.map(group => (
          <Card key={group.id} className="border border-slate-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  <CardDescription className="mt-1">{group.description}</CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={getCollaborationColor(group.metrics.collaboration_level)}>
                    {group.metrics.collaboration_level} collaboration
                  </Badge>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900">{group.participation_points}</div>
                    <div className="text-xs text-slate-600">points each</div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Activity Metrics */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">{group.metrics.notes_count} Notes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">{group.metrics.links_count} Links</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Beaker className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">{group.metrics.sandboxes_count} Sandboxes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    <span className={`text-sm font-medium ${group.metrics.recent_activity ? 'text-green-600' : 'text-red-600'}`}>
                      {group.metrics.recent_activity ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Activity Score */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Activity Score</span>
                    <span>{group.activity_score}/100</span>
                  </div>
                  <Progress value={group.activity_score} className="h-2" />
                </div>

                {/* Members */}
                <div>
                  <h4 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Members ({group.member_count}/{group.max_members})
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {group.members.map(member => (
                      <div key={member.user_id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <div>
                          <div className="font-medium text-sm">{member.full_name}</div>
                          <div className="text-xs text-slate-600 capitalize">{member.role}</div>
                        </div>
                        {group.participation_points > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            +{member.individual_score}pts
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {groups.length === 0 && !analyzing && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Analysis Yet</h3>
            <p className="text-slate-600 mb-4">Click "Analyze Groups" to evaluate group participation and activity.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};