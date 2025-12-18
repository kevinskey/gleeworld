import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, Users, Circle, Loader2, RefreshCw, MessageSquare, Mail, Bell, UserPlus, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCourseSocialFeed } from '@/hooks/useCourseSocialFeed';
import { CoursePostCard } from './course-lounge/CoursePostCard';
import { CourseCreatePost } from './course-lounge/CourseCreatePost';
import { CourseGroupsPanel } from './course-lounge/CourseGroupsPanel';
import { useCourseMessaging } from '@/hooks/useCourseMessaging';
import { ChatWindow } from '@/components/messaging/ChatWindow';
import { DirectMessaging } from '@/components/dashboard/DirectMessaging';
import { CourseAnnouncements } from './CourseAnnouncements';

interface CourseLoungeProps {
  courseId: string;
  courseName: string;
  isEnrolled: boolean;
  instructorEmail?: string;
  isAdmin?: boolean;
}

interface EnrolledMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

const MUS_070_ID = 'a0000000-0000-0000-0000-000000000070';

export const CourseLounge: React.FC<CourseLoungeProps> = ({ 
  courseId, 
  courseName, 
  isEnrolled,
  instructorEmail,
  isAdmin = false
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('feed');
  const [enrolledMembers, setEnrolledMembers] = useState<EnrolledMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [showChat, setShowChat] = useState(false);
  
  const { posts, isLoading, hasMore, loadMore, refresh } = useCourseSocialFeed(courseId);
  const { courseGroup, isMember, loading: groupLoading, joinCourseGroup } = useCourseMessaging(courseId, courseName);

  useEffect(() => {
    if (isEnrolled) {
      fetchEnrolledMembers();
      fetchUserProfile();
    } else {
      setMembersLoading(false);
    }
  }, [courseId, isEnrolled, user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('gw_profiles')
      .select('full_name, avatar_url')
      .eq('user_id', user.id)
      .single();
    setUserProfile(data);
  };

  const fetchEnrolledMembers = async () => {
    try {
      setMembersLoading(true);
      
      if (courseId === MUS_070_ID) {
        const { data } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, avatar_url')
          .or('role.eq.member,is_admin.eq.true,is_super_admin.eq.true')
          .order('full_name');
        setEnrolledMembers(data || []);
      } else {
        const { data: enrollments } = await supabase
          .from('gw_course_enrollments')
          .select('user_id')
          .eq('course_id', courseId);
        
        if (enrollments && enrollments.length > 0) {
          const userIds = enrollments.map(e => e.user_id);
          const { data: profiles } = await supabase
            .from('gw_profiles')
            .select('user_id, full_name, avatar_url')
            .in('user_id', userIds)
            .order('full_name');
          setEnrolledMembers(profiles || []);
        }
      }
    } catch (error) {
      console.error('Error fetching enrolled members:', error);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleJoinAndOpen = async () => {
    await joinCourseGroup();
    setShowChat(true);
  };

  if (!isEnrolled) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Course Lounge</h3>
          <p className="text-muted-foreground">
            Enroll in this course to access the lounge and connect with classmates.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Communication Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="feed" className="gap-1">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Feed</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Messages</span>
          </TabsTrigger>
          <TabsTrigger value="instructor" className="gap-1">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Instructor</span>
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-1">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">News</span>
          </TabsTrigger>
        </TabsList>

        {/* Feed Tab - Social Posts */}
        <TabsContent value="feed" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Panel: Groups + Members */}
            <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-4 h-fit">
              <CourseGroupsPanel courseId={courseId} />
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4 text-primary" />
                    Members ({enrolledMembers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {membersLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {enrolledMembers.map(member => (
                        <div key={member.user_id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{member.full_name?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium truncate flex-1">{member.full_name}</span>
                          <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Feed Panel */}
            <div className="lg:col-span-3">
              <CourseCreatePost 
                courseId={courseId} 
                userProfile={userProfile} 
                onPostCreated={refresh} 
              />
              
              {isLoading && posts.length === 0 ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : posts.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {posts.map(post => (
                    <CoursePostCard 
                      key={post.id} 
                      post={post} 
                      currentUserId={user?.id || null}
                      onRefresh={refresh}
                    />
                  ))}
                  {hasMore && (
                    <div className="flex justify-center py-4">
                      <Button variant="outline" onClick={loadMore}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Load more
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Messages Tab - Class Discussion */}
        <TabsContent value="messages" className="mt-4">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Class Discussion
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
              {groupLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !courseGroup ? (
                <div className="h-full flex items-center justify-center p-6">
                  <p className="text-muted-foreground">Course discussion group not available.</p>
                </div>
              ) : !isMember && !showChat ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{courseGroup.name}</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Join the class discussion to collaborate with your classmates, 
                    share resources, and ask questions.
                  </p>
                  <Button onClick={handleJoinAndOpen}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Join Discussion
                  </Button>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  {showChat && (
                    <div className="px-4 py-2 border-b flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setShowChat(false)}>
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <span className="font-medium">{courseGroup.name}</span>
                      <Badge variant="secondary" className="ml-auto">
                        Course Discussion
                      </Badge>
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <ChatWindow groupId={courseGroup.id} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Instructor Tab - Direct Messaging */}
        <TabsContent value="instructor" className="mt-4">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Direct Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <div className="h-full">
                <DirectMessaging />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="mt-4">
          <CourseAnnouncements courseId={courseId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
