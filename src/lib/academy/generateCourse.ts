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
  if (error) {
    // supabase-js throws FunctionsHttpError on ANY non-2xx response and hands
    // it back as { data: null, error } where error.message is the fixed generic
    // "Edge Function returned a non-2xx status code". Our edge fn returns ALL
    // failures (403/400/422/500/502) as non-2xx, so the real, human-friendly
    // {error: "..."} body lives ONLY on error.context (the Response). Pull it.
    let body: any = null;
    try { body = await (error as any).context?.json?.(); } catch { /* no parseable body */ }
    return { ok: false, message: body?.error
      ? String(body.error)
      : `Couldn't generate the course: ${error.message ?? 'unknown error'}` };
  }
  // Belt-and-suspenders: surface {error} on a hypothetical future 2xx-with-error body.
  if (data?.error) return { ok: false, message: String(data.error) };
  if (!data?.course_code) return { ok: false, message: "Couldn't generate the course (no confirmation returned)." };
  return {
    ok: true,
    courseCode: String(data.course_code),
    message: `Draft "${String(data.title ?? '')}" created — ${data.module_count} modules, ${data.assignment_count} assignments, ${data.session_count} class sessions${data.quiz_count ? `, ${data.quiz_count} quizzes` : ''}.`,
  };
}
