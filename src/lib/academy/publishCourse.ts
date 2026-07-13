// Publish a draft course: flip status, enroll the resolved pending roster,
// and hand unresolved names back to the UI. Enrollment happens at publish,
// never at draft (Assistant Course Builder spec).

interface PendingEnrollment { user_id?: string; name: string }

interface PublishableCourse {
  id: string;
  pending_enrollments: PendingEnrollment[] | null;
}

interface SupabaseLike { from: (table: string) => any }

export interface PublishResult {
  ok: boolean;
  unresolvedNames: string[];
  message: string;
}

export async function publishCourse(supabase: SupabaseLike, course: PublishableCourse): Promise<PublishResult> {
  const pending = Array.isArray(course.pending_enrollments) ? course.pending_enrollments : [];
  const resolved = pending.filter((p): p is Required<PendingEnrollment> => typeof p.user_id === 'string' && p.user_id.length > 0);
  const unresolvedNames = pending.filter((p) => !p.user_id).map((p) => p.name);

  const { data: updated, error: updateErr } = await supabase
    .from('gw_courses')
    .update({ status: 'published', pending_enrollments: unresolvedNames.length ? pending.filter((p) => !p.user_id) : null })
    .eq('id', course.id)
    .select();
  if (updateErr || !updated?.length) {
    return { ok: false, unresolvedNames, message: `Couldn't publish${updateErr ? `: ${updateErr.message}` : ' (no row updated — check permissions)'}.` };
  }

  if (resolved.length) {
    const rows = resolved.map((p) => ({
      course_id: course.id, user_id: p.user_id, role: 'student', enrollment_status: 'enrolled',
    }));
    const { error: enrollErr } = await supabase
      .from('gw_course_enrollments')
      .upsert(rows, { onConflict: 'course_id,user_id', ignoreDuplicates: true })
      .select();
    if (enrollErr) {
      return {
        ok: true, unresolvedNames,
        message: `Published, but enrolling students failed: ${enrollErr.message}. Add them from the People tab.`,
      };
    }
  }

  return {
    ok: true,
    unresolvedNames,
    message: unresolvedNames.length
      ? `Published. ${resolved.length} student${resolved.length === 1 ? '' : 's'} enrolled. Still to add manually: ${unresolvedNames.join(', ')}.`
      : `Published${resolved.length ? ` — ${resolved.length} student${resolved.length === 1 ? '' : 's'} enrolled` : ''}.`,
  };
}
