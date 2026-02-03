import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types
export interface DiscussionPrompt {
  id: string;
  course_id: string;
  title: string;
  prompt_text: string;
  stimulus_type: 'video' | 'audio' | 'pdf' | 'link' | 'none';
  stimulus_url: string | null;
  individual_due_at: string;
  peer_due_at: string;
  synthesis_due_at: string;
  word_min: number;
  word_max: number;
  current_phase: 'draft' | 'individual_open' | 'individual_locked' | 'peer_open' | 'peer_locked' | 'synthesis_open' | 'closed';
  is_locked: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DiscussionGroup {
  id: string;
  discussion_id: string;
  name: string;
  capacity: number;
  created_at: string;
  members?: DiscussionGroupMember[];
}

export interface DiscussionGroupMember {
  id: string;
  discussion_group_id: string;
  user_id: string;
  role: 'member' | 'leader';
  joined_at: string;
  profile?: {
    full_name: string;
    email?: string;
  };
}

export interface DiscussionPost {
  id: string;
  discussion_id: string;
  group_id: string | null;
  author_id: string;
  post_type: 'individual' | 'peer_response' | 'synthesis';
  parent_post_id: string | null;
  content: string;
  word_count: number;
  response_tag: 'challenge' | 'extend' | 'connect' | 'question' | null;
  submitted_at: string | null;
  is_draft: boolean;
  locked: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string;
  };
  replies?: DiscussionPost[];
}

export interface DiscussionRubric {
  id: string;
  discussion_id: string;
  category: string;
  max_points: number;
  criteria: string;
  display_order: number;
}

export interface DiscussionGrade {
  id: string;
  discussion_id: string;
  student_id: string;
  individual_score: number | null;
  peer_score: number | null;
  synthesis_score: number | null;
  professionalism_score: number | null;
  total_score: number | null;
  instructor_feedback: string | null;
  ai_pre_score: any;
  graded_by: string | null;
  graded_at: string | null;
}

// Fetch discussion prompts for a course
export function useDiscussionPrompts(courseId: string) {
  return useQuery({
    queryKey: ['discussion-prompts', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discussion_prompts')
        .select('*')
        .eq('course_id', courseId)
        .order('individual_due_at', { ascending: true });
      
      if (error) throw error;
      return data as DiscussionPrompt[];
    },
    enabled: !!courseId
  });
}

// Fetch a single discussion prompt with groups
export function useDiscussionPrompt(discussionId: string) {
  return useQuery({
    queryKey: ['discussion-prompt', discussionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discussion_prompts')
        .select('*')
        .eq('id', discussionId)
        .single();
      
      if (error) throw error;
      return data as DiscussionPrompt;
    },
    enabled: !!discussionId
  });
}

// Fetch groups for a discussion
export function useDiscussionGroups(discussionId: string) {
  return useQuery({
    queryKey: ['discussion-groups', discussionId],
    queryFn: async () => {
      const { data: groups, error } = await supabase
        .from('discussion_groups')
        .select('*')
        .eq('discussion_id', discussionId)
        .order('name');
      
      if (error) throw error;
      
      // Fetch members separately
      const groupIds = groups?.map(g => g.id) || [];
      if (groupIds.length === 0) return [];
      
      const { data: members } = await supabase
        .from('discussion_group_members')
        .select('*')
        .in('discussion_group_id', groupIds);
      
      // Fetch profiles
      const userIds = [...new Set((members || []).map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      
      return groups?.map(g => ({
        ...g,
        members: (members || [])
          .filter(m => m.discussion_group_id === g.id)
          .map(m => ({ ...m, profile: profileMap.get(m.user_id) }))
      })) as (DiscussionGroup & { members: DiscussionGroupMember[] })[];
    },
    enabled: !!discussionId
  });
}

// Fetch user's group for a discussion
export function useMyDiscussionGroup(discussionId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-discussion-group', discussionId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // First find user's membership
      const { data: membership } = await supabase
        .from('discussion_group_members')
        .select('discussion_group_id')
        .eq('user_id', user.id);
      
      if (!membership || membership.length === 0) return null;
      
      // Get the group that belongs to this discussion
      const { data: group } = await supabase
        .from('discussion_groups')
        .select('*')
        .eq('discussion_id', discussionId)
        .in('id', membership.map(m => m.discussion_group_id))
        .single();
      
      if (!group) return null;
      
      // Get all members of this group
      const { data: members } = await supabase
        .from('discussion_group_members')
        .select('*')
        .eq('discussion_group_id', group.id);
      
      const userIds = (members || []).map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      
      return {
        ...group,
        members: (members || []).map(m => ({ ...m, profile: profileMap.get(m.user_id) }))
      } as DiscussionGroup;
    },
    enabled: !!discussionId && !!user?.id
  });
}

