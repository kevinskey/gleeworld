import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SocialPost {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  location_tag: string | null;
  is_pinned: boolean;
  is_hidden: boolean;
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

const PAGE_SIZE = 10;

export function useSocialFeed() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const { toast } = useToast();

  const fetchPosts = useCallback(async (pageNum: number, append = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Fetch posts
      const { data: postsData, error } = await supabase
        .from('gw_social_posts')
        .select('*')
        .eq('is_hidden', false)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (!postsData || postsData.length === 0) {
        setHasMore(false);
        if (!append) setPosts([]);
        return;
      }

      // Fetch author profiles
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: profilesData } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      // Fetch reactions for all posts
      const postIds = postsData.map(p => p.id);
      const { data: reactionsData } = await supabase
        .from('gw_social_reactions')
        .select('post_id, reaction_type, user_id')
        .in('post_id', postIds);

      // Fetch comment counts
      const { data: commentsData } = await supabase
        .from('gw_social_comments')
        .select('post_id')
        .in('post_id', postIds)
        .eq('is_hidden', false);

      // Process posts with reactions and comments
      const processedPosts: SocialPost[] = postsData.map(post => {
        const postReactions = reactionsData?.filter(r => r.post_id === post.id) || [];
        const userReactions = postReactions
          .filter(r => r.user_id === user.id)
          .map(r => r.reaction_type);
        
        const reactionCounts = {
          heart: postReactions.filter(r => r.reaction_type === 'heart').length,
          music: postReactions.filter(r => r.reaction_type === 'music').length,
          fire: postReactions.filter(r => r.reaction_type === 'fire').length,
          clap: postReactions.filter(r => r.reaction_type === 'clap').length,
          laugh: postReactions.filter(r => r.reaction_type === 'laugh').length,
        };

        const commentCount = commentsData?.filter(c => c.post_id === post.id).length || 0;
        const authorProfile = profilesData?.find(p => p.user_id === post.user_id);

        return {
          id: post.id,
          user_id: post.user_id,
          content: post.content,
          media_urls: post.media_urls || [],
          location_tag: post.location_tag,
          is_pinned: post.is_pinned,
          is_hidden: post.is_hidden,
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
      console.error('Error fetching posts:', error);
      toast({
        title: 'Error loading posts',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  }, [page, fetchPosts]);

  const refresh = useCallback(() => {
    setPage(0);
    setHasMore(true);
    setNewPostsAvailable(false);
    fetchPosts(0, false);
  }, [fetchPosts]);

  // Initial load
  useEffect(() => {
    fetchPosts(0);
  }, [fetchPosts]);

  // Realtime subscription for new posts
  useEffect(() => {
    const channel = supabase
      .channel('social-feed-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gw_social_posts',
        },
        (payload) => {
          console.log('New post detected:', payload);
          setNewPostsAvailable(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gw_social_posts',
        },
        () => {
          // Refresh to get updated post
          refresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'gw_social_posts',
        },
        (payload) => {
          setPosts(prev => prev.filter(p => p.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return {
    posts,
    isLoading,
    hasMore,
    loadMore,
    refresh,
    newPostsAvailable,
  };
}
