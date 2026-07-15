import { describe, it, expect, vi } from 'vitest';
import { generateCourse } from '../generateCourse';

const input = {
  title: 'Choral Conducting I', term_start: '2026-08-24', term_end: '2026-12-11',
  meeting_patterns: [{ weekday: 1, start_time: '10:00', end_time: '10:50' }],
};

function sb(resp: { data?: unknown; error?: unknown }) {
  return { functions: { invoke: vi.fn().mockResolvedValue(resp) } } as any;
}

describe('generateCourse', () => {
  it('invokes the edge fn and returns the course code on success', async () => {
    const supabase = sb({ data: { course_id: 'c1', course_code: 'MUS-240', module_count: 4, assignment_count: 9, session_count: 28, quiz_count: 2 }, error: null });
    const r = await generateCourse(supabase, input);
    expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-course-draft', { body: input });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.courseCode).toBe('MUS-240'); expect(r.message).toContain('4 modules'); expect(r.message).toContain('2 quizzes'); }
  });

  it('falls back to the generic message when the error has no parseable body', async () => {
    const r = await generateCourse(sb({ data: null, error: { message: 'boom' } }), input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('boom');
  });

  it('surfaces the real {error} body from a non-2xx FunctionsHttpError (error.context)', async () => {
    // supabase-js wraps every non-2xx as a FunctionsHttpError: error.message is the
    // fixed generic string; the real body is only on error.context (the Response).
    const httpErr = {
      message: 'Edge Function returned a non-2xx status code',
      context: { json: () => Promise.resolve({ error: 'Only a director or admin can create courses.' }) },
    };
    const r = await generateCourse(sb({ data: null, error: httpErr }), input);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain('director or admin');
      expect(r.message).not.toContain('non-2xx'); // the useless generic message must NOT leak through
    }
  });

  it('treats a missing course_code as failure', async () => {
    const r = await generateCourse(sb({ data: {}, error: null }), input);
    expect(r.ok).toBe(false);
  });
});
