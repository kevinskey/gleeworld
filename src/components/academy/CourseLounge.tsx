import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Lock, Users, Circle, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCourseSocialFeed } from '@/hooks/useCourseSocialFeed';
import { CoursePostCard } from './course-lounge/CoursePostCard';
import { CourseCreatePost } from './course-lounge/CourseCreatePost';

interface CourseLoungeProps {
  courseId: string;
  courseName: string;
  isEnrolled: boolean;
}

interface EnrolledMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

const MUS_070_ID = 'a0000000-0000-0000-0000-000000000070';

export const CourseLounge: React.FC<CourseLoungeProps> = ({ courseId, courseName, isEnrolled }) => {
  const { user } = useAuth();
  const [enrolledMembers, setEnrolledMembers] = useState<EnrolledMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  
  const { posts, isLoading, hasMore, loadMore, refresh } = useCourseSocialFeed(courseId);

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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Members Panel */}
      <Card className="lg:col-span-1 h-fit lg:sticky lg:top-4">
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
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
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
  );
};
