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
  const { userProfile } = useUserProfile(user);
  const [isLoading, setIsLoading] = useState(true);
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
  const canMessageAnyone = messengerRole === 'super-admin';
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
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const allContacts: MessengerContact[] = [];
      const groups: MessengerCourseGroup[] = [];
      const seenUserIds = new Set<string>();

      // SUPER-ADMIN: Access to everyone
      if (messengerRole === 'super-admin') {
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

        // Load all courses for super-admin
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

      // ADMIN: Access to courses they administer (instructor role OR explicit admin)
      else if (messengerRole === 'admin') {
        // Get courses where admin is instructor
        const { data: instructorCourses } = await supabase
          .from('gw_course_enrollments')
          .select('course_id, gw_courses!inner(id, title, is_active)')
          .eq('user_id', user.id)
          .eq('role', 'instructor')
          .eq('gw_courses.is_active', true);

        const courseIds = new Set<string>();
        
        if (instructorCourses) {
          instructorCourses.forEach((c: any) => {
            if (c.gw_courses?.id) {
              courseIds.add(c.gw_courses.id);
            }
          });
        }

        // Get students from admin's courses
        for (const courseId of courseIds) {
          const { data: courseInfo } = await supabase
            .from('gw_courses')
            .select('title')
            .eq('id', courseId)
            .single();

          const { data: enrollments, count } = await supabase
            .from('gw_course_enrollments')
            .select('user_id, gw_profiles!inner(user_id, full_name, email, phone_number, role)', { count: 'exact' })
            .eq('course_id', courseId)
            .eq('enrollment_status', 'enrolled');

          if (enrollments) {
            enrollments.forEach((e: any) => {
              const profile = e.gw_profiles;
              if (profile && !seenUserIds.has(profile.user_id) && profile.user_id !== user.id) {
                seenUserIds.add(profile.user_id);
                allContacts.push({
                  user_id: profile.user_id,
                  full_name: profile.full_name,
                  email: profile.email,
                  phone_number: profile.phone_number,
                  role: profile.role,
                  source: 'course'
                });
              }
            });
          }

          groups.push({
            id: courseId,
            title: courseInfo?.title || 'Unknown Course',
            studentCount: count || 0
          });
        }
      }

      // STUDENT: Access to classmates + instructors in enrolled courses
      else if (messengerRole === 'student') {
        // Get all courses the student is enrolled in
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

            // Get all students and instructors in this course
            const { data: classmates, count } = await supabase
              .from('gw_course_enrollments')
              .select('user_id, role, gw_profiles!inner(user_id, full_name, email, phone_number, role)', { count: 'exact' })
              .eq('course_id', course.id)
              .eq('enrollment_status', 'enrolled');

            if (classmates) {
              classmates.forEach((c: any) => {
                const profile = c.gw_profiles;
                if (profile && !seenUserIds.has(profile.user_id) && profile.user_id !== user.id) {
                  seenUserIds.add(profile.user_id);
                  allContacts.push({
                    user_id: profile.user_id,
                    full_name: profile.full_name,
                    email: profile.email,
                    phone_number: profile.phone_number,
                    role: c.role === 'instructor' ? 'Instructor' : profile.role,
                    source: 'course'
                  });
                }
              });
            }

            // Count only students for the group
            const studentCount = classmates?.filter((c: any) => c.role === 'student').length || 0;
            groups.push({
              id: course.id,
              title: course.title,
              studentCount
            });
          }
        }
      }

      // ALUMNA: Access to other alumnae + mentees
      else if (messengerRole === 'alumna') {
        // Get all alumnae
        const { data: alumnae } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, email, phone_number, role')
          .in('role', ['alumna', 'alumnae', 'Alumna', 'Alumnae'])
          .neq('user_id', user.id)
          .order('full_name');

        if (alumnae) {
          alumnae.forEach(a => {
            if (!seenUserIds.has(a.user_id)) {
              seenUserIds.add(a.user_id);
              allContacts.push({ ...a, source: 'alumna' });
            }
          });
        }

        // Get mentees (students this alumna is mentoring)
        const { data: mentorships } = await supabase
          .from('alumnae_users')
          .select('user_id')
          .eq('user_id', user.id)
          .eq('is_mentor', true)
          .single();

        if (mentorships) {
          // If this alumna is a mentor, get students who opted in for mentorship
          const { data: mentees } = await supabase
            .from('gw_profiles')
            .select('user_id, full_name, email, phone_number, role')
            .eq('role', 'student')
            .order('full_name');

          // Note: A full mentorship system would have a mentor_mentee table
          // For now, we show students who may be interested in mentorship
          if (mentees) {
            mentees.forEach(m => {
              if (!seenUserIds.has(m.user_id)) {
                seenUserIds.add(m.user_id);
                allContacts.push({ ...m, source: 'mentee' });
              }
            });
          }
        }
      }

      setContacts(allContacts);
      setCourseGroups(groups);
    } catch (error) {
      console.error('Error loading messenger contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [user, messengerRole, hasAccess]);

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
