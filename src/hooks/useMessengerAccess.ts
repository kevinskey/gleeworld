import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { normalizeMessengerProfile } from '@/lib/messenger-contacts';

export type MessengerRole = 'super-admin' | 'admin' | 'student' | 'graduate' | 'fan' | 'none';

export interface MessengerContact {
  user_id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  role?: string;
  source: 'course' | 'graduate' | 'mentee' | 'all';
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

  const messengerRole = useMemo((): MessengerRole => {
    if (!userProfile) return 'none';

    if (userProfile.is_super_admin) return 'super-admin';
    if (userProfile.is_admin) return 'admin';

    const role = userProfile.role?.toLowerCase();
    if (role === 'graduate' || role === 'graduates') return 'graduate';
    if (role === 'student' || role === 'member') return 'student';
    if (role === 'fan') return 'fan';

    return 'none';
  }, [userProfile]);

  const hasAccess = messengerRole !== 'fan' && messengerRole !== 'none';
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

      // Include the logged-in user themselves in the recipient list — useful
      // for admins running test broadcasts. The UI will still skip self-sends
      // at the actual send step if needed.
      const { data: allUsers } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, first_name, last_name, email, phone, phone_number, role, status')
        .eq('status', 'active')
        .not('user_id', 'is', null);

      if (allUsers) {
        const normalizedUsers = allUsers
          .map(normalizeMessengerProfile)
          .filter((profile) => profile.user_id)
          .sort((a, b) => a.full_name.localeCompare(b.full_name));

        normalizedUsers.forEach((profile) => {
          if (seenUserIds.has(profile.user_id)) return;

          seenUserIds.add(profile.user_id);
          allContacts.push({
            user_id: profile.user_id,
            full_name: profile.full_name,
            email: profile.email,
            phone_number: profile.phone_number || undefined,
            role: profile.role || undefined,
            source: 'all',
          });
        });
      }

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
              studentCount: count || 0,
            });
          }
        }
      } else if (messengerRole === 'student') {
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
              studentCount: count || 0,
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
    refreshContacts: loadContacts,
  };
};
