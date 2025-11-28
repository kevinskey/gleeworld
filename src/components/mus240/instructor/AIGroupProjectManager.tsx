import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Users, 
  Lightbulb, 
  Code, 
  FileText, 
  Presentation, 
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download
} from 'lucide-react';
import { useMus240Groups } from '@/hooks/useMus240Groups';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Progress } from '@/components/ui/progress';

interface RoleSubmission {
  id: string;
  student_id: string;
  student_name: string;
  group_id: string;
  creativity: string | null;
  technology: string | null;
  writing: string | null;
  presentation: string | null;
  research: string | null;
  submitted_at: string | null;
  status: 'pending' | 'submitted';
}

export const AIGroupProjectManager = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { groups, loading: groupsLoading } = useMus240Groups('Fall 2025');

  // Fetch the AI Group Role assignment
  const { data: assignment } = useQuery({
    queryKey: ['ai-group-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_assignments')
        .select('id')
        .eq('title', 'AI Group Project - Role Identification')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Fetch ALL enrolled students to calculate accurate counts
  const { data: enrolledStudents } = useQuery({
    queryKey: ['enrolled-students-mus240'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mus240_enrollments')
        .select('student_id')
        .eq('semester', 'Fall 2025')
        .eq('enrollment_status', 'enrolled');

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch role submissions
  const { data: roleSubmissions, isLoading: submissionsLoading, refetch } = useQuery({
    queryKey: ['ai-group-role-submissions', assignment?.id],
    queryFn: async () => {
      if (!assignment?.id) return [];

      const { data, error } = await supabase
        .from('assignment_submissions')
        .select(`
          id,
          student_id,
          file_url,
          submitted_at,
          status,
          gw_profiles!fk_assignment_submissions_student_id (
            full_name,
            user_id
          )
        `)
        .eq('assignment_id', assignment.id);

      if (error) throw error;

      // Also fetch group memberships to connect students to groups
      const { data: membershipsData } = await supabase
        .from('mus240_group_memberships')
        .select('member_id, group_id');

      const membershipsMap = new Map(
        membershipsData?.map(m => [m.member_id, m.group_id]) || []
      );

      return data?.map(sub => {
        const roleData = sub.file_url ? JSON.parse(sub.file_url) : {};
        const studentUserId = (sub.gw_profiles as any)?.user_id;
        const groupId = membershipsMap.get(studentUserId) || null;

        return {
          id: sub.id,
          student_id: sub.student_id,
          student_name: (sub.gw_profiles as any)?.full_name || 'Unknown',
          group_id: groupId,
          creativity: roleData.areas?.includes('creativity') ? roleData.details : null,
          technology: roleData.areas?.includes('technology') ? roleData.details : null,
          writing: roleData.areas?.includes('writing') ? roleData.details : null,
          presentation: roleData.areas?.includes('presentation') ? roleData.details : null,
          research: roleData.areas?.includes('research') ? roleData.details : null,
          submitted_at: sub.submitted_at,
          status: sub.submitted_at ? 'submitted' : 'pending'
        } as RoleSubmission;
      }) || [];
    },
    enabled: !!assignment?.id,
  });

  const gradeAreas = [
    { id: 'creativity', label: 'Creativity', icon: Lightbulb, color: 'text-purple-500' },
    { id: 'technology', label: 'Technology', icon: Code, color: 'text-blue-500' },
    { id: 'writing', label: 'Writing', icon: FileText, color: 'text-green-500' },
    { id: 'presentation', label: 'Presentation', icon: Presentation, color: 'text-orange-500' },
    { id: 'research', label: 'Research', icon: Search, color: 'text-pink-500' }
  ];

  if (groupsLoading || submissionsLoading) {
    return <LoadingSpinner size="lg" text="Loading group project data..." />;
  }

  const submittedCount = roleSubmissions?.filter(s => s.status === 'submitted').length || 0;
  const totalStudents = enrolledStudents?.length || 0;
  const submissionRate = totalStudents > 0 ? (submittedCount / totalStudents) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{groups.length}</p>
                <p className="text-sm text-muted-foreground">Active Groups</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{submittedCount}</p>
                <p className="text-sm text-muted-foreground">Roles Submitted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{totalStudents - submittedCount}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Brain className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{submissionRate.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">Completion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="groups">By Group</TabsTrigger>
          <TabsTrigger value="areas">By Area</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role Assignment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Overall Submission Progress</span>
                    <span>{submittedCount} of {totalStudents}</span>
                  </div>
                  <Progress value={submissionRate} className="h-2" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {gradeAreas.map(area => {
                    const Icon = area.icon;
                    const count = roleSubmissions?.filter(s => 
                      s[area.id as keyof RoleSubmission] !== null
                    ).length || 0;
                    return (
                      <div key={area.id} className="p-3 border rounded-lg">
                        <Icon className={`h-5 w-5 ${area.color} mb-2`} />
                        <p className="text-sm font-medium">{area.label}</p>
                        <p className="text-xs text-muted-foreground">{count} claimed</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {roleSubmissions
                  ?.filter(s => s.status === 'submitted')
                  .slice(0, 10)
                  .map(submission => (
                    <div key={submission.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium">{submission.student_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(submission.submitted_at!).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {gradeAreas.map(area => {
                          if (submission[area.id as keyof RoleSubmission]) {
                            const Icon = area.icon;
                            return <Icon key={area.id} className={`h-4 w-4 ${area.color}`} />;
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          {groups.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No groups have been created yet.</p>
                <p className="text-sm mt-2">Students can create groups at <a href="/mus-240/groups" className="text-primary hover:underline">/mus-240/groups</a></p>
              </CardContent>
            </Card>
          ) : (
            groups.map(group => {
              const groupSubmissions = roleSubmissions?.filter(s => s.group_id === group.id) || [];
              const submittedInGroup = groupSubmissions.filter(s => s.status === 'submitted').length;
              const totalInGroup = group.member_count;

              return (
                <Card key={group.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {group.name}
                      </CardTitle>
                      <Badge variant={submittedInGroup === totalInGroup ? 'default' : 'secondary'}>
                        {submittedInGroup}/{totalInGroup} Submitted
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {groupSubmissions.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No role submissions yet from this group
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {groupSubmissions.map(submission => (
                          <div key={submission.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              {submission.status === 'submitted' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-orange-500" />
                              )}
                              <span className="text-sm">{submission.student_name}</span>
                            </div>
                            <div className="flex gap-1">
                              {gradeAreas.map(area => {
                                const hasRole = submission[area.id as keyof RoleSubmission];
                                const Icon = area.icon;
                                return hasRole ? (
                                  <Icon key={area.id} className={`h-4 w-4 ${area.color}`} />
                                ) : null;
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="areas" className="space-y-4">
          {gradeAreas.map(area => {
            const Icon = area.icon;
            const claimedRoles = roleSubmissions?.filter(s => 
              s[area.id as keyof RoleSubmission] !== null
            ) || [];

            return (
              <Card key={area.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className={area.color} />
                    {area.label}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {claimedRoles.length} students claimed work in this area
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {claimedRoles.map(submission => (
                      <div key={submission.id} className="p-3 border rounded-lg">
                        <p className="font-medium mb-1">{submission.student_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {submission[area.id as keyof RoleSubmission]}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="pt-6">
          <Button className="w-full" onClick={() => window.print()}>
            <Download className="h-4 w-4 mr-2" />
            Export Group Project Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
