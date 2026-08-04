// Student-picture tools. Every one is a thin pass-through to a security-invoker
// RPC — the database decides what the caller may see, not this file.
import type { Deps } from './executors.ts';

const RPC_FOR: Record<string, { fn: string; args: (a: Record<string, unknown>) => Record<string, unknown> }> = {
  get_assignments: { fn: 'sp_assignments', args: (a) => ({
    p_user_id: a.user_id ?? null, p_window: a.window ?? 'week', p_course_id: a.course_id ?? null }) },
  get_grades: { fn: 'sp_grades', args: (a) => ({
    p_user_id: a.user_id ?? null, p_course_id: a.course_id ?? null, p_detail: a.detail ?? 'summary' }) },
  get_grade_trend: { fn: 'sp_grade_trend', args: (a) => ({
    p_user_id: a.user_id ?? null, p_course_id: a.course_id ?? null, p_window: a.window ?? 5 }) },
  get_attendance: { fn: 'sp_attendance', args: (a) => ({
    p_user_id: a.user_id ?? null, p_days: a.days ?? 120 }) },
  get_balance: { fn: 'sp_balance', args: (a) => ({ p_user_id: a.user_id ?? null }) },
  get_roster_flags: { fn: 'sp_roster_flags', args: (a) => ({ p_flag: a.flag ?? 'failing' }) },
};

export async function executeStudentPictureTool(
  name: string, args: Record<string, unknown>, deps: Deps,
): Promise<string> {
  const spec = RPC_FOR[name];
  if (!spec) return JSON.stringify({ error: `Unknown tool: ${name}` });
  if (!deps.supabase.rpc) return JSON.stringify({ error: 'rpc unavailable' });
  const { data, error } = await deps.supabase.rpc(spec.fn, spec.args(args));
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify(data ?? { has_data: false, scope: 'self', rows: [] });
}
