import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CoursePost {
  id: string;
  author_id: string;
  course_id: string;
  content: string;
  media_urls: string[];
  location_tag: string | null;
  is_pinned: boolean;
  is_hidden: boolean;
  is_announcement: boolean;
  created_at: string;
  updated_at: string;
  author: {
    full_name: string;
    avatar_url: string | null;
  } | null;
  reactions: {
    heart: number;
    music: number;
    fire: number;
    clap: number;
    laugh: number;
  };
  user_reactions: string[];
  comment_count: number;
}

const PAGE_SIZE = 20;

export function useCourseSocialFeed(courseId: string) {
  const [posts, setPosts] = useState<CoursePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const { toast } = useToast();

  const fetchPosts = useCallback(async (pageNum: number, append = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Fetch posts for this course
      const { data: postsData, error } = await supabase
        .from('gw_course_lounge_posts')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_hidden', false)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (!postsData || postsData.length === 0) {
        setHasMore(false);
        if (!append) setPosts([]);
        setIsLoading(false);
        return;
      }

      // Fetch author profiles
      const authorIds = [...new Set(postsData.map(p => p.author_id))];
      const { data: profilesData } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', authorIds);

      // Fetch reactions for all posts
      const postIds = postsData.map(p => p.id);
      const { data: rawReactions } = await supabase
        .from('gw_course_lounge_reactions' as any)
        .select('post_id, reaction_type, author_id')
        .in('post_id', postIds);
      
      const reactionsData = (rawReactions || []) as unknown as { post_id: string; reaction_type: string; author_id: string }[];

      // Fetch comment counts
      const { data: rawComments } = await supabase
        .from('gw_course_lounge_comments' as any)
        .select('post_id')
        .in('post_id', postIds)
        .eq('is_hidden', false);
      
      const commentsData = (rawComments || []) as unknown as { post_id: string }[];

      // Process posts
      const processedPosts: CoursePost[] = postsData.map(post => {
        const postReactions = reactionsData?.filter(r => r.post_id === post.id) || [];
        const userReactions = postReactions
          .filter(r => r.author_id === user.id)
          .map(r => r.reaction_type);
        
        const reactionCounts = {
          heart: postReactions.filter(r => r.reaction_type === 'heart').length,
          music: postReactions.filter(r => r.reaction_type === 'music').length,
          fire: postReactions.filter(r => r.reaction_type === 'fire').length,
          clap: postReactions.filter(r => r.reaction_type === 'clap').length,
          laugh: postReactions.filter(r => r.reaction_type === 'laugh').length,
        };

        const commentCount = commentsData?.filter(c => c.post_id === post.id).length || 0;
        const authorProfile = profilesData?.find(p => p.user_id === post.author_id);

        return {
          id: post.id,
          author_id: post.author_id,
          course_id: post.course_id,
          content: post.content,
          media_urls: post.media_urls || [],
          location_tag: post.location_tag,
          is_pinned: post.is_pinned || false,
          is_hidden: post.is_hidden || false,
          is_announcement: post.is_announcement || false,
          created_at: post.created_at,
          updated_at: post.updated_at,
          author: authorProfile ? {
            full_name: authorProfile.full_name,
            avatar_url: authorProfile.avatar_url,
          } : null,
          reactions: reactionCounts,
          user_reactions: userReactions,
          comment_count: commentCount,
        };
      });

      if (append) {
        setPosts(prev => [...prev, ...processedPosts]);
      } else {
        setPosts(processedPosts);
      }

      setHasMore(postsData.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching course posts:', error);
      toast({
        title: 'Error loading posts',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [courseId, toast]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  }, [page, fetchPosts]);

  const refresh = useCallback(() => {
    setPage(0);
    setHasMore(true);
    fetchPosts(0, false);
  }, [fetchPosts]);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    fetchPosts(0);
  }, [fetchPosts]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`course-lounge-feed-${courseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gw_course_lounge_posts',
          filter: `course_id=eq.${courseId}`
        },
        async (payload) => {
          const newPost = payload.new as any;
          
          const { data: authorProfile } = await supabase
            .from('gw_profiles')
            .select('user_id, full_name, avatar_url')
            .eq('user_id', newPost.author_id)
            .single();
          
          const processedPost: CoursePost = {
            id: newPost.id,
            author_id: newPost.author_id,
            course_id: newPost.course_id,
            content: newPost.content,
            media_urls: newPost.media_urls || [],
            location_tag: newPost.location_tag,
            is_pinned: newPost.is_pinned || false,
            is_hidden: newPost.is_hidden || false,
            is_announcement: newPost.is_announcement || false,
            created_at: newPost.created_at,
            updated_at: newPost.updated_at,
            author: authorProfile ? {
              full_name: authorProfile.full_name,
              avatar_url: authorProfile.avatar_url,
            } : null,
            reactions: { heart: 0, music: 0, fire: 0, clap: 0, laugh: 0 },
            user_reactions: [],
            comment_count: 0,
          };
          
          setPosts(prev => {
            if (prev.some(p => p.id === processedPost.id)) return prev;
            const pinnedCount = prev.filter(p => p.is_pinned).length;
            if (processedPost.is_pinned) {
              return [processedPost, ...prev];
            }
            return [...prev.slice(0, pinnedCount), processedPost, ...prev.slice(pinnedCount)];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'gw_course_lounge_posts',
        },
        (payload) => {
          setPosts(prev => prev.filter(p => p.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courseId]);

  return {
    posts,
    isLoading,
    hasMore,
    loadMore,
    refresh,
  };
}
