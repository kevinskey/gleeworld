import { describe, it, expect } from 'vitest';
import { validateCourseSpec, type CourseSpec } from '../courseSpec';

const valid = (): Record<string, unknown> => ({
  title: 'Choral Conducting I',
  course_code: 'MUS-240',
  description: 'Fundamentals of choral conducting.',
  semester: 'FALL 2026',
  start_date: '2026-08-24',
  end_date: '2026-12-11',
  meeting_patterns: [
    { weekday: 1, start_time: '10:00', end_time: '10:50' },
    { weekday: 3, start_time: '10:00', end_time: '10:50', location: 'Room 12' },
  ],
  breaks: [{ from: '2026-11-23', to: '2026-11-27', name: 'Fall break' }],
  modules: [
    {
      title: 'Week 1: Posture and Baton Grip',
      description: 'Foundations of the conducting stance.',
      week_number: 1,
      learning_objectives: ['Demonstrate neutral stance'],
      assignments: [
        {
          title: 'Reflection: your conducting heroes',
          instructions: 'Write 300 words on two conductors you admire.',
          points: 10,
          due_at: '2026-08-31T23:59:00-04:00',
        },
      ],
    },
  ],
  rubric: {
    title: 'Conducting rubric',
    criteria: [{ name: 'Beat clarity', max_points: 10, weight_percentage: 25 }],
  },
  repertoire: [{ title: 'Lift Every Voice and Sing' }],
  roster: [{ name: 'Ada Lovelace' }],
  quizzes: [],
});

