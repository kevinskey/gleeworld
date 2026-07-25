// Per-course visual identity. Every AcademyCourse maps to a `CourseTheme`
// that drives the atmospheric background, hero header, and accent chips
// on that course page. The MUS 070 deep-sea look is the reference — every
// other course gets its own palette + motif so the class pages stop
// feeling like carbon copies of each other.

export interface CourseTheme {
  /** Short display name for the palette (dev/debug only) */
  paletteName: string;
  /** Multi-stop gradient for the page shell background (top-left → bottom-right). */
  gradient: string[];
  /** 2-4 orb colors placed at rest positions for atmosphere. RGBA / hsla accepted. */
  orbs: string[];
  /** Hero-header accent gradient (two stops). Used for the course-code chip + primary CTA. */
  chip: [string, string];
  /** Motif SVG pattern data URI. If omitted, a subtle grain fallback is used. */
  motif?: string;
  /** 'light' = tone for placing white text over the background; 'dark' = dark text works. */
  tone: 'light' | 'dark';
  /** Emoji glyph shown behind the course-code chip in the hero (adds warmth without imagery deps). */
  glyph?: string;
}

// Curated palettes. Each is chosen for its cultural / musical resonance
// with the course's subject matter and to give the platform a diverse
// range of "moods" as students switch between classes.
const PALETTES = {
  deepSea: {
    paletteName: 'Deep Sea',
    gradient: ['#0a1628', '#0d1f3c', '#081430', '#060e1f', '#030812'],
    orbs: ['rgba(56,189,248,0.15)', 'rgba(14,165,233,0.12)', 'rgba(56,189,248,0.10)'],
    chip: ['#38bdf8', '#0ea5e9'],
    tone: 'light' as const,
    glyph: '🎼',
  },
  sunsetAmber: {
    paletteName: 'Sunset Amber',
    gradient: ['#3b0d1a', '#5c1a1f', '#7a2724', '#4a1418', '#2a0a0d'],
    orbs: ['rgba(251,146,60,0.18)', 'rgba(217,119,6,0.14)', 'rgba(251,113,133,0.10)'],
    chip: ['#fb923c', '#e11d48'],
    tone: 'light' as const,
    glyph: '🎷',
  },
  forestConcert: {
    paletteName: 'Forest Concert',
    gradient: ['#0b1f16', '#12331f', '#0f2818', '#0a1c11', '#050c07'],
    orbs: ['rgba(74,222,128,0.14)', 'rgba(34,197,94,0.12)', 'rgba(217,196,133,0.10)'],
    chip: ['#4ade80', '#16a34a'],
    tone: 'light' as const,
    glyph: '🎵',
  },
  violetIntimate: {
    paletteName: 'Violet Intimate',
    gradient: ['#1e0d33', '#2d1450', '#3a1a5c', '#1a0a2d', '#0d0518'],
    orbs: ['rgba(196,181,253,0.16)', 'rgba(244,114,182,0.12)', 'rgba(216,180,254,0.10)'],
    chip: ['#c084fc', '#ec4899'],
    tone: 'light' as const,
    glyph: '🎤',
  },
  indigoGold: {
    paletteName: 'Indigo Gold',
    gradient: ['#0f172a', '#1e2b5c', '#1a2452', '#0d1636', '#050b1e'],
    orbs: ['rgba(250,204,21,0.14)', 'rgba(129,140,248,0.16)', 'rgba(250,204,21,0.10)'],
    chip: ['#facc15', '#818cf8'],
    tone: 'light' as const,
    glyph: '🏆',
  },
  tealCoral: {
    paletteName: 'Teal Coral',
    gradient: ['#022c34', '#034752', '#0a5b6a', '#012024', '#001518'],
    orbs: ['rgba(45,212,191,0.16)', 'rgba(251,146,60,0.14)', 'rgba(94,234,212,0.10)'],
    chip: ['#2dd4bf', '#fb7185'],
    tone: 'light' as const,
    glyph: '🎶',
  },
  slateCopper: {
    paletteName: 'Slate Copper',
    gradient: ['#1c1917', '#292524', '#3a2f2b', '#1c1917', '#0c0a09'],
    orbs: ['rgba(234,88,12,0.14)', ' rgba(120,113,108,0.16)', 'rgba(251,146,60,0.10)'],
    chip: ['#f97316', '#a8a29e'],
    tone: 'light' as const,
    glyph: '📖',
  },
  burgundySacred: {
    paletteName: 'Burgundy Sacred',
    gradient: ['#2a0810', '#4a0e1a', '#3b0c14', '#1f050a', '#0f0205'],
    orbs: ['rgba(250,204,21,0.14)', 'rgba(220,38,38,0.12)', 'rgba(253,224,71,0.08)'],
    chip: ['#facc15', '#dc2626'],
    tone: 'light' as const,
    glyph: '✝',
  },
} satisfies Record<string, CourseTheme>;

// Course code → theme map. Keep this stable; every course, new or old,
// should have a distinct entry. Unknown codes fall back to `indigoGold`
// so a newly-added course still looks intentional out of the box.
const THEME_BY_COURSE: Record<string, CourseTheme> = {
  'MUS 070': PALETTES.deepSea,        // Glee Club — preserved from prior special-case
  'MUS 240': PALETTES.sunsetAmber,    // African American Music
  'MUS 210': PALETTES.forestConcert,  // Choral Conducting & Literature
  'MUS 001': PALETTES.violetIntimate, // Private Applied Lessons
  'GLEE 101': PALETTES.indigoGold,    // Leadership Development
  'GLEE 000': PALETTES.tealCoral,     // Sight Singing Institute
  'MUS 101': PALETTES.slateCopper,    // Music Fundamentals Theory
  'LH 100': PALETTES.burgundySacred,  // Bowman Scholars
};

export function getCourseTheme(courseCode: string): CourseTheme {
  return THEME_BY_COURSE[courseCode] ?? PALETTES.indigoGold;
}

// CSS background string for the shell. Angled gradient so the "top" of
// the page carries the darkest tone and the reader's eye is pulled down
// into content.
export function courseBackground(theme: CourseTheme): string {
  return `linear-gradient(160deg, ${theme.gradient.join(', ')})`;
}
