// Pure TS — builds the generation prompt from the form inputs. Imported by the
// edge function and by Vitest; no Deno/browser APIs.

export interface CourseFormInput {
  title: string;
  subject?: string;
  level?: string;
  term_start: string; // YYYY-MM-DD
  term_end: string;   // YYYY-MM-DD
  meeting_patterns: Array<{ weekday: number; start_time: string; end_time: string; location?: string }>;
  learning_goals?: string;
  grading_approach?: string;
  repertoire?: Array<{ library_item_id?: string; title: string }>;
  roster?: Array<{ user_id?: string; name: string }>;
}

export function buildGenerationMessages(
  input: CourseFormInput,
  nowIso: string,
): Array<{ role: 'system' | 'user'; content: string }> {
  const system = [
    'You are an expert music-education instructional designer for the GleeWorld Academy.',
    'Produce a COMPLETE course as ONE JSON object matching this CourseSpec shape (no prose, no markdown fences):',
    '{',
    '  "title": string, "course_code": string (suggest e.g. MUS-240), "description": string, "semester": string,',
    '  "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD",',
    '  "meeting_patterns": [{ "weekday": 0-6 (0=Sunday), "start_time": "HH:MM", "end_time": "HH:MM", "location"?: string }],',
    '  "modules": [{ "title": string, "description": string (2-5 sentences), "week_number": number,',
    '     "learning_objectives": [string],',
    '     "assignments": [{ "title": string, "instructions": string (a full authored prompt the student reads),',
    '        "points": number, "due_at": "ISO datetime with timezone", "assignment_type"?: string }] }],',
    '  "rubric": { "title": string, "criteria": [{ "name": string, "max_points": number, "weight_percentage": number }] },',
    '  "repertoire"?: [{ "library_item_id"?: string, "title": string }],',
    '  "roster"?: [{ "user_id"?: string, "name": string }],',
    '  "quizzes"?: [{ "title": string, "description"?: string, "module_week"?: number, "questions": [',
    '     { "type": "multiple_choice", "prompt": string, "choices": [string], "correct_index": number (0-based), "points"?: number, "explanation"?: string }',
    '     | { "type": "true_false", "prompt": string, "correct_answer": boolean, "points"?: number, "explanation"?: string } ] }]',
    '}',
    'Rules: author real module descriptions and real assignment prompts (never stubs). Derive rubric criteria/weights from the grading approach. Copy meeting_patterns straight from the input. Pass repertoire and roster through unchanged. Quizzes: for the modules that suit a short assessment (NOT every module), draft a quiz of 3-5 questions using ONLY "multiple_choice" and "true_false". Mark the correct answer (correct_index for MC, correct_answer boolean for true/false), keep questions factual and unambiguous, add a one-line explanation each. At most 6 quizzes total. Put the module/topic in the quiz title. These are drafts the teacher will review before publishing.',
    'Keep the whole course COMPACT so it fits in one response: at most 12 modules (roughly one per week of the term), 1-2 assignments per module, module descriptions 2-3 sentences, assignment instructions ~60-120 words, and 3-6 rubric criteria. Return the COMPLETE JSON object — never truncate it.',
    `Now: ${nowIso}.`,
  ].join('\n');

  const user = [
    'Create a course from these inputs:',
    `- Title: ${input.title}`,
    input.subject ? `- Subject: ${input.subject}` : '',
    input.level ? `- Level: ${input.level}` : '',
    `- Term: ${input.term_start} to ${input.term_end}`,
    `- Meeting patterns (JSON): ${JSON.stringify(input.meeting_patterns)}`,
    input.learning_goals ? `- Learning goals: ${input.learning_goals}` : '',
    input.grading_approach ? `- Grading approach: ${input.grading_approach}` : '',
    input.repertoire?.length ? `- Repertoire (JSON): ${JSON.stringify(input.repertoire)}` : '',
    input.roster?.length ? `- Roster (JSON): ${JSON.stringify(input.roster)}` : '',
    'Return ONLY the CourseSpec JSON object.',
  ].filter(Boolean).join('\n');

  return [{ role: 'system', content: system }, { role: 'user', content: user }];
}
