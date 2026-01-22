import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Users, 
  Settings, 
  BarChart3, 
  Award,
  ChevronRight,
  Plus,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Import hooks
import { 
  useDiscussionPrompt,
  useDiscussionGroups as useDiscussionGroupsData,
  useMyDiscussionGroup,
  useDiscussionPosts,
  useDiscussionRubric,
  useMyDiscussionPosts,
  getPhaseInfo,
  DiscussionPrompt
} from '@/hooks/useDiscussionGroups';

// Import sub-components
import { DiscussionPromptCard } from './DiscussionPromptCard';
import { DiscussionPromptOverview } from './DiscussionPromptOverview';
import { IndividualPostEditor } from './IndividualPostEditor';
import { PeerResponseSection } from './PeerResponseSection';
import { GroupSynthesisEditor } from './GroupSynthesisEditor';
import { InstructorControls } from './InstructorControls';
import { GradingPanel } from './GradingPanel';
import { AnalyticsDashboard } from './AnalyticsDashboard';

interface DiscussionModuleProps {
  courseId: string;
  isInstructor?: boolean;
}

export const DiscussionModule: React.FC<DiscussionModuleProps> = ({
  courseId,
  isInstructor = false
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDiscussion, setSelectedDiscussion] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [discussions, setDiscussions] = useState<DiscussionPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);

  // Use individual hooks
  const { data: prompt, refetch: refetchPrompt } = useDiscussionPrompt(selectedDiscussion || '');
  const { data: groups = [], refetch: refetchGroups } = useDiscussionGroupsData(selectedDiscussion || '');
  const { data: myGroup } = useMyDiscussionGroup(selectedDiscussion || '');
  const { data: posts = [], refetch: refetchPosts } = useDiscussionPosts(selectedDiscussion || '', myGroup?.id);
  const { data: rubric = [] } = useDiscussionRubric(selectedDiscussion || '');
  const { data: myPosts = [] } = useMyDiscussionPosts(selectedDiscussion || '');

  // Get phase info
  const phaseInfo = prompt ? getPhaseInfo(prompt) : null;
  const currentPhase = phaseInfo?.activePhase || 'draft';

  // Refetch all data
  const refetchAll = () => {
    refetchPrompt();
    refetchGroups();
    refetchPosts();
    fetchGrades();
  };

  // Fetch all discussions for this course
  const fetchDiscussions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('discussion_prompts')
        .select('id, course_id, title, prompt_text, stimulus_type, stimulus_url, individual_due_at, peer_due_at, synthesis_due_at, word_min, word_max, current_phase, is_locked, created_by, created_at, updated_at')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDiscussions((data || []) as DiscussionPrompt[]);
      
      // Auto-select first discussion if none selected
      if (data && data.length > 0 && !selectedDiscussion) {
        setSelectedDiscussion(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching discussions:', error);
      toast({ title: 'Error', description: 'Failed to load discussions', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch enrolled students for instructor
  const fetchEnrolledStudents = async () => {
    if (!isInstructor || !courseId) return;
    
    try {
      type EnrollmentRow = { user_id: string };
      type ProfileRow = { user_id: string; full_name: string | null; email: string | null };
      
      // @ts-ignore - Suppress deep type instantiation error
      const enrollmentResult = await supabase
        .from('gw_course_enrollments')
        .select('user_id')
        .eq('course_id', courseId)
        .eq('status', 'active');
      
      const data = enrollmentResult.data as EnrollmentRow[] | null;
      if (enrollmentResult.error) throw enrollmentResult.error;
      
      // Fetch profiles separately
      const userIds = (data || []).map(d => d.user_id);
      if (userIds.length > 0) {
        // @ts-ignore - Suppress deep type instantiation error
        const profileResult = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        
        const profiles = profileResult.data as ProfileRow[] | null;
        
        setEnrolledStudents((data || []).map(d => ({
          ...d,
          gw_profiles: profiles?.find(p => p.user_id === d.user_id)
        })));
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  // Fetch grades
  const fetchGrades = async () => {
    if (!selectedDiscussion) return;
    
    try {
      const { data, error } = await supabase
        .from('discussion_grades')
        .select('*')
        .eq('discussion_id', selectedDiscussion);
      
      if (error) throw error;
      setGrades(data || []);
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchDiscussions();
      fetchEnrolledStudents();
    }
  }, [courseId]);

  useEffect(() => {
    if (selectedDiscussion) {
      fetchGrades();
    }
  }, [selectedDiscussion]);

  const handleCreateDiscussion = async () => {
    try {
      const now = new Date();
      const { data, error } = await supabase
        .from('discussion_prompts')
        .insert({
          course_id: courseId,
          title: 'New Discussion',
          prompt_text: 'Enter your discussion prompt here...',
          individual_due_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          peer_due_at: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          synthesis_due_at: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      
      toast({ title: 'Discussion Created', description: 'New discussion has been created' });
      fetchDiscussions();
      setSelectedDiscussion(data.id);
    } catch (error) {
      console.error('Error creating discussion:', error);
      toast({ title: 'Error', description: 'Failed to create discussion', variant: 'destructive' });
    }
  };

  // Get my post counts for card
  const myIndividualPost = myPosts.find(p => p.post_type === 'individual');
  const myPeerResponses = myPosts.filter(p => p.post_type === 'peer_response');
  const mySynthesis = myPosts.find(p => p.post_type === 'synthesis');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4">
      {/* Discussion list sidebar */}
      <div className="w-64 shrink-0 border-r pr-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Discussions</h3>
          {isInstructor && (
            <Button size="sm" variant="ghost" onClick={handleCreateDiscussion}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-2">
            {discussions.map(disc => (
              <button
                key={disc.id}
                onClick={() => setSelectedDiscussion(disc.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedDiscussion === disc.id 
                    ? 'bg-primary/10 border border-primary/30' 
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{disc.title}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex gap-1 mt-1">
                  {disc.is_locked && (
                    <Badge variant="secondary" className="text-xs">Locked</Badge>
                  )}
                </div>
              </button>
            ))}
            {discussions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No discussions yet
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-w-0">
        {selectedDiscussion && prompt ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="discussion" className="gap-2">
                <Users className="h-4 w-4" />
                Discussion
              </TabsTrigger>
              {isInstructor && (
                <>
                  <TabsTrigger value="controls" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Controls
                  </TabsTrigger>
                  <TabsTrigger value="grading" className="gap-2">
                    <Award className="h-4 w-4" />
                    Grading
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <DiscussionPromptCard
                prompt={prompt}
                onClick={() => setActiveTab('discussion')}
                myPostsCount={myIndividualPost ? 1 : 0}
                myPeerResponsesCount={myPeerResponses.length}
                hasSynthesis={!!mySynthesis}
              />
              <DiscussionPromptOverview
                prompt={prompt}
                onBack={() => {}}
                onContinue={() => setActiveTab('discussion')}
              />
            </TabsContent>

            <TabsContent value="discussion" className="space-y-4">
              {/* Phase-based content */}
              {currentPhase === 'individual_open' && (
                <IndividualPostEditor
                  prompt={prompt}
                  existingPost={myIndividualPost}
                  isPhaseActive={true}
                  onSubmitted={refetchAll}
                />
              )}

              {(currentPhase === 'peer_open' || currentPhase === 'peer_locked') && myGroup && (
                <PeerResponseSection
                  prompt={prompt}
                  groupPosts={posts.filter(p => p.group_id === myGroup.id || p.post_type === 'individual')}
                  myPosts={myPosts}
                  currentUserId={user?.id || ''}
                  isPhaseActive={currentPhase === 'peer_open'}
                  onResponseAdded={refetchAll}
                />
              )}

              {(currentPhase === 'synthesis_open' || currentPhase === 'closed') && myGroup && (
                <GroupSynthesisEditor
                  prompt={prompt}
                  group={myGroup}
                  groupPosts={posts.filter(p => p.group_id === myGroup.id)}
                  existingSynthesis={posts.find(p => p.group_id === myGroup.id && p.post_type === 'synthesis')}
                  isPhaseActive={currentPhase === 'synthesis_open'}
                  onSubmitted={refetchAll}
                />
              )}

              {/* Show all posts for review when closed */}
              {currentPhase === 'closed' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">All Submissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96">
                      <div className="space-y-4">
                        {posts.map(post => (
                          <div key={post.id} className="p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {post.post_type}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {post.word_count} words
                              </span>
                            </div>
                            <p className="text-sm">{post.content?.slice(0, 200)}...</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {!myGroup && currentPhase !== 'individual_open' && !isInstructor && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      You haven't been assigned to a group yet.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {isInstructor && (
              <>
                <TabsContent value="controls">
                  <InstructorControls
                    discussionId={selectedDiscussion}
                    prompt={prompt}
                    groups={groups}
                    enrolledStudents={enrolledStudents}
                    onRefresh={refetchAll}
                  />
                </TabsContent>

                <TabsContent value="grading">
                  <GradingPanel
                    discussionId={selectedDiscussion}
                    rubric={rubric}
                    posts={posts}
                    students={enrolledStudents}
                    grades={grades}
                    onRefresh={refetchAll}
                  />
                </TabsContent>

                <TabsContent value="analytics">
                  <AnalyticsDashboard
                    posts={posts}
                    students={enrolledStudents}
                    groups={groups}
                  />
                </TabsContent>
              </>
            )}
          </Tabs>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Select a discussion to view details
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
