// scripts/ssat/college.test.mjs
import { describe, it, expect } from 'vitest';
import { buildCollegeCourse, SSAT_RUBRIC } from './college.mjs';
import { assertValidExercise } from './engine.mjs';

const course = buildCollegeCourse();
const allExercises = course.units.flatMap((u) => u.lessons.flatMap((l) => l.exercises ?? []));

describe('college course structure', () => {
  it('has 15 units of 3 lessons each, titled Week N', () => {
    expect(course.slug).toBe('sight-singing-college');
    expect(course.level).toBe('college');
    expect(course.units).toHaveLength(15);
    course.units.forEach((u, i) => {
      expect(u.title).toMatch(new RegExp(`^Week ${i + 1}: `));
      expect(u.lessons).toHaveLength(3);
      expect(u.lessons[2].title).toMatch(/^Module Assignment/);
    });
  });
  it('every lesson has objectives and content', () => {
    for (const u of course.units) for (const l of u.lessons) {
      expect(l.objectives.length).toBeGreaterThanOrEqual(2);
      expect(l.content.length).toBeGreaterThan(80);
    }
  });
  it('every unit ends with an assignment exercise carrying the rubric', () => {
    for (const u of course.units) {
      const last = u.lessons[2].exercises.at(-1);
      expect(last.type).toBe('assignment');
      expect(last.rubric).toEqual(SSAT_RUBRIC);
      expect(last.instructions.length).toBeGreaterThanOrEqual(3);
      expect(last.deliverables.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('every notated exercise validates', () => {
  it('all irs, segments, parts, and items pass assertValidExercise', () => {
    let checked = 0;
    for (const ex of allExercises) {
      const irs = [
        ...(ex.ir ? [ex.ir] : []),
        ...(ex.segments ?? []),
        ...(ex.parts ?? []).map((p) => p.ir),
        ...(ex.items ?? []).map((i) => i.ir),
      ];
      for (const ir of irs) { assertValidExercise(ir); checked++; }
    }
    expect(checked).toBeGreaterThan(60);
  });
  it('is deterministic', () => {
    expect(JSON.stringify(buildCollegeCourse())).toBe(JSON.stringify(course));
  });
  it('covers the required breadth', () => {
    const types = new Set(allExercises.map((e) => e.type));
    for (const t of ['solfege_drill', 'melody', 'rhythm', 'ear_training', 'dictation', 'ensemble', 'assignment']) {
      expect(types.has(t)).toBe(true);
    }
    const meters = new Set(allExercises.flatMap((e) =>
      [e.ir, ...(e.segments ?? []), ...(e.parts ?? []).map((p) => p.ir)].filter(Boolean)
        .map((ir) => `${ir.meter.beats}/${ir.meter.beatType}`)));
    for (const m of ['2/4', '3/4', '4/4', '6/8', '9/8', '5/8', '7/8']) expect(meters.has(m)).toBe(true);
  });
});
