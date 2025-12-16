import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send, Lock, Users, Circle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface CourseLoungeProps {
  courseId: string;
  courseName: string;
  isEnrolled: boolean;
}

interface LoungePost {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  author?: {
    full_name: string;
    avatar_url: string;
  };
}

interface EnrolledMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

const MUS_070_ID = 'a0000000-0000-0000-0000-000000000070';

export const CourseLounge: React.FC<CourseLoungeProps> = ({ courseId, courseName, isEnrolled }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<LoungePost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [enrolledMembers, setEnrolledMembers] = useState<EnrolledMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  useEffect(() => {
    if (isEnrolled) {
      fetchPosts();
      fetchEnrolledMembers();
    } else {
      setLoading(false);
      setMembersLoading(false);
    }
  }, [courseId, isEnrolled]);

  // Separate effect for real-time subscription
  useEffect(() => {
    if (!isEnrolled) return;

    const channel = supabase
      .channel(`course-lounge-${courseId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'gw_course_lounge_posts',
        filter: `course_id=eq.${courseId}`
      }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courseId, isEnrolled]);

  const fetchEnrolledMembers = async () => {
    try {
      setMembersLoading(true);
      
      // For MUS 070, get all members with role='member' plus admins
      if (courseId === MUS_070_ID) {
        const { data, error } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, avatar_url, role, is_admin, is_super_admin')
          .or('role.eq.member,is_admin.eq.true,is_super_admin.eq.true')
          .order('full_name');
        
        if (error) throw error;
        setEnrolledMembers(data || []);
      } else {
        // For other courses, get enrollments
        const { data: enrollments, error } = await supabase
          .from('gw_course_enrollments')
          .select('user_id')
          .eq('course_id', courseId);
        
        if (error) throw error;
        
        if (enrollments && enrollments.length > 0) {
          const userIds = enrollments.map(e => e.user_id);
          const { data: profiles } = await supabase
            .from('gw_profiles')
            .select('user_id, full_name, avatar_url, role')
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

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_course_lounge_posts')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch author profiles
      const authorIds = [...new Set(data?.map(p => p.author_id) || [])];
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', authorIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichedPosts = data?.map(post => ({
        ...post,
        author: profileMap.get(post.author_id)
      })) || [];

      setPosts(enrichedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!newPost.trim() || !user) return;

    setPosting(true);
    try {
      const { error } = await supabase
        .from('gw_course_lounge_posts')
        .insert({
          course_id: courseId,
          author_id: user.id,
          content: newPost.trim()
        });

      if (error) throw error;

      setNewPost('');
      toast.success('Posted to lounge!');
      fetchPosts();
    } catch (error) {
      console.error('Error posting:', error);
      toast.error('Failed to post. Please try again.');
    } finally {
      setPosting(false);
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Members Panel */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            Enrolled Members ({enrolledMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <p className="text-center text-muted-foreground py-4">Loading members...</p>
          ) : enrolledMembers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No members enrolled yet.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {enrolledMembers.map(member => (
                <div key={member.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {member.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.full_name || 'Unknown'}</p>
                  </div>
                  <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Panel */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            {courseName} Lounge
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Post Input */}
          <div className="space-y-2">
            <Textarea
              placeholder="Share something with your classmates..."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              rows={3}
            />
            <Button 
              onClick={handlePost} 
              disabled={!newPost.trim() || posting}
              className="w-full sm:w-auto"
            >
              <Send className="h-4 w-4 mr-2" />
              {posting ? 'Posting...' : 'Post'}
            </Button>
          </div>

          {/* Posts List */}
          <div className="space-y-4 mt-6 max-h-[400px] overflow-y-auto">
            {loading ? (
              <p className="text-center text-muted-foreground py-4">Loading posts...</p>
            ) : posts.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No posts yet. Be the first to share something!
              </p>
            ) : (
              posts.map(post => (
                <div key={post.id} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.author?.avatar_url} />
                    <AvatarFallback>
                      {post.author?.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">
                        {post.author?.full_name || 'Anonymous'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};