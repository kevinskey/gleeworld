export type Level = "elementary" | "middle" | "high" | "college";

export type Exercise = {
  slug: string;
  title: string;
  blurb: string;
  available: boolean;
};

export type LevelDef = {
  slug: Level;
  title: string;
  subtitle: string;
  ageRange: string;
  exercises: Exercise[];
};

export const LEVELS: LevelDef[] = [
  {
    slug: "elementary",
    title: "Elementary",
    subtitle: "First steps on the staff",
    ageRange: "Grades K–5",
    exercises: [
      { slug: "note-id", title: "Note ID", blurb: "Treble clef · whole notes · lines & spaces", available: true },
      { slug: "rhythm-basics", title: "Rhythm Basics", blurb: "Whole, half, quarter notes", available: true },
      { slug: "staff-tour", title: "Staff Tour", blurb: "Line or space? Treble clef", available: true },
    ],
  },
  {
    slug: "middle",
    title: "Middle School",
    subtitle: "Two clefs and key signatures",
    ageRange: "Grades 6–8",
    exercises: [
      { slug: "note-id", title: "Note ID", blurb: "Treble + bass clef · all naturals", available: true },
      { slug: "key-sig", title: "Key Signatures", blurb: "Up to 2 sharps / 2 flats", available: true },
      { slug: "intervals", title: "Intervals", blurb: "2nds through 5ths · ascending", available: true },
      { slug: "rhythm-eighths", title: "Eighth-Note Rhythms", blurb: "Listen and match", available: true },
    ],
  },
  {
    slug: "high",
    title: "High School",
    subtitle: "C clefs, full key set, chord ID",
    ageRange: "Grades 9–12",
    exercises: [
      { slug: "note-id", title: "Note ID", blurb: "Treble · bass · alto · tenor", available: true },
      { slug: "key-sig", title: "All Key Signatures", blurb: "7 sharps to 7 flats", available: true },
      { slug: "intervals", title: "Intervals", blurb: "All qualities · ascending", available: true },
      { slug: "chord-id", title: "Triad ID", blurb: "Major · minor · diminished · augmented", available: true },
      { slug: "rhythm-dictation", title: "Rhythm Dictation", blurb: "Hear it, then pick the notation", available: true },
    ],
  },
  {
    slug: "college",
    title: "College",
    subtitle: "Theory & sight-singing",
    ageRange: "Undergraduate",
    exercises: [
      { slug: "note-id", title: "Note ID Speed Round", blurb: "All clefs · 60-second sprint", available: true },
      { slug: "figured-bass", title: "Figured Bass", blurb: "Inversion ID from stacked voicing", available: true },
      { slug: "modes", title: "Modes", blurb: "Ionian through Locrian", available: true },
      { slug: "harmonic-analysis", title: "Harmonic Analysis", blurb: "Roman numerals · diatonic triads", available: true },
      { slug: "sight-singing", title: "Sight-Singing", blurb: "Hear tonic · sing · self-rate", available: true },
    ],
  },
];

export function getLevel(slug: string): LevelDef | undefined {
  return LEVELS.find((l) => l.slug === slug);
}
