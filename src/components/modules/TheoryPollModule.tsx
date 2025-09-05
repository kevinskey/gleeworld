import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, ExternalLink, Users, BarChart3 } from 'lucide-react';
import { ModuleWrapper } from './ModuleWrapper';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface PollData {
  id: string;
  question: string;
  options: string[];
  responses: number[];
  totalResponses: number;
  isActive: boolean;
  createdAt: string;
}

export const TheoryPollModule = () => {
  const { user } = useAuth();
  const [polls, setPolls] = useState<PollData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    loadPolls();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('gw_profiles')
      .select('is_super_admin, is_admin')
      .eq('user_id', user.id)
      .single();
    
    setIsSuperAdmin(profile?.is_super_admin || profile?.is_admin || false);
  };

  const loadPolls = async () => {
    try {
      // For now, we'll show mock data since the actual polls are stored in the external HTML files
      const mockPolls: PollData[] = [
        {
          id: '1',
          question: 'What is a major scale?',
          options: ['Do-Re-Mi-Fa-Sol-La-Ti-Do', '8 notes ascending', 'C-D-E-F-G-A-B-C', 'All of the above'],
          responses: [15, 8, 12, 25],
          totalResponses: 60,
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: '2', 
          question: 'Which interval has 7 semitones?',
          options: ['Perfect 4th', 'Perfect 5th', 'Major 6th', 'Minor 7th'],
          responses: [5, 35, 8, 12],
          totalResponses: 60,
          isActive: false,
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }
      ];
      
      setPolls(mockPolls);
    } catch (error) {
      console.error('Error loading polls:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openInstructorInterface = () => {
    window.open('/music-theory-fundamentals/instructor.html', '_blank');
  };

  const openStudentInterface = () => {
    window.open('/music-theory-fundamentals/student.html', '_blank');
  };

  if (isLoading) {
    return (
      <ModuleWrapper title="Theory Poll System" icon={BarChart}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </ModuleWrapper>
    );
  }

  return (
    <ModuleWrapper title="Theory Poll System" icon={BarChart}>
      <div className="space-y-6">
        {/* Interface Access Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {isSuperAdmin && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <BarChart3 className="h-5 w-5" />
                  Instructor Interface
                  <Badge variant="secondary" className="bg-orange-200 text-orange-800">Admin Only</Badge>
                </CardTitle>
                <CardDescription className="text-orange-700">
                  Create and manage theory polls, view real-time responses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={openInstructorInterface}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Instructor Dashboard
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Users className="h-5 w-5" />
                Student Interface
              </CardTitle>
              <CardDescription className="text-blue-700">
                Join active polls and participate in theory exercises
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={openStudentInterface}
                variant="outline"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Student Interface
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Polls Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Recent Polls
            </CardTitle>
            <CardDescription>
              Overview of recent theory polling activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {polls.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No polls found. {isSuperAdmin ? 'Create your first poll using the instructor interface.' : 'Check back when polls are available.'}
                </p>
              ) : (
                polls.map((poll) => (
                  <div key={poll.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{poll.question}</h4>
                        <Badge variant={poll.isActive ? "default" : "secondary"}>
                          {poll.isActive ? "Active" : "Closed"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {poll.totalResponses} responses • {new Date(poll.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{poll.totalResponses}</div>
                      <div className="text-xs text-muted-foreground">responses</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {!isSuperAdmin && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-yellow-800">
                <BarChart className="h-5 w-5" />
                <span className="font-medium">Limited Access</span>
              </div>
              <p className="text-yellow-700 mt-1">
                Full polling management requires superadmin privileges. Contact an administrator for access.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleWrapper>
  );
};