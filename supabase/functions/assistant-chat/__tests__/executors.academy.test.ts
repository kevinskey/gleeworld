import { describe, it, expect } from 'vitest';
import { executeServerTool } from '../executors';

/** Chainable stub that resolves per-TABLE — the academy tools join across
 *  gw_courses, gw_course_enrollments, assignments, tests and profiles, so a
 *  single shared row set (the stub the other suite uses) can't exercise them. */
function tableStub(tables: Record<string, unknown[]>) {
  return {
    from: (name: string) => {
      const builder: any = {};
      for (const m of ['select', 'gte', 'lte', 'lt', 'eq', 'is', 'or', 'in', 'ilike', 'order', 'limit']) {
        builder[m] = () => builder;
      }
      builder.then = (resolve: (v: unknown) => void) => resolve({ data: tables[name] ?? [], error: null });
      return builder;
    },
  } as any;
}

const COURSES = [
  {
    id: 'c1', title: 'Sight Reading', course_code: 'GW102', semester: 'Fall 2026',
    instructor_name: 'Kevin Johnson', instructor_email: 'kevin@x.org',
    description: 'Prerequisite: Music Fundamentals. Weekly melodic drills.',
    is_active: true,
  },
  { id: 'c2', title: 'Concert Choir', code: 'CC-01', semester: 'Fall 2026', instructor_name: 'Dana Director', is_active: true },
];

describe('list_courses', () => {
  it('lists every visible course with instructor and term', async () => {
    const out = await executeServerTool('list_courses', {}, { supabase: tableStub({ gw_courses: COURSES }) });
    const parsed = JSON.parse(out.replyJson);
    expect(parsed.has_data).toBe(true);
    expect(parsed.count).toBe(2);
    expect(parsed.courses[0].instructor).toBe('Kevin Johnson');
    expect(parsed.courses[0].code).toBe('GW102');
  });

  it('filters by spoken name or code', async () => {
    const out = await executeServerTool('list_courses', { query: 'sight' }, { supabase: tableStub({ gw_courses: COURSES }) });
    const parsed = JSON.parse(out.replyJson);
    expect(parsed.count).toBe(1);
    expect(parsed.courses[0].title).toBe('Sight Reading');
  });

  it('marks the courses the caller is enrolled in', async () => {
    const out = await executeServerTool('list_courses', {}, {
      supabase: tableStub({ gw_courses: COURSES, gw_course_enrollments: [{ course_id: 'c1', user_id: 'u1' }] }),
    });
    const parsed = JSON.parse(out.replyJson);
    const sight = parsed.courses.find((c: { id: string }) => c.id === 'c1');
    expect(sight.caller_enrolled).toBe(true);
  });
});

describe('get_course_info', () => {
  it('resolves by code and returns the description that carries prerequisites', async () => {
    const out = await executeServerTool('get_course_info', { course: 'gw102' }, {
      supabase: tableStub({ gw_courses: COURSES }), role: 'member',
    });
    const parsed = JSON.parse(out.replyJson);
    expect(parsed.has_data).toBe(true);
    expect(parsed.course.title).toBe('Sight Reading');
    expect(parsed.course.description).toContain('Prerequisite');
    expect(parsed.note).toContain('Prerequisites');
  });

  it('reports class size to admins but only self-enrollment to members', async () => {
    const tables = {
      gw_courses: COURSES,
      gw_course_enrollments: [{ id: 'e1', user_id: 'u1' }, { id: 'e2', user_id: 'u2' }],
    };
    const admin = JSON.parse((await executeServerTool('get_course_info', { course: 'Sight Reading' },
      { supabase: tableStub(tables), role: 'admin' })).replyJson);
    expect(admin.visible_enrollment_count).toBe(2);
    const member = JSON.parse((await executeServerTool('get_course_info', { course: 'Sight Reading' },
      { supabase: tableStub(tables), role: 'member' })).replyJson);
    expect(member.visible_enrollment_count).toBeUndefined();
    expect(member.caller_enrolled).toBe(true);
  });

  it('is honest when nothing matches', async () => {
    const out = await executeServerTool('get_course_info', { course: 'Basket Weaving' },
      { supabase: tableStub({ gw_courses: COURSES }) });
    expect(JSON.parse(out.replyJson).has_data).toBe(false);
  });
});

describe('get_course_deadlines', () => {
  const tables = {
    gw_courses: COURSES,
    gw_course_assignments: [
      { course_id: 'c1', title: 'Rhythm packet', assignment_type: 'homework', points: 10, due_date: '2026-09-01', is_published: true },
      { course_id: 'c1', title: 'Hidden draft', due_date: '2026-09-02', is_published: false },
    ],
    gw_assignments: [
      { course_id: 'c2', title: 'Memorize mvt 1', due_at: '2026-08-20T00:00:00Z', is_active: true },
    ],
    gw_course_tests: [
      { course_id: 'c1', title: 'Midterm', test_type: 'exam', total_points: 100, available_from: '2026-10-01', available_until: '2026-10-03', is_published: true },
    ],
  };

  it('merges assignments and tests across sources, dated order, unpublished dropped', async () => {
    const out = await executeServerTool('get_course_deadlines', {}, { supabase: tableStub(tables) });
    const parsed = JSON.parse(out.replyJson);
    expect(parsed.has_data).toBe(true);
    expect(parsed.deadlines.map((d: { title: string }) => d.title))
      .toEqual(['Memorize mvt 1', 'Rhythm packet', 'Midterm']);
    expect(parsed.deadlines.find((d: { title: string }) => d.title === 'Hidden draft')).toBeUndefined();
    expect(parsed.deadlines[2].kind).toBe('exam');
  });

  it('labels each deadline with its course title', async () => {
    const out = await executeServerTool('get_course_deadlines', {}, { supabase: tableStub(tables) });
    const parsed = JSON.parse(out.replyJson);
    expect(parsed.deadlines[0].course).toBe('Concert Choir');
    expect(parsed.deadlines[1].course).toBe('Sight Reading');
  });
});

describe('get_enrollments', () => {
  const tables = {
    gw_courses: COURSES,
    gw_course_enrollments: [
      { course_id: 'c1', user_id: 'u1', role: 'student', enrollment_status: 'active', enrolled_at: '2026-08-01' },
      { course_id: 'c2', user_id: 'u2', role: 'student', enrollment_status: 'active', enrolled_at: '2026-08-02' },
    ],
    gw_profiles: [
      { user_id: 'u1', full_name: 'Maria Alto' },
      { user_id: 'u2', full_name: 'James Bass' },
    ],
  };

  it('names students and their courses', async () => {
    const out = await executeServerTool('get_enrollments', {}, { supabase: tableStub(tables), role: 'admin' });
    const parsed = JSON.parse(out.replyJson);
    expect(parsed.has_data).toBe(true);
    expect(parsed.enrollments).toContainEqual(expect.objectContaining({ student: 'Maria Alto', course: 'Sight Reading' }));
    // Never overstates: even the admin wording claims only what RLS exposed.
    expect(parsed.scope).toContain('your permissions expose');
  });

  it('filters by person name', async () => {
    const out = await executeServerTool('get_enrollments', { user_name: 'maria' }, { supabase: tableStub(tables), role: 'admin' });
    const parsed = JSON.parse(out.replyJson);
    expect(parsed.enrollments).toHaveLength(1);
    expect(parsed.enrollments[0].student).toBe('Maria Alto');
  });

  it('tells members their view is only their own rows', async () => {
    const out = await executeServerTool('get_enrollments', {}, { supabase: tableStub(tables), role: 'member' });
    expect(JSON.parse(out.replyJson).scope).toContain('your own');
  });
});

describe('lookup_hymn', () => {
  const HYMNALS = [
    { id: 'LMGM2012', title: 'Lead Me, Guide Me (2nd ed.)', short_name: 'LMGM II' },
    { id: 'GC2', title: 'Gather Comprehensive, Second Edition', short_name: 'Gather' },
  ];
  const INDEX = [
    { hymnal_id: 'LMGM2012', number: '457', title: 'Total Praise', tune_title: null },
    { hymnal_id: 'GC2', number: '520', title: 'Total Praise', tune_title: null },
  ];

  it('returns the number in every hymnal that carries the hymn', async () => {
    const out = await executeServerTool('lookup_hymn', { query: 'Total Praise' },
      { supabase: tableStub({ gw_hymnals: HYMNALS, gw_hymn_index: INDEX }) });
    const parsed = JSON.parse(out.replyJson);
    expect(parsed.has_data).toBe(true);
    expect(parsed.hymns).toContainEqual(expect.objectContaining({ hymnal: 'LMGM II', number: '457' }));
    expect(parsed.hymns).toContainEqual(expect.objectContaining({ hymnal: 'Gather', number: '520' }));
  });

  it('lists the loaded hymnals when the named one is unknown', async () => {
    const out = await executeServerTool('lookup_hymn', { query: 'Total Praise', hymnal: 'OCP Breaking Bread' },
      { supabase: tableStub({ gw_hymnals: HYMNALS, gw_hymn_index: INDEX }) });
    const parsed = JSON.parse(out.replyJson);
    expect(parsed.has_data).toBe(false);
    expect(parsed.available_hymnals.join(' ')).toContain('LMGM II');
  });

  it('forbids guessing on a miss', async () => {
    const out = await executeServerTool('lookup_hymn', { query: 'Nonexistent Hymn Title' },
      { supabase: tableStub({ gw_hymnals: HYMNALS, gw_hymn_index: [] }) });
    const parsed = JSON.parse(out.replyJson);
    expect(parsed.has_data).toBe(false);
    expect(parsed.note).toMatch(/Do not guess/);
  });

  it('requires a query or a number', async () => {
    const out = await executeServerTool('lookup_hymn', {},
      { supabase: tableStub({ gw_hymnals: HYMNALS, gw_hymn_index: INDEX }) });
    expect(JSON.parse(out.replyJson).error).toBeTruthy();
  });
});
