export interface CourseFormInput {
  title: string;
  subject?: string;
  level?: string;
  term_start: string;
  term_end: string;
  meeting_patterns: Array<{ weekday: number; start_time: string; end_time: string; location?: string }>;
  learning_goals?: string;
  grading_approach?: string;
  repertoire?: Array<{ library_item_id?: string; title: string }>;
  roster?: Array<{ user_id?: string; name: string }>;
}

interface SupabaseLike {
  functions: { invoke: (name: string, opts: { body: unknown }) => Promise<{ data: any; error: any }> };
}

export type GenerateResult =
  | { ok: true; courseCode: string; message: string }
  | { ok: false; message: string };

export async function generateCourse(supabase: SupabaseLike, input: CourseFormInput): Promise<GenerateResult> {
  const { data, error } = await supabase.functions.invoke('generate-course-draft', { body: input });
  if (error) return { ok: false, message: `Couldn't generate the course: ${error.message ?? 'unknown error'}` };
  // Edge fn returns {error} in the body for handled 4xx (invoke surfaces those as data).
  if (data?.error) return { ok: false, message: String(data.error) };
  if (!data?.course_code) return { ok: false, message: "Couldn't generate the course (no confirmation returned)." };
  return {
    ok: true,
    courseCode: String(data.course_code),
    message: `Draft "${String(data.title ?? '')}" created — ${data.module_count} modules, ${data.assignment_count} assignments, ${data.session_count} class sessions.`,
  };
}