// Fetch posts for a discussion
export function useDiscussionPosts(discussionId: string, groupId?: string) {
  return useQuery({
    queryKey: ['discussion-posts', discussionId, groupId],
    queryFn: async () => {
      let query = supabase
        .from('discussion_posts')
        .select('*')
        .eq('discussion_id', discussionId)
        .eq('is_draft', false)
        .order('created_at', { ascending: true });
      
      if (groupId) {
        query = query.or(`group_id.eq.${groupId},group_id.is.null`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch author profiles
      const authorIds = [...new Set((data || []).map(p => p.author_id))];
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name')
        .in('user_id', authorIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      
      return (data || []).map(p => ({
        ...p,
        author: profileMap.get(p.author_id)
      })) as DiscussionPost[];
    },
    enabled: !!discussionId
  });
}

// Fetch user's posts for a discussion
export function useMyDiscussionPosts(discussionId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-discussion-posts', discussionId, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('discussion_posts')
        .select('*')
        .eq('discussion_id', discussionId)
        .eq('author_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as DiscussionPost[];
    },
    enabled: !!discussionId && !!user?.id
  });
}

// Fetch rubric for a discussion
export function useDiscussionRubric(discussionId: string) {
  return useQuery({
    queryKey: ['discussion-rubric', discussionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discussion_rubric')
        .select('*')
        .eq('discussion_id', discussionId)
        .order('display_order');
      
      if (error) throw error;
      return data as DiscussionRubric[];
    },
    enabled: !!discussionId
  });
}

// Fetch grade for a student
export function useMyDiscussionGrade(discussionId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-discussion-grade', discussionId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('discussion_grades')
        .select('*')
        .eq('discussion_id', discussionId)
        .eq('student_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as DiscussionGrade | null;
    },
    enabled: !!discussionId && !!user?.id
  });
}

// Create/Update post mutation
export function usePostMutation(discussionId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: {
      content: string;
      post_type: 'individual' | 'peer_response' | 'synthesis';
      group_id?: string;
      parent_post_id?: string;
      response_tag?: 'challenge' | 'extend' | 'connect' | 'question';
      is_draft?: boolean;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data: post, error } = await supabase
        .from('discussion_posts')
        .insert({
          discussion_id: discussionId,
          author_id: user.id,
          content: data.content,
          post_type: data.post_type,
          group_id: data.group_id || null,
          parent_post_id: data.parent_post_id || null,
          response_tag: data.response_tag || null,
          is_draft: data.is_draft ?? false,
          submitted_at: data.is_draft ? null : new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-posts', discussionId] });
      queryClient.invalidateQueries({ queryKey: ['my-discussion-posts', discussionId] });
      toast.success('Post saved successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save post');
    }
  });
}

// Submit post (lock it)
export function useSubmitPost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('discussion_posts')
        .update({
          is_draft: false,
          submitted_at: new Date().toISOString()
        })
        .eq('id', postId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-posts'] });
      queryClient.invalidateQueries({ queryKey: ['my-discussion-posts'] });
      toast.success('Post submitted and locked');
    }
  });
}

// Phase helper
export function getPhaseInfo(prompt: DiscussionPrompt) {
  const now = new Date();
  const individualDue = new Date(prompt.individual_due_at);
  const peerDue = new Date(prompt.peer_due_at);
  const synthesisDue = new Date(prompt.synthesis_due_at);
  
  // Calculate active phase based on dates
  let activePhase = prompt.current_phase;
  if (prompt.current_phase !== 'draft') {
    if (now >= synthesisDue) {
      activePhase = 'closed';
    } else if (now >= peerDue) {
      activePhase = 'synthesis_open';
    } else if (now >= individualDue) {
      activePhase = 'peer_open';
    } else {
      activePhase = 'individual_open';
    }
  }
  
  const phases = [
    { id: 'individual_open', label: 'Individual Post', deadline: individualDue, weight: 40 },
    { id: 'peer_open', label: 'Peer Responses', deadline: peerDue, weight: 30 },
    { id: 'synthesis_open', label: 'Group Synthesis', deadline: synthesisDue, weight: 20 }
  ];
  
  return {
    activePhase,
    phases,
    isIndividualOpen: activePhase === 'individual_open',
    isPeerOpen: activePhase === 'peer_open',
    isSynthesisOpen: activePhase === 'synthesis_open',
    isClosed: activePhase === 'closed' || activePhase === 'draft'
  };
}

// Validation helpers
export function validatePost(content: string, wordMin: number, wordMax: number): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
  
  if (wordCount < wordMin) {
    errors.push(`Minimum ${wordMin} words required (currently ${wordCount})`);
  }
  if (wordCount > wordMax) {
    errors.push(`Maximum ${wordMax} words allowed (currently ${wordCount})`);
  }
  if (!content.includes('?')) {
    errors.push('Post should include at least one question');
  }
  
  return { valid: errors.length === 0, errors };
}
