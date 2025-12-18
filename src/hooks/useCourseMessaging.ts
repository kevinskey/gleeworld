import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface CourseMessageGroup {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  course_id: string | null;
  group_type: string;
  created_at: string;
  updated_at: string;
}

export const useCourseMessaging = (courseId: string, courseName: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [courseGroup, setCourseGroup] = useState<CourseMessageGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);

  // Fetch or create course discussion group
  const fetchOrCreateCourseGroup = useCallback(async () => {
    if (!user || !courseId) {
      setLoading(false);
      return;
    }

    try {
      // First, check if course group exists
      const { data: existingGroup, error: fetchError } = await supabase
        .from('gw_message_groups')
        .select('*')
        .eq('course_id', courseId)
        .eq('group_type', 'course')
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching course group:', fetchError);
        throw fetchError;
      }

      let group = existingGroup;

      // If no group exists, create one (admin/instructor creates it)
      if (!group) {
        const { data: newGroup, error: createError } = await supabase
          .from('gw_message_groups')
          .insert({
            name: `${courseName} Discussion`,
            description: `Official discussion group for ${courseName}`,
            course_id: courseId,
            group_type: 'course',
            created_by: user.id
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating course group:', createError);
          throw createError;
        }
        group = newGroup;

        // Add creator as admin member
        await supabase.from('gw_group_members').insert({
          group_id: group.id,
          user_id: user.id,
          role: 'admin'
        });
      }

      setCourseGroup(group);

      // Check if current user is a member
      const { data: membership } = await supabase
        .from('gw_group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', user.id)
        .maybeSingle();

      setIsMember(!!membership);
    } catch (error) {
      console.error('Error in fetchOrCreateCourseGroup:', error);
    } finally {
      setLoading(false);
    }
  }, [user, courseId, courseName]);

  // Join course group
  const joinCourseGroup = async () => {
    if (!user || !courseGroup) return false;

    try {
      const { error } = await supabase.from('gw_group_members').insert({
        group_id: courseGroup.id,
        user_id: user.id,
        role: 'member'
      });

      if (error) {
        if (error.code === '23505') {
          // Already a member
          setIsMember(true);
          return true;
        }
        throw error;
      }

      setIsMember(true);
      queryClient.invalidateQueries({ queryKey: ['message-groups'] });
      toast.success('Joined course discussion group!');
      return true;
    } catch (error) {
      console.error('Error joining course group:', error);
      toast.error('Failed to join course group');
      return false;
    }
  };

  // Leave course group
  const leaveCourseGroup = async () => {
    if (!user || !courseGroup) return false;

    try {
      const { error } = await supabase
        .from('gw_group_members')
        .delete()
        .eq('group_id', courseGroup.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setIsMember(false);
      queryClient.invalidateQueries({ queryKey: ['message-groups'] });
      toast.success('Left course discussion group');
      return true;
    } catch (error) {
      console.error('Error leaving course group:', error);
      toast.error('Failed to leave course group');
      return false;
    }
  };

  useEffect(() => {
    fetchOrCreateCourseGroup();
  }, [fetchOrCreateCourseGroup]);

  return {
    courseGroup,
    loading,
    isMember,
    joinCourseGroup,
    leaveCourseGroup,
    refresh: fetchOrCreateCourseGroup
  };
};

// Hook to get instructor user ID from course config
export const useInstructorId = (instructorEmail: string) => {
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInstructorId = async () => {
      if (!instructorEmail) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('gw_profiles')
          .select('user_id')
          .eq('email', instructorEmail)
          .maybeSingle();

        if (error) throw error;
        setInstructorId(data?.user_id || null);
      } catch (error) {
        console.error('Error fetching instructor ID:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInstructorId();
  }, [instructorEmail]);

  return { instructorId, loading };
};
