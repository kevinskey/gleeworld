-- THEORY_V2 Phase 1 seed: levels, units, lesson stubs from the curriculum spec.
-- Idempotent: keyed on (level_id, sort_order) / (unit_id, sort_order).
-- "ll"/"lx" on a lesson deep-links the existing /read-music/:level/:exercise drill.

do $$
declare
  l jsonb; u jsonb; le jsonb;
  v_unit_id uuid;
  u_idx int; le_idx int;
  curriculum jsonb := $j$
[
 {"id":1,"slug":"elementary","name":"Elementary","description":"Musical literacy foundations (K–5). Aligned with Kodály/Orff sequencing.","units":[
  {"t":"Sound and Silence","lessons":[
    {"t":"High vs. low, loud vs. soft, fast vs. slow"},
    {"t":"Steady beat vs. rhythm"},
    {"t":"Sound vs. silence (note vs. rest concept)"}]},
  {"t":"Rhythm Foundations","lessons":[
    {"t":"Quarter note (ta), paired eighths (ti-ti), quarter rest"},
    {"t":"Half note, whole note, half/whole rests"},
    {"t":"Reading 4-beat rhythm patterns"},
    {"t":"Rhythm tap exercises","ll":"elementary","lx":"rhythm-basics"}]},
  {"t":"The Staff","lessons":[
    {"t":"Lines and spaces (5 lines, 4 spaces)"},
    {"t":"Treble clef introduction"},
    {"t":"Notes move up = sound goes up"},
    {"t":"Line notes vs. space notes","ll":"elementary","lx":"staff-tour"}]},
  {"t":"Note Names (Treble)","lessons":[
    {"t":"EGBDF / FACE"},
    {"t":"Middle C and the C–C octave"},
    {"t":"Letter name drills (timed identification)","ll":"elementary","lx":"note-id"}]},
  {"t":"Solfège & Melody","lessons":[
    {"t":"Do–re–mi–sol–la (pentatonic core)"},
    {"t":"Steps vs. skips vs. repeats"},
    {"t":"Melodic contour (up/down/same)"},
    {"t":"Echo singing patterns"}]},
  {"t":"Meter & Bar Lines","lessons":[
    {"t":"Bar lines, measures, double bar"},
    {"t":"2/4, 3/4, 4/4 — counting beats per measure"},
    {"t":"Time signature as 'beats per box'"}]},
  {"t":"Musical Vocabulary","lessons":[
    {"t":"Dynamics: piano, forte, crescendo, decrescendo"},
    {"t":"Tempo: fast (allegro), slow (adagio)"},
    {"t":"Repeat sign"},
    {"t":"Level 1 Capstone: clap an 8-measure rhythm; name 20 treble notes in 60 seconds; sing a pentatonic pattern"}]}
 ]},
 {"id":2,"slug":"middle","name":"Middle School","description":"Full notation fluency in both clefs, basic tonal theory (grades 6–8). Aligned with NAfME middle school standards.","units":[
  {"t":"Grand Staff & Bass Clef","lessons":[
    {"t":"Bass clef note names (GBDFA / ACEG)","ll":"middle","lx":"note-id"},
    {"t":"Grand staff, middle C as the bridge"},
    {"t":"Ledger lines (2 above/below each staff)"},
    {"t":"Octave identification (C4 = middle C)"}]},
  {"t":"Full Rhythm System","lessons":[
    {"t":"Sixteenth notes and rests"},
    {"t":"Dotted notes (dotted half, dotted quarter)"},
    {"t":"Ties vs. slurs"},
    {"t":"Eighth–sixteenth combinations (ti-tika, tika-ti)","ll":"middle","lx":"rhythm-eighths"},
    {"t":"Pickup notes (anacrusis)"}]},
  {"t":"Accidentals & Half Steps","lessons":[
    {"t":"Sharps, flats, naturals"},
    {"t":"Half step vs. whole step"},
    {"t":"Enharmonic equivalents (F# = Gb)"},
    {"t":"The keyboard as a map"}]},
  {"t":"Major Scales & Key Signatures","lessons":[
    {"t":"Major scale pattern (WWHWWHW)"},
    {"t":"Key signatures to 4 sharps and 4 flats","ll":"middle","lx":"key-sig"},
    {"t":"Order of sharps/flats"},
    {"t":"Circle of fifths introduction"},
    {"t":"'Last sharp +1 / second-to-last flat' identification tricks"}]},
  {"t":"Minor Scales (Natural)","lessons":[
    {"t":"Relative major/minor relationship"},
    {"t":"Natural minor scale"},
    {"t":"Hearing major vs. minor (audio ID)"}]},
  {"t":"Intervals by Number","lessons":[
    {"t":"Unison through octave (number only)","ll":"middle","lx":"intervals"},
    {"t":"Melodic vs. harmonic intervals"},
    {"t":"Interval ear training: 2nds, 3rds, 5ths, octaves"}]},
  {"t":"Triads & Basic Harmony","lessons":[
    {"t":"Major and minor triads (root position)"},
    {"t":"Building triads on scale degrees"},
    {"t":"I, IV, V — the primary chords"},
    {"t":"Hearing chord changes in simple songs"}]},
  {"t":"Meter Deep Dive","lessons":[
    {"t":"Simple meters: 2/4, 3/4, 4/4, cut time"},
    {"t":"Compound meter introduction: 6/8"},
    {"t":"Conducting patterns (2, 3, 4)"}]},
  {"t":"Expression & Score Reading","lessons":[
    {"t":"Full dynamics range (pp–ff), sfz, accents"},
    {"t":"Tempo terms: largo → presto, ritardando, accelerando, fermata"},
    {"t":"Articulations: staccato, legato, marcato"},
    {"t":"Navigation: D.C., D.S., coda, first/second endings"},
    {"t":"Level 2 Capstone: all key signatures to 4 accidentals; both clefs with ledger lines; dotted/sixteenth rhythms; major/minor triads"}]}
 ]},
 {"id":3,"slug":"high","name":"High School","description":"AP Music Theory readiness (grades 9–12).","units":[
  {"t":"Complete Key System","lessons":[
    {"t":"All 15 major and minor key signatures","ll":"high","lx":"key-sig"},
    {"t":"Full circle of fifths fluency"},
    {"t":"Parallel vs. relative keys"},
    {"t":"Note-reading fluency (treble, bass, alto, tenor)","ll":"high","lx":"note-id"}]},
  {"t":"All Scale Forms","lessons":[
    {"t":"Harmonic and melodic minor"},
    {"t":"Chromatic scale"},
    {"t":"Pentatonic (major/minor), whole tone, blues scale"},
    {"t":"Modes introduction (Ionian–Locrian)","ll":"college","lx":"modes"}]},
  {"t":"Intervals with Quality","lessons":[
    {"t":"Major, minor, perfect, augmented, diminished","ll":"high","lx":"intervals"},
    {"t":"Interval inversion"},
    {"t":"Compound intervals"},
    {"t":"Full interval ear training (all qualities within an octave)"},
    {"t":"Tritone resolution"}]},
  {"t":"Triads & Seventh Chords","lessons":[
    {"t":"All four triad qualities (M, m, dim, aug)","ll":"high","lx":"chord-id"},
    {"t":"Triad inversions and figured bass symbols (6, 6/4)","ll":"college","lx":"figured-bass"},
    {"t":"Seventh chords: M7, Mm7 (dominant), m7, ø7, °7"},
    {"t":"Seventh chord inversions (7, 6/5, 4/3, 4/2)"},
    {"t":"Lead-sheet symbols vs. Roman numerals"}]},
  {"t":"Diatonic Harmony & Roman Numerals","lessons":[
    {"t":"Roman numeral analysis in major and minor"},
    {"t":"Chord function: tonic, predominant, dominant"},
    {"t":"Harmonic progression norms (T–PD–D–T)"},
    {"t":"Cadences: authentic (PAC/IAC), half, plagal, deceptive"},
    {"t":"Cadence ear training"}]},
  {"t":"Voice Leading & Part Writing","lessons":[
    {"t":"SATB ranges, spacing, doubling"},
    {"t":"Motion types: parallel, similar, contrary, oblique"},
    {"t":"Forbidden parallels (5ths/8ves)"},
    {"t":"Tendency tones: leading tone and chordal 7th resolution"},
    {"t":"Realize a figured bass, harmonize a melody"}]},
  {"t":"Non-Chord Tones","lessons":[
    {"t":"Passing tone, neighbor tone, suspension, retardation"},
    {"t":"Appoggiatura, escape tone, anticipation, pedal point"},
    {"t":"Identifying NCTs in score excerpts"}]},
  {"t":"Secondary Function & Modulation","lessons":[
    {"t":"Secondary dominants (V/V, V/IV) and leading-tone chords"},
    {"t":"Tonicization vs. modulation"},
    {"t":"Modulation to closely related keys"},
    {"t":"Pivot chord identification"}]},
  {"t":"Rhythm & Meter, Advanced","lessons":[
    {"t":"Compound meters (6/8, 9/8, 12/8) fluency"},
    {"t":"Asymmetric meters (5/4, 7/8)"},
    {"t":"Triplets, duplets, syncopation, hemiola","ll":"high","lx":"rhythm-dictation"},
    {"t":"Two-part rhythm reading"}]},
  {"t":"Form & Analysis Basics","lessons":[
    {"t":"Phrase, period, sentence structure"},
    {"t":"Binary, ternary, rounded binary"},
    {"t":"Verse-chorus and 12-bar blues"},
    {"t":"Theme and variations"}]},
  {"t":"Aural Skills","lessons":[
    {"t":"Melodic dictation (stepwise → leaps → chromatic)"},
    {"t":"Harmonic dictation (bass line + Roman numerals)"},
    {"t":"Sight-singing: major/minor, triadic leaps, simple chromaticism"},
    {"t":"Error detection (notation vs. performed audio)"},
    {"t":"Level 3 Capstone: AP-style exam — part writing, figured bass, dictation, analysis, sight-singing"}]}
 ]},
 {"id":4,"slug":"college","name":"College","description":"Undergraduate theory core (Theory I–IV equivalent) plus aural skills.","units":[
  {"t":"Diatonic Harmony Review & Refinement","lessons":[
    {"t":"Accelerated review with literature-based analysis","ll":"college","lx":"harmonic-analysis"},
    {"t":"6/4 chord types (cadential, passing, pedal, arpeggiated)"},
    {"t":"Sequences (descending fifths, 5–6)"}]},
  {"t":"Chromatic Harmony I","lessons":[
    {"t":"Mode mixture / borrowed chords"},
    {"t":"Neapolitan sixth"},
    {"t":"Augmented sixth chords (Italian, French, German)"},
    {"t":"Chromatic predominant function"}]},
  {"t":"Chromatic Harmony II","lessons":[
    {"t":"Enharmonic modulation (°7 and Ger+6 reinterpretation)"},
    {"t":"Common-tone diminished sevenths"},
    {"t":"Chromatic mediants"},
    {"t":"Modulation to distant keys"},
    {"t":"Extended tertian harmony (9th, 11th, 13th chords)"}]},
  {"t":"Counterpoint","lessons":[
    {"t":"Species counterpoint (1st–5th species, two voices)"},
    {"t":"18th-century style: invention and fugue technique"},
    {"t":"Subject/answer, exposition, episode, stretto"},
    {"t":"Canon types"}]},
  {"t":"Form & Analysis","lessons":[
    {"t":"Sonata form (exposition, development, recapitulation)"},
    {"t":"Rondo, sonata-rondo"},
    {"t":"Concerto form, ritornello"},
    {"t":"Fugue analysis"},
    {"t":"Song forms and text-music relationships (art song, spirituals, hymnody)"}]},
  {"t":"Post-Tonal Theory","lessons":[
    {"t":"Pitch-class sets, normal form, prime form, interval vectors"},
    {"t":"Twelve-tone technique: rows, matrices, P/I/R/RI"},
    {"t":"Centricity without functional tonality"},
    {"t":"Modes of limited transposition, octatonic/hexatonic collections"},
    {"t":"Minimalism, aleatory, spectral concepts (survey)"}]},
  {"t":"Jazz & Popular Harmony","lessons":[
    {"t":"Lead sheet fluency, chord-scale theory"},
    {"t":"Extensions and alterations (b9, #11, 13)"},
    {"t":"ii–V–I and turnarounds, tritone substitution"},
    {"t":"Modal interchange in pop/gospel"},
    {"t":"Gospel harmonic vocabulary (passing diminished, 'preacher chords', reharmonization)"}]},
  {"t":"Instrumentation & Score Skills","lessons":[
    {"t":"Transposing instruments (Bb, Eb, F)"},
    {"t":"Reading open score (SATB and orchestral)"},
    {"t":"C clefs (alto, tenor)","ll":"college","lx":"note-id"},
    {"t":"Ranges of common instruments and voices"}]},
  {"t":"Linear Analysis (Survey)","lessons":[
    {"t":"Schenkerian concepts: Urlinie, prolongation, structural levels"},
    {"t":"Reduction technique on short literature"}]},
  {"t":"Advanced Aural Skills","lessons":[
    {"t":"Chromatic melodic dictation"},
    {"t":"Four-part harmonic dictation"},
    {"t":"Atonal interval/trichord identification"},
    {"t":"Sight-singing: chromatic, modal, post-tonal melodies","ll":"college","lx":"sight-singing"},
    {"t":"Level 4 Capstone: full-movement analysis; advanced figured bass; twelve-tone matrix; gospel/jazz transcription"}]}
 ]}
]
$j$::jsonb;
begin
  for l in select * from jsonb_array_elements(curriculum) loop
    insert into public.gw_theory_levels (id, slug, name, description)
    values ((l->>'id')::smallint, l->>'slug', l->>'name', l->>'description')
    on conflict (id) do update
      set slug = excluded.slug, name = excluded.name, description = excluded.description;

    u_idx := 0;
    for u in select * from jsonb_array_elements(l->'units') loop
      u_idx := u_idx + 1;
      insert into public.gw_theory_units (level_id, sort_order, title, description)
      values ((l->>'id')::smallint, u_idx, u->>'t', u->>'d')
      on conflict (level_id, sort_order) do update
        set title = excluded.title, description = excluded.description
      returning id into v_unit_id;

      le_idx := 0;
      for le in select * from jsonb_array_elements(u->'lessons') loop
        le_idx := le_idx + 1;
        insert into public.gw_theory_lessons (unit_id, sort_order, title, legacy_level_slug, legacy_exercise_slug)
        values (v_unit_id, le_idx, le->>'t', le->>'ll', le->>'lx')
        on conflict (unit_id, sort_order) do update
          set title = excluded.title,
              legacy_level_slug = excluded.legacy_level_slug,
              legacy_exercise_slug = excluded.legacy_exercise_slug;
      end loop;
    end loop;
  end loop;
end $$;