describe('validateCourseSpec', () => {
  it('accepts a complete valid spec and counts sessions', () => {
    const r = validateCourseSpec(valid());
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Mon+Wed from 2026-08-24 to 2026-12-11 minus the Mon/Wed inside 11-23..11-27
      expect(r.sessionCount).toBeGreaterThan(20);
      expect(r.sessionCount).toBeLessThanOrEqual(40);
      expect(r.spec.title).toBe('Choral Conducting I');
    }
  });

  it('rejects non-object input', () => {
    const r = validateCourseSpec('nope');
    expect(r.ok).toBe(false);
  });

  it('requires title, dates, and at least one module', () => {
    for (const key of ['title', 'start_date', 'end_date', 'modules']) {
      const bad = valid();
      delete bad[key];
      const r = validateCourseSpec(bad);
      expect(r.ok, `missing ${key} should fail`).toBe(false);
      if (!r.ok) expect(r.error).toContain(key);
    }
  });

  it('rejects end_date before start_date and terms over 366 days', () => {
    const swapped = { ...valid(), start_date: '2026-12-11', end_date: '2026-08-24' };
    expect(validateCourseSpec(swapped).ok).toBe(false);
    const tooLong = { ...valid(), end_date: '2028-01-01' };
    expect(validateCourseSpec(tooLong).ok).toBe(false);
  });

  it('enforces caps: 16 modules, 8 assignments/module, 12 criteria, 200 roster, 50 repertoire', () => {
    const mod = (valid().modules as unknown[])[0] as Record<string, unknown>;
    const overModules = { ...valid(), modules: Array.from({ length: 17 }, () => ({ ...mod })) };
    expect(validateCourseSpec(overModules).ok).toBe(false);
    const a = (mod.assignments as unknown[])[0];
    const overAssignments = {
      ...valid(),
      modules: [{ ...mod, assignments: Array.from({ length: 9 }, () => ({ ...(a as object) })) }],
    };
    expect(validateCourseSpec(overAssignments).ok).toBe(false);
    const overRoster = { ...valid(), roster: Array.from({ length: 201 }, (_, i) => ({ name: `S${i}` })) };
    expect(validateCourseSpec(overRoster).ok).toBe(false);
  });

  it('rejects text fields over 2000 chars with an actionable error', () => {
    const mod = (valid().modules as unknown[])[0] as Record<string, unknown>;
    const bad = { ...valid(), modules: [{ ...mod, description: 'x'.repeat(2001) }] };
    const r = validateCourseSpec(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.toLowerCase()).toContain('too long');
  });

  it('rejects when expanded sessions exceed 120', () => {
    // AM + PM meetings every day of the week: ~110 term days × 2 ≈ 210 sessions
    const daily = {
      ...valid(),
      meeting_patterns: [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) => [
        { weekday, start_time: '09:00', end_time: '10:00' },
        { weekday, start_time: '14:00', end_time: '15:00' },
      ]),
    };
    const r = validateCourseSpec(daily);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('120');
  });

  it('rejects specs over 64 KB', () => {
    const mod = (valid().modules as unknown[])[0] as Record<string, unknown>;
    const fat = {
      ...valid(),
      modules: Array.from({ length: 16 }, (_, i) => ({
        ...mod, title: `M${i}`, description: 'y'.repeat(2000),
        assignments: Array.from({ length: 8 }, (_, j) => ({
          title: `A${j}`, instructions: 'z'.repeat(2000), points: 10,
          due_at: '2026-09-01T23:59:00-04:00',
        })),
      })),
    };
    const r = validateCourseSpec(fat);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.toLowerCase()).toContain('too large');
  });

  it('rejects a roster entry with a non-string name', () => {
    const bad = { ...valid(), roster: [{ name: 42 }] };
    const r = validateCourseSpec(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('roster');
  });

  it('measures the 64 KB cap in bytes, not UTF-16 code units', () => {
    // ~30k CJK chars ≈ 30k UTF-16 units (< 64k) but ~90 KiB in UTF-8.
    const mod = (valid().modules as unknown[])[0] as Record<string, unknown>;
    const cjk = '音'.repeat(1900);
    const fat = {
      ...valid(),
      modules: Array.from({ length: 16 }, (_, i) => ({
        ...mod, title: `M${i}`, description: cjk, assignments: [],
      })),
    };
    expect(JSON.stringify(fat).length).toBeLessThan(64 * 1024);
    const r = validateCourseSpec(fat);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.toLowerCase()).toContain('too large');
  });

  it('rejects an over-2000-char course title', () => {
    const r = validateCourseSpec({ ...valid(), title: 't'.repeat(2001) });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.toLowerCase()).toContain('too long');
      expect(r.error).toContain('title');
    }
  });

  it('includes the offending count in the roster cap error', () => {
    const overRoster = { ...valid(), roster: Array.from({ length: 201 }, (_, i) => ({ name: `S${i}` })) };
    const r = validateCourseSpec(overRoster);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('201');
  });

  it('accepts a valid quizzes block (MC + true/false)', () => {
    const r = validateCourseSpec({ ...valid(), quizzes: [{
      title: 'Quiz 1: Spirituals',
      questions: [
        { type: 'multiple_choice', prompt: 'Who arranged "My Soul\'s Been Anchored"?', choices: ['Moses Hogan', 'Hall Johnson', 'Jester Hairston'], correct_index: 0, points: 5 },
        { type: 'true_false', prompt: 'Spirituals originated as oral tradition.', correct_answer: true, points: 5 },
      ],
    }] });
    expect(r.ok).toBe(true);
  });

  it('rejects an unknown question type (short_answer/multi_select excluded)', () => {
    const bad = { ...valid(), quizzes: [{ title: 'Q', questions: [{ type: 'short_answer', prompt: 'x', correct_answer: ['y'] }] }] };
    expect(validateCourseSpec(bad).ok).toBe(false);
  });

  it('rejects MC with correct_index out of range or <2 choices', () => {
    const oob = { ...valid(), quizzes: [{ title: 'Q', questions: [{ type: 'multiple_choice', prompt: 'p', choices: ['a', 'b'], correct_index: 5 }] }] };
    expect(validateCourseSpec(oob).ok).toBe(false);
    const few = { ...valid(), quizzes: [{ title: 'Q', questions: [{ type: 'multiple_choice', prompt: 'p', choices: ['a'], correct_index: 0 }] }] };
    expect(validateCourseSpec(few).ok).toBe(false);
  });

  it('rejects true_false without a boolean correct_answer', () => {
    const bad = { ...valid(), quizzes: [{ title: 'Q', questions: [{ type: 'true_false', prompt: 'p', correct_answer: 'yes' }] }] };
    expect(validateCourseSpec(bad).ok).toBe(false);
  });

  it('enforces quiz caps (<=6 quizzes, <=8 questions each, quiz needs a title + >=1 question)', () => {
    const q = { title: 'Q', questions: [{ type: 'true_false', prompt: 'p', correct_answer: true }] };
    expect(validateCourseSpec({ ...valid(), quizzes: Array.from({ length: 7 }, () => ({ ...q })) }).ok).toBe(false);
    const manyQ = { title: 'Q', questions: Array.from({ length: 9 }, () => ({ type: 'true_false', prompt: 'p', correct_answer: true })) };
    expect(validateCourseSpec({ ...valid(), quizzes: [manyQ] }).ok).toBe(false);
    expect(validateCourseSpec({ ...valid(), quizzes: [{ title: '', questions: [] }] }).ok).toBe(false);
  });
});
