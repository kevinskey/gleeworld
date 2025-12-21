import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Plus, Play, Square, BarChart3, Users, Trash2, Edit } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMus240SemesterSafe } from '@/contexts/Mus240SemesterContext';
import { PollAdminInterface } from './PollAdminInterface';
import { StudentPollView } from './StudentPollView';
import { LivePollController } from './LivePollController';
import { PollResults } from './PollResults';

export interface PollQuestion {
  question: string;
  options: string[];
  correct_answer?: number;
}

export interface AcademyPoll {
  id: string;
  course_id: string;
  semester: string;
  title: string;
  description: string | null;
  questions: PollQuestion[];
  is_active: boolean;
  is_live_session: boolean;
  current_question_index: number;
  show_results: boolean;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface AcademyPollSystemProps {
  courseId: string;
}

export const AcademyPollSystem: React.FC<AcademyPollSystemProps> = ({ courseId }) => {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  const { currentSemester } = useMus240SemesterSafe();
  const [polls, setPolls] = useState<AcademyPoll[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'student' | 'admin'>('student');
  const [selectedPoll, setSelectedPoll] = useState<AcademyPoll | null>(null);
  const [showLiveController, setShowLiveController] = useState(false);

  const hasAdminAccess = isAdmin() || isSuperAdmin();

  useEffect(() => {
    if (!roleLoading) {
      fetchPolls();
    }
  }, [roleLoading, currentSemester, courseId]);

  // Real-time subscription for live polls
  useEffect(() => {
    const channel = supabase
      .channel('academy-polls-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gw_academy_polls',
          filter: `course_id=eq.${courseId}`
        },
        () => {
          fetchPolls();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courseId]);

  const fetchPolls = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_academy_polls')
        .select('*')
        .eq('course_id', courseId)
        .eq('semester', currentSemester)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse questions from JSONB
      const parsedPolls = (data || []).map(poll => ({
        ...poll,
        questions: Array.isArray(poll.questions) ? poll.questions as unknown as PollQuestion[] : []
      })) as AcademyPoll[];
      
      setPolls(parsedPolls);
    } catch (error) {
      console.error('Error fetching polls:', error);
      toast.error('Failed to fetch polls');
    } finally {
      setLoading(false);
    }
  };

  const createPoll = async (title: string, description: string, questions: PollQuestion[] = []) => {
    if (!title.trim()) {
      toast.error('Please enter a poll title');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gw_academy_polls')
        .insert({
          course_id: courseId,
          semester: currentSemester,
          title: title.trim(),
          description: description.trim() || null,
          questions: questions as unknown as any,
          is_active: false,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      
      setPolls(prev => [{ ...data, questions: questions } as AcademyPoll, ...prev]);
      toast.success('Poll created successfully!');
      return data;
    } catch (error) {
      console.error('Error creating poll:', error);
      toast.error('Failed to create poll');
    }
  };

  const togglePollActive = async (pollId: string, isActive: boolean) => {
    try {
      // If activating, deactivate all others first
      if (isActive) {
        await supabase
          .from('gw_academy_polls')
          .update({ is_active: false, is_live_session: false })
          .eq('course_id', courseId)
          .eq('semester', currentSemester);
      }

      const { error } = await supabase
        .from('gw_academy_polls')
        .update({ is_active: isActive })
        .eq('id', pollId);

      if (error) throw error;
      
      await fetchPolls();
      toast.success(isActive ? 'Poll activated!' : 'Poll deactivated');
    } catch (error) {
      console.error('Error toggling poll:', error);
      toast.error('Failed to update poll');
    }
  };

  const deletePoll = async (pollId: string) => {
    if (!confirm('Are you sure you want to delete this poll?')) return;

    try {
      const { error } = await supabase
        .from('gw_academy_polls')
        .delete()
        .eq('id', pollId);

      if (error) throw error;
      
      setPolls(prev => prev.filter(p => p.id !== pollId));
      toast.success('Poll deleted');
    } catch (error) {
      console.error('Error deleting poll:', error);
      toast.error('Failed to delete poll');
    }
  };

  const startLiveSession = async (poll: AcademyPoll) => {
    try {
      const { error } = await supabase
        .from('gw_academy_polls')
        .update({ 
          is_active: true, 
          is_live_session: true,
          current_question_index: 0,
          show_results: false
        })
        .eq('id', poll.id);

      if (error) throw error;
      
      setSelectedPoll({ ...poll, is_live_session: true, is_active: true });
      setShowLiveController(true);
      toast.success('Live session started!');
    } catch (error) {
      console.error('Error starting live session:', error);
      toast.error('Failed to start live session');
    }
  };

  // Get active poll for students
  const activePoll = polls.find(p => p.is_active);

  if (roleLoading || loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          Loading polls...
        </CardContent>
      </Card>
    );
  }

  // Show live controller if in live session
  if (showLiveController && selectedPoll && hasAdminAccess) {
    return (
      <LivePollController
        poll={selectedPoll}
        onClose={() => {
          setShowLiveController(false);
          setSelectedPoll(null);
          fetchPolls();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* View Mode Toggle for Admins */}
      {hasAdminAccess && (
        <div className="flex items-center justify-between">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'student' | 'admin')}>
            <TabsList>
              <TabsTrigger value="student">Student View</TabsTrigger>
              <TabsTrigger value="admin">Admin View</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Admin View */}
      {hasAdminAccess && viewMode === 'admin' && (
        <PollAdminInterface
          polls={polls}
          onCreatePoll={createPoll}
          onTogglePoll={togglePollActive}
          onDeletePoll={deletePoll}
          onStartLive={startLiveSession}
          onRefresh={fetchPolls}
        />
      )}

      {/* Student View / Non-Admin View */}
      {(viewMode === 'student' || !hasAdminAccess) && (
        activePoll ? (
          <StudentPollView poll={activePoll} onResponseSubmitted={fetchPolls} />
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Active Polls</h3>
              <p className="text-muted-foreground">
                There are no active polls at the moment. Check back later!
              </p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
};
