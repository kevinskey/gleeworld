import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { ModuleProps } from '@/types/unified-modules';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useSpecificModulePermissions } from '@/hooks/useModulePermissions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MentorshipPair {
  id: string;
  mentor_id: string;
  mentee_id: string;
  mentor_name: string;
  mentee_name: string;
  status: 'active' | 'completed' | 'pending';
  created_at: string;
  notes?: string;
}

export const MemberMentorshipModule = ({ user, isFullPage = false }: ModuleProps) => {
  const { user: authUser } = useAuth();
  const [mentorships, setMentorships] = useState<MentorshipPair[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Use the new permission hook
  const { canAccess, canManage, loading: permissionsLoading } = useSpecificModulePermissions('member_mentorship');

  useEffect(() => {
    if (!permissionsLoading) {
      fetchMentorships();
    }
  }, [authUser, permissionsLoading]);

  const fetchMentorships = async () => {
    try {
      // For demo purposes, using gw_profiles to show the concept
      // In a real implementation, you'd create a mentorship_pairs table
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, role, graduation_year')
        .limit(10);

      if (error) throw error;
      
      // Transform data for demo purposes
      const mockMentorships: MentorshipPair[] = data?.slice(0, 5).map((profile, index) => ({
        id: `mentorship-${index}`,
        mentor_id: profile.user_id,
        mentee_id: `mentee-${index}`,
        mentor_name: profile.full_name || 'Unknown',
        mentee_name: `Mentee ${index + 1}`,
        status: index % 2 === 0 ? 'active' : 'pending' as 'active' | 'pending',
        created_at: new Date().toISOString(),
        notes: `Mentorship pair ${index + 1}`
      })) || [];
      
      setMentorships(mockMentorships);
    } catch (error) {
      console.error('Error fetching mentorships:', error);
      toast.error('Failed to load mentorship data');
    } finally {
      setLoading(false);
    }
  };

  const createMentorship = async (mentorId: string, menteeId: string) => {
    if (!canManage) {
      toast.error('You do not have permission to manage mentorships');
      return;
    }

    // For demo purposes - in real implementation you'd insert into mentorship_pairs table
    toast.success('Mentorship pair would be created (demo mode)');
    
    // Example of what the real implementation would look like:
    // const { error } = await supabase
    //   .from('mentorship_pairs')
    //   .insert([{
    //     mentor_id: mentorId,
    //     mentee_id: menteeId,
    //     status: 'pending'
    //   }]);
  };

  // Don't show module if user doesn't have access
  if (!canAccess && !permissionsLoading) {
    return null;
  }

  if (loading || permissionsLoading) {
    return (
      <ModuleWrapper
        id="member-mentorship"
        title="Member Mentorship"
        description="Manage mentorship programs and relationships"
        icon={Users}
        iconColor="blue"
        fullPage={isFullPage}
        defaultOpen={!!isFullPage}
      >
        <div className="p-4">Loading mentorship data...</div>
      </ModuleWrapper>
    );
  }

  return (
    <ModuleWrapper
      id="member-mentorship"
      title="Member Mentorship"
      description="Manage mentorship programs and relationships"
      icon={Users}
      iconColor="blue"
      fullPage={isFullPage}
      defaultOpen={!!isFullPage}
    >
      <div className="space-y-4">
        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Mentorship Pair</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => toast.info('Mentorship creation form would open here')}>
                Add New Mentorship Pair
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Active Mentorship Pairs</CardTitle>
          </CardHeader>
          <CardContent>
            {mentorships.length === 0 ? (
              <p className="text-muted-foreground">No mentorship pairs found.</p>
            ) : (
              <div className="space-y-3">
                {mentorships.map((pair) => (
                  <div key={pair.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {pair.mentor_name} → {pair.mentee_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(pair.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={pair.status === 'active' ? 'default' : 'secondary'}>
                      {pair.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ModuleWrapper>
  );
};