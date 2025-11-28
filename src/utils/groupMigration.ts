import { supabase } from '@/integrations/supabase/client';

/**
 * Utility to migrate MUS240 groups to the new academy system
 * Maps mus240_project_groups to gw_groups with legacy tracking
 */

export const migrateMus240GroupToAcademy = async (
  mus240GroupId: string,
  courseId: string
) => {
  try {
    // Fetch MUS240 group
    const { data: mus240Group, error: fetchError } = await supabase
      .from('mus240_project_groups')
      .select('*')
      .eq('id', mus240GroupId)
      .single();

    if (fetchError) throw fetchError;

    // Check if already migrated
    const { data: existing } = await supabase
      .from('gw_groups')
      .select('id')
      .eq('legacy_id', mus240GroupId)
      .eq('legacy_source', 'mus240_project_groups')
      .maybeSingle();

    if (existing) {
      return { success: true, groupId: existing.id, alreadyMigrated: true };
    }

    // Create new academy group
    const { data: newGroup, error: createError } = await supabase
      .from('gw_groups')
      .insert({
        course_id: courseId,
        name: mus240Group.name,
        description: mus240Group.description,
        max_members: mus240Group.max_members,
        leader_id: mus240Group.leader_id,
        is_active: true, // Default to active
        is_official: mus240Group.is_official,
        member_count: mus240Group.member_count,
        semester: mus240Group.semester,
        legacy_id: mus240GroupId,
        legacy_source: 'mus240_project_groups',
      })
      .select()
      .single();

    if (createError) throw createError;

    // Migrate members
    const { data: mus240Members } = await supabase
      .from('mus240_group_memberships')
      .select('*')
      .eq('group_id', mus240GroupId);

    if (mus240Members && mus240Members.length > 0) {
      const memberInserts = mus240Members.map(m => ({
        group_id: newGroup.id,
        user_id: m.member_id,
        role: m.role,
        joined_at: m.joined_at,
      }));

      const { error: membersError } = await supabase
        .from('gw_group_members')
        .insert(memberInserts);

      if (membersError) {
        console.error('Error migrating members:', membersError);
      }
    }

    // Migrate pending applications
    const { data: mus240Applications } = await supabase
      .from('mus240_group_applications')
      .select('*')
      .eq('group_id', mus240GroupId)
      .eq('status', 'pending');

    if (mus240Applications && mus240Applications.length > 0) {
      const appInserts = mus240Applications.map(a => ({
        group_id: newGroup.id,
        applicant_id: a.applicant_id,
        full_name: a.full_name,
        status: a.status,
        application_message: a.motivation || '', // Map motivation to application_message
        created_at: a.applied_at,
      }));

      const { error: appsError } = await supabase
        .from('gw_group_applications')
        .insert(appInserts);

      if (appsError) {
        console.error('Error migrating applications:', appsError);
      }
    }

    return { success: true, groupId: newGroup.id, alreadyMigrated: false };
  } catch (error) {
    console.error('Error migrating MUS240 group:', error);
    return { success: false, error };
  }
};

/**
 * Get a unified view of groups (both MUS240 and academy)
 */
export const getUnifiedGroups = async (courseCode: string) => {
  if (courseCode === 'MUS240') {
    // Fetch MUS240 groups
    const { data: mus240Groups } = await supabase
      .from('mus240_project_groups')
      .select('*')
      .order('created_at', { ascending: false });

    // Fetch corresponding academy groups
    const { data: course } = await supabase
      .from('gw_courses')
      .select('id')
      .eq('code', courseCode)
      .maybeSingle();

    if (course) {
      const { data: academyGroups } = await supabase
        .from('gw_groups')
        .select('*')
        .eq('course_id', course.id)
        .eq('is_active', true);

      return {
        mus240Groups: mus240Groups || [],
        academyGroups: academyGroups || [],
      };
    }

    return {
      mus240Groups: mus240Groups || [],
      academyGroups: [],
    };
  }

  // For other courses, just fetch academy groups
  const { data: course } = await supabase
    .from('gw_courses')
    .select('id')
    .eq('code', courseCode)
    .maybeSingle();

  if (!course) return { mus240Groups: [], academyGroups: [] };

  const { data: academyGroups } = await supabase
    .from('gw_groups')
    .select('*')
    .eq('course_id', course.id)
    .eq('is_active', true);

  return {
    mus240Groups: [],
    academyGroups: academyGroups || [],
  };
};
