import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

export type MessengerRole = 'super-admin' | 'admin' | 'student' | 'alumna' | 'fan' | 'none';

export interface MessengerContact {
  user_id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  role?: string;
  source: 'course' | 'alumna' | 'mentee' | 'all';
}

export interface MessengerCourseGroup {
  id: string;
  title: string;
  studentCount: number;
}

export interface UseMessengerAccessReturn {
  hasAccess: boolean;
  messengerRole: MessengerRole;
  isLoading: boolean;
  contacts: MessengerContact[];
  courseGroups: MessengerCourseGroup[];
  canMessageAnyone: boolean;
  canSendSMS: boolean;
  noAccessReason?: string;
  refreshContacts: () => Promise<void>;
}

export const useMessengerAccess = (): UseMessengerAccessReturn => {
  const { user } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile(user);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contacts, setContacts] = useState<MessengerContact[]>([]);
  const [courseGroups, setCourseGroups] = useState<MessengerCourseGroup[]>([]);

  // Determine messenger role based on profile
  const messengerRole = useMemo((): MessengerRole => {
    if (!userProfile) return 'none';
    
    // Super admin has full access
    if (userProfile.is_super_admin) return 'super-admin';
    
    // Admin access
    if (userProfile.is_admin) return 'admin';
    
    // Check for alumna role
    const role = userProfile.role?.toLowerCase();
    if (role === 'alumna' || role === 'alumnae') return 'alumna';
    
    // Check for student role
    if (role === 'student' || role === 'member') return 'student';
    
    // Fan role
    if (role === 'fan') return 'fan';
    
    return 'none';
  }, [userProfile]);

  const hasAccess = messengerRole !== 'fan' && messengerRole !== 'none';
  // Allow everyone with access to message anyone
  const canMessageAnyone = hasAccess;
  const canSendSMS = messengerRole === 'super-admin' || messengerRole === 'admin';

  const noAccessReason = useMemo(() => {
    if (messengerRole === 'fan') {
      return 'Fan accounts do not have messenger access. For questions or information, please contact admin@gleeworld.org';
    }
    if (messengerRole === 'none') {
      return 'Your account does not have messenger access. Please contact an administrator.';
    }
    return undefined;
  }, [messengerRole]);

  const loadContacts = async () => {
    if (!user || !hasAccess) {
      setContacts([]);
      setCourseGroups([]);
      setContactsLoading(false);
      return;
    }

    setContactsLoading(true);
    try {
      const allContacts: MessengerContact[] = [];
      const groups: MessengerCourseGroup[] = [];
      const seenUserIds = new Set<string>();

      // ALL users with access can see everyone in the dropdown
      const { data: allUsers } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, phone_number, role')
        .neq('user_id', user.id)
        .order('full_name');
      
      if (allUsers) {
        allUsers.forEach(u => {
          if (!seenUserIds.has(u.user_id)) {
            seenUserIds.add(u.user_id);
            allContacts.push({ ...u, source: 'all' });
          }
        });
      }

      // Load course groups for admins and super-admins
      if (messengerRole === 'super-admin' || messengerRole === 'admin') {
        const { data: allCourses } = await supabase
          .from('gw_courses')
          .select('id, title')
          .eq('is_active', true);
        
        if (allCourses) {
          for (const course of allCourses) {
            const { count } = await supabase
              .from('gw_course_enrollments')
              .select('*', { count: 'exact', head: true })
              .eq('course_id', course.id)
              .eq('role', 'student')
              .eq('enrollment_status', 'enrolled');
            
            groups.push({
              id: course.id,
              title: course.title,
              studentCount: count || 0
            });
          }
        }
      }

      // Course groups for students (enrolled courses)
      else if (messengerRole === 'student') {
        const { data: enrolledCourses } = await supabase
          .from('gw_course_enrollments')
          .select('course_id, gw_courses!inner(id, title, is_active)')
          .eq('user_id', user.id)
          .eq('enrollment_status', 'enrolled')
          .eq('gw_courses.is_active', true);

        if (enrolledCourses) {
          for (const enrollment of enrolledCourses) {
            const course = (enrollment as any).gw_courses;
            if (!course?.id) continue;

            const { count } = await supabase
              .from('gw_course_enrollments')
              .select('*', { count: 'exact', head: true })
              .eq('course_id', course.id)
              .eq('role', 'student')
              .eq('enrollment_status', 'enrolled');

            groups.push({
              id: course.id,
              title: course.title,
              studentCount: count || 0
            });
          }
        }
      }

      setContacts(allContacts);
      setCourseGroups(groups);
    } catch (error) {
      console.error('Error loading messenger contacts:', error);
    } finally {
      setContactsLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [user, messengerRole, hasAccess]);

  // Include profile loading in overall loading state
  const isLoading = profileLoading || contactsLoading;

  return {
    hasAccess,
    messengerRole,
    isLoading,
    contacts,
    courseGroups,
    canMessageAnyone,
    canSendSMS,
    noAccessReason,
    refreshContacts: loadContacts
  };
};
