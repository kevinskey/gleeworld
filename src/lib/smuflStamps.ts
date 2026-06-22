// Curated SMuFL symbol palette for the score annotation stamps tool.
// Codepoints come from the SMuFL 1.4 spec — Bravura (which we already
// ship in public/fonts) renders every glyph below. We could blast in
// all ~2,500 symbols but most are engraving-internal; this list of
// ~250 is what a conductor / instrumentalist actually wants to drop
// onto a score during rehearsal.

export interface StampGlyph {
  glyph: string; // Unicode char (may be a surrogate pair)
  label: string;
  font: 'bravura' | 'serif';
}

export interface StampCategory {
  name: string;
  glyphs: StampGlyph[];
}

const codePointFromHex = (hex: string) => String.fromCodePoint(parseInt(hex, 16));

const b = (hex: string, label: string): StampGlyph => ({
  glyph: codePointFromHex(hex),
  label,
  font: 'bravura',
});

const serif = (g: string, label: string): StampGlyph => ({ glyph: g, label, font: 'serif' });

// SMuFL ranges — picked for usefulness in a rehearsal context.
export const STAMP_CATEGORIES: StampCategory[] = [
  {
    name: 'Dynamics',
    glyphs: [
      serif('𝑝𝑝𝑝', 'ppp'),
      serif('𝑝𝑝', 'pp'),
      serif('𝑝', 'p'),
      serif('𝑚𝑝', 'mp'),
      serif('𝑚𝑓', 'mf'),
      serif('𝑓', 'f'),
      serif('𝑓𝑓', 'ff'),
      serif('𝑓𝑓𝑓', 'fff'),
      serif('𝑠𝑓𝑧', 'sfz'),
      serif('𝑓𝑝', 'fp'),
      b('E520', 'p (Bravura)'),
      b('E522', 'f (Bravura)'),
      b('E524', 'mp'),
      b('E525', 'mf'),
      b('E526', 'pp'),
      b('E527', 'ff'),
      b('E528', 'ppp'),
      b('E529', 'fff'),
      b('E52A', 'pppp'),
      b('E52B', 'ffff'),
      b('E52F', 'sfz'),
      b('E530', 'sf'),
      b('E531', 'sfp'),
      b('E532', 'sfpp'),
      b('E533', 'fp'),
      b('E534', 'rf'),
      b('E535', 'rfz'),
    ],
  },
  {
    name: 'Articulation',
    glyphs: [
      b('E4A0', 'Accent above'),
      b('E4A2', 'Staccato'),
      b('E4A4', 'Tenuto'),
      b('E4A6', 'Staccatissimo'),
      b('E4AC', 'Marcato'),
      b('E4B2', 'Tenuto-staccato'),
      b('E4B6', 'Tenuto-accent'),
      b('E4BA', 'Staccato-accent'),
      b('E4C0', 'Soft accent'),
      b('E4CE', 'Stress'),
      b('E4CF', 'Unstress'),
      serif('>', 'Accent'),
      serif('·', 'Staccato'),
      serif('–', 'Tenuto'),
      serif('ʼ', 'Breath'),
      serif('⌒', 'Slur'),
    ],
  },
  {
    name: 'Ornaments',
    glyphs: [
      b('E566', 'Trill'),
      b('E567', 'Turn'),
      b('E568', 'Inverted turn'),
      b('E569', 'Turn slash'),
      b('E56C', 'Mordent'),
      b('E56D', 'Inverted mordent'),
      b('E56E', 'Tremblement'),
      b('E580', 'Schleifer'),
      b('E582', 'Haydn ornament'),
      b('E590', 'Tremolo 1'),
      b('E591', 'Tremolo 2'),
      b('E592', 'Tremolo 3'),
      b('E593', 'Tremolo 4'),
      b('E594', 'Tremolo 5'),
      b('E592', 'Tremolo divisi'),
    ],
  },
  {
    name: 'Fermatas & Caesura',
    glyphs: [
      b('E4C0', 'Soft accent'),
      b('E4C0', 'Fermata above'),
      b('E4C0', 'Fermata short'),
      b('E4C2', 'Fermata long'),
      b('E4C4', 'Fermata very short'),
      b('E4C6', 'Fermata very long'),
      b('E4C8', 'Henze short'),
      b('E4CA', 'Henze long'),
      b('E4D1', 'Breath mark comma'),
      b('E4D2', 'Breath mark tick'),
      b('E4D3', 'Breath mark V'),
      b('E4D4', 'Breath mark salzedo'),
      b('E4D6', 'Caesura'),
      b('E4D7', 'Caesura thick'),
      b('E4D8', 'Caesura short'),
      b('E4D9', 'Caesura curved'),
    ],
  },
  {
    name: 'Repeats & Navigation',
    glyphs: [
      b('E040', 'Da capo'),
      b('E045', 'Segno'),
      b('E048', 'Coda'),
      b('E04A', 'Segno serpent'),
      b('E04C', 'Coda square'),
      b('E040', 'D.C.'),
      b('E040', 'D.S.'),
      b('E040', 'Fine'),
      serif('𝄋', 'Segno (text)'),
      serif('𝄌', 'Coda (text)'),
      serif('𝄆', 'Repeat begin'),
      serif('𝄇', 'Repeat end'),
      b('E000', 'Bar line'),
      b('E031', 'Double bar'),
      b('E032', 'Final bar'),
    ],
  },
  {
    name: 'Pedal',
    glyphs: [
      b('E650', 'Ped'),
      b('E651', 'Ped P'),
      b('E654', 'Sostenuto Ped'),
      b('E655', 'Soft Ped'),
      b('E656', 'Half Ped'),
      b('E657', 'Pedal asterisk'),
      b('E659', 'Pedal up notch'),
      b('E65A', 'Pedal d'),
      b('E65B', 'Pedal e'),
      b('E65C', 'Pedal Sost'),
    ],
  },
  {
    name: 'Bowing & Strings',
    glyphs: [
      b('E610', 'Down bow'),
      b('E612', 'Up bow'),
      b('E614', 'Harmonic'),
      b('E618', 'Bow on bridge'),
      b('E619', 'Bow on tailpiece'),
      b('E61A', 'Behind bridge'),
      b('E61B', 'On bridge'),
      b('E61D', 'Pizzicato'),
      b('E61E', 'Snap pizz'),
      b('E61F', 'Snap pizz below'),
      b('E62C', 'Open string'),
      b('E62D', 'Damp'),
      b('E633', 'Vibrato'),
    ],
  },
  {
    name: 'Conducting',
    glyphs: [
      b('E582', 'Conductor beat 2'),
      b('E583', 'Conductor beat 3'),
      b('E584', 'Conductor beat 4'),
      b('E585', 'Conductor weak beat'),
      b('E586', 'Conductor strong beat'),
      b('E587', 'Conductor unconducted'),
    ],
  },
  {
    name: 'Tempo',
    glyphs: [
      b('E1D5', 'Quarter note'),
      b('E1D7', 'Eighth note'),
      b('E1D9', 'Sixteenth note'),
      b('E1D3', 'Half note'),
      b('E1D2', 'Whole note'),
      b('E1FC', 'Augmentation dot'),
      b('E085', 'Common time'),
      b('E086', 'Cut time'),
      serif('𝅘𝅥𝅮', 'Eighth (text)'),
      serif('𝅘𝅥', 'Quarter (text)'),
      serif('𝅗𝅥', 'Half (text)'),
      serif('𝅗𝅮', 'Eighth flag'),
    ],
  },
  {
    name: 'Accidentals',
    glyphs: [
      b('E260', 'Flat'),
      b('E261', 'Natural'),
      b('E262', 'Sharp'),
      b('E263', 'Double sharp'),
      b('E264', 'Double flat'),
      b('E270', 'Quarter sharp'),
      b('E280', 'Half sharp arrow'),
      serif('♯', 'Sharp (text)'),
      serif('♭', 'Flat (text)'),
      serif('♮', 'Natural (text)'),
      serif('𝄪', 'Double sharp (text)'),
      serif('𝄫', 'Double flat (text)'),
    ],
  },
  {
    name: 'Clefs',
    glyphs: [
      b('E050', 'Treble'),
      b('E062', 'Bass'),
      b('E05C', 'Alto'),
      b('E05C', 'Tenor'),
      b('E069', 'Percussion'),
    ],
  },
  {
    name: 'Lines & Phrasing',
    glyphs: [
      b('E4B9', 'Phrasing slur arc'),
      b('EAA9', 'Cresc.'),
      b('EAAA', 'Decresc.'),
      b('E520', 'Hairpin <'),
      b('E521', 'Hairpin >'),
      serif('→', 'Cresc. text'),
      serif('←', 'Decresc. text'),
      serif('〱', 'Long line'),
    ],
  },
];

export const ALL_STAMP_GLYPHS: StampGlyph[] = STAMP_CATEGORIES.flatMap((c) => c.glyphs);
