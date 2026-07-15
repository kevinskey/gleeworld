import { describe, it, expect } from 'vitest';
import { buildGenerationMessages, type CourseFormInput } from '../prompt';

const input: CourseFormInput = {
  title: 'Choral Conducting I',
  subject: 'Choral conducting', level: 'Undergraduate',
  term_start: '2026-08-24', term_end: '2026-12-11',
  meeting_patterns: [{ weekday: 1, start_time: '10:00', end_time: '10:50' }],
  learning_goals: 'Beat patterns; cueing; score study.',
  grading_approach: 'Weekly reflections 20%, two performances 60%, final 20%.',
  repertoire: [{ title: 'Lift Every Voice and Sing' }],
  roster: [{ name: 'Ada Lovelace' }],
};

describe('buildGenerationMessages', () => {
  it('produces a system + user message carrying the form inputs and the JSON contract', () => {
    const msgs = buildGenerationMessages(input, '2026-07-14T12:00:00Z');
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('system');
    expect(msgs[1].role).toBe('user');
    const all = msgs.map((m) => m.content).join('\n');
    expect(all).toContain('CourseSpec');            // names the target schema
    expect(all).toContain('Choral Conducting I');   // title threaded in
    expect(all).toContain('2026-08-24');            // dates threaded in
    expect(all).toContain('reflections');           // grading approach threaded in
    expect(all.toLowerCase()).toContain('json');    // instructs JSON-only
    // meeting patterns serialized for the model
    expect(all).toContain('"weekday"');
  });

  it('tolerates missing optional fields', () => {
    const msgs = buildGenerationMessages(
      { title: 'X', term_start: '2026-08-24', term_end: '2026-09-24', meeting_patterns: [] },
      '2026-07-14T12:00:00Z',
    );
    expect(msgs[1].content).toContain('X');
  });

  it('instructs quiz drafting with only multiple_choice and true_false', () => {
    const msgs = buildGenerationMessages(input, '2026-07-14T12:00:00Z');
    const all = msgs.map((m) => m.content).join('\n');
    expect(all).toContain('quizzes');
    expect(all).toContain('multiple_choice');
    expect(all).toContain('true_false');
    expect(all).toContain('correct_index');
  });
});
