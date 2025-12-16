import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CourseGroup {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  max_members: number;
}

interface GroupMembership {
  group_id: string;
  role: string;
}

interface CourseGroupsPanelProps {
  courseId: string;
}

export const CourseGroupsPanel: React.FC<CourseGroupsPanelProps> = ({ courseId }) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<CourseGroup[]>([]);
  const [memberships, setMemberships] = useState<GroupMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningGroup, setJoiningGroup] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
    if (user) {
      fetchMemberships();
    }
  }, [courseId, user]);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_groups')
        .select('id, name, description, member_count, max_members')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setGroups((data as CourseGroup[]) || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberships = async () => {
    if (!user) return;
    try {
      // Get group IDs for this course first
      const { data: courseGroups } = await supabase
        .from('gw_groups')
        .select('id')
        .eq('course_id', courseId);

      if (!courseGroups?.length) return;

      const groupIds = courseGroups.map(g => g.id);

      // Check memberships in the course-specific group members table
      const { data, error } = await (supabase as any)
        .from('gw_academy_group_members')
        .select('group_id, role')
        .eq('user_id', user.id)
        .in('group_id', groupIds);

      if (error && error.code !== '42P01') throw error;
      setMemberships((data as GroupMembership[]) || []);
    } catch (error) {
      console.error('Error fetching memberships:', error);
    }
  };

  const joinGroup = async (groupId: string) => {
    if (!user) return;
    setJoiningGroup(groupId);
    try {
      const { error } = await (supabase as any)
        .from('gw_academy_group_members')
        .insert({ group_id: groupId, user_id: user.id, role: 'member' });

      if (error) throw error;

      // Update local state
      setMemberships(prev => [...prev, { group_id: groupId, role: 'member' }]);
      
      // Increment member count locally
      setGroups(prev => prev.map(g => 
        g.id === groupId ? { ...g, member_count: g.member_count + 1 } : g
      ));

      toast.success('Joined group successfully!');
    } catch (error: any) {
      console.error('Error joining group:', error);
      toast.error(error.message || 'Failed to join group');
    } finally {
      setJoiningGroup(null);
    }
  };

  const leaveGroup = async (groupId: string) => {
    if (!user) return;
    setJoiningGroup(groupId);
    try {
      const { error } = await (supabase as any)
        .from('gw_academy_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setMemberships(prev => prev.filter(m => m.group_id !== groupId));
      
      // Decrement member count locally
      setGroups(prev => prev.map(g => 
        g.id === groupId ? { ...g, member_count: Math.max(0, g.member_count - 1) } : g
      ));

      toast.success('Left group successfully');
    } catch (error: any) {
      console.error('Error leaving group:', error);
      toast.error(error.message || 'Failed to leave group');
    } finally {
      setJoiningGroup(null);
    }
  };

  const isMember = (groupId: string) => {
    return memberships.some(m => m.group_id === groupId);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (groups.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" />
          Groups
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {groups.map(group => {
            const memberStatus = isMember(group.id);
            const isProcessing = joiningGroup === group.id;

            return (
              <div 
                key={group.id} 
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{group.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {group.member_count}/{group.max_members}
                    </Badge>
                  </div>
                  {group.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {group.description}
                    </p>
                  )}
                </div>
                
                <Button
                  size="sm"
                  variant={memberStatus ? "outline" : "default"}
                  disabled={isProcessing || (!memberStatus && group.member_count >= group.max_members)}
                  onClick={() => memberStatus ? leaveGroup(group.id) : joinGroup(group.id)}
                  className="ml-2 shrink-0"
                >
                  {isProcessing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : memberStatus ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Joined
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3 w-3 mr-1" />
                      Join
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
