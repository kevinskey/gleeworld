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
    '  "roster"?: [{ "user_id"?: string, "name": string }]',
    '}',
    'Rules: author real module descriptions and real assignment prompts (never stubs). Derive rubric criteria/weights from the grading approach. Copy meeting_patterns straight from the input. Pass repertoire and roster through unchanged. Keep each text field under 2000 characters and at most 16 modules, 8 assignments per module. Do NOT invent quiz questions.',
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
