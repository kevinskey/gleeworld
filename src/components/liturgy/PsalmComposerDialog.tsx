import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Music4, Download, Save, Undo2, Trash2, Plus, Minus, Piano } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NotationView } from '@/pages/notation/NotationView';
import { emptyScore, noteOf, restOf, type EditorScore, type Pitch } from '@/lib/notation/model';
import type { BaseDur } from '@/lib/notation/duration';
import {
  insertElement, deleteElement, setLyric, setAccidental, transpose, respellEnharmonic,
  CommandStack,
} from '@/lib/notation/commands';
import { playPitch } from '@/lib/notation/pitchAudio';
import { useMidiInput, midiToPitch } from '@/lib/notation/useMidiInput';
import { svgToJpegBlob, imageFileName, downloadBlob } from '@/lib/notation/exportImage';
import {
  measuresPerLine, psalmSyllables, psalmLines, psalmScoreTitle,
  PSALM_WIDTH_PX, PSALM_WIDTH_IN, PSALM_ENGRAVING_SCALE, PSALM_MIN_ENGRAVING_SCALE,
} from '@/lib/liturgy/psalmComposer';
import { savePsalmToLibrary } from '@/lib/liturgy/psalmScores';
import { musicXmlToEditorScore } from '@/lib/notation/musicxmlRead';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

/**
 * Compose a setting of the day's responsorial psalm.
 *
 * Built on the existing notation library (model + commands + NotationView +
 * MIDI) rather than a second engraver, but it is NOT the general notation
 * editor embedded in a dialog. Two things differ, and both come from what
 * psalm-writing actually is:
 *
 *  - The number row enters SCALE DEGREES, not durations. A psalm tone is
 *    thought and taught in degrees ("one, three, three, two"), and Kevin
 *    asked for numeric entry explicitly. The general editor maps digits to
 *    durations, and changing that there would regress a shipped surface — so
 *    this screen owns its own keymap and leaves that one alone.
 *  - Lyrics lead. The psalm text is already known, so syllables queue up and
 *    attach as notes are entered, instead of being typed note by note.
 *
 * The staff is PSALM_WIDTH_PX wide — the narrowest text column the printed
 * aid has, so the card prints at 1:1 whichever page it flows onto. The staff
 * SIZE follows from the aid's body type: the lyrics print at the size the
 * page's paragraphs do, and the staff is whatever that implies. Bars per line
 * is therefore what gives way when a line will not hold what was asked for,
 * and `onLayout` reports the count that was actually drawn.
 */

// Words, not glyphs. The whole/half note characters live in the Unicode
// Supplementary Plane (U+1D15D, U+1D15E) and no bundled font covers them —
// they rendered as black tofu boxes. ♩/♪ happen to work, but a toolbar that
// is half symbols and half boxes is worse than one that just says what it is.
const DURATIONS: { code: BaseDur; label: string }[] = [
  { code: 'whole', label: 'Whole' }, { code: 'half', label: 'Half' },
  { code: 'quarter', label: 'Quarter' }, { code: 'eighth', label: '8th' },
  { code: '16th', label: '16th' },
];

// Sharp side then flat side, as the circle of fifths is read.
const KEYS: { fifths: number; label: string }[] = [
  { fifths: -7, label: 'C♭ / A♭m' }, { fifths: -6, label: 'G♭ / E♭m' },
  { fifths: -5, label: 'D♭ / B♭m' }, { fifths: -4, label: 'A♭ / Fm' },
  { fifths: -3, label: 'E♭ / Cm' }, { fifths: -2, label: 'B♭ / Gm' },
  { fifths: -1, label: 'F / Dm' }, { fifths: 0, label: 'C / Am' },
  { fifths: 1, label: 'G / Em' }, { fifths: 2, label: 'D / Bm' },
  { fifths: 3, label: 'A / F♯m' }, { fifths: 4, label: 'E / C♯m' },
  { fifths: 5, label: 'B / G♯m' }, { fifths: 6, label: 'F♯ / D♯m' },
  { fifths: 7, label: 'C♯ / A♯m' },
];

const METERS: { beats: number; beatType: number }[] = [
  { beats: 4, beatType: 4 }, { beats: 3, beatType: 4 }, { beats: 2, beatType: 4 },
  { beats: 2, beatType: 2 }, { beats: 6, beatType: 8 }, { beats: 9, beatType: 8 },
  { beats: 12, beatType: 8 }, { beats: 5, beatType: 4 },
];

const LETTERS: Pitch['step'][] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/**
 * The attribute selects, sized to give the staff its room back.
 *
 * The dialog's whole job is to show a score, and the controls had grown
 * taller than the thing they control: four stacked label-over-select
 * columns, then two wrapped toolbar rows, then a pad row, pushed the staff
 * ~460px down and the last system off the bottom of an iPad.
 *
 * So the LABELS moved beside their controls rather than above them — same
 * <label for>, half the height — and the set-and-forget chrome (key, mode,
 * metre, clef) is the one thing allowed to compact below the touch floor at
 * lg. The controls a user actually taps while entering a psalm — durations,
 * accidentals, the pitch pad, undo — stay on Button size="sm", which is
 * 44pt on touch and only compacts at lg. Density comes from removing ROWS,
 * not from shrinking what a finger has to hit.
 */
const SELECT_CLS = 'h-9 border border-input bg-background px-1.5 text-xs lg:h-8';
const FIELD_LABEL_CLS = 'shrink-0 text-xs text-muted-foreground';

/**
 * Engraving size — see PSALM_ENGRAVING_SCALE.
 *
 * It lives in psalmComposer rather than here because it is derived from the
 * aid's own body type, which is part of the same print spec as the card's
 * width and belongs beside it. The value used to be a bare 1.0 in this file,
 * which read as "full size" and was in fact "whatever a staff space happens
 * to be in screen pixels".
 *
 * One number for both layout choices, and it is not a request the renderer may
 * negotiate down: PSALM_MIN_ENGRAVING_SCALE equals it, because shrinking the
 * engraving shrinks the lyrics below the size the page prints its paragraphs
 * at. When the requested bars per line do not fit, the packer drops the count
 * and `onLayout` says so below. See fitScaleForRow.
 */
const ENGRAVING_SCALE = PSALM_ENGRAVING_SCALE;

/**
 * On-screen magnification. Presentation only — see the staff markup.
 *
 * Raised with the engraving scale, and for the same reason. The staff is
 * engraved at its true printed size (the height 8pt lyrics imply, not the
 * two-fifths of an inch VexFlow's screen default was giving it), so previewing
 * it at the old zoom would show the composer a staff 40% smaller than the one
 * it used to draw on. The ceiling is set by the frame, not by taste: the dialog is
 * max-w-3xl (768px) and its padding leaves ~710px, so the zoom is whatever
 * fits the card's printed width into that without putting a horizontal
 * scrollbar under a desktop-width dialog. Derived rather than typed, because
 * the card's width is no longer a fixed 4 inches — it follows the aid's
 * column, and a hardcoded 1.85 would have overflowed the moment it did.
 */
const PREVIEW_MAX_PX = 710;
const SCREEN_ZOOM = Math.round((PREVIEW_MAX_PX / PSALM_WIDTH_PX) * 100) / 100;

const PER_LINE_CHOICES = [2, 4] as const;

/**
 * The lyric nudge, in NotationView's engraving units.
 *
 * NotationView already places the words clear of whatever the notes actually
 * do, which is a floor, not a preference: a chant-like tone wants its text
 * tucked close, a melismatic setting wants air. This moves that finished
 * baseline without touching the collision logic that produced it.
 *
 * A staff space is ten units at any engraving scale, so a step of two is a
 * fifth of a space — fine enough that no single tap is a jolt, coarse enough
 * that reaching the end of the range is a few taps and not twenty. The range
 * runs from a little over a space UP (as close as the words can sit before
 * they are simply on the notes) to nearly two and a half spaces DOWN.
 */
const LYRIC_NUDGE_STEP = 2;
const LYRIC_NUDGE_MIN = -12;
const LYRIC_NUDGE_MAX = 24;

const CHROMA: Record<Pitch['step'], number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midiOf = (p: Pitch) => (p.octave + 1) * 12 + CHROMA[p.step] + p.alter;

/** Put a letter in the octave nearest the previous note so entry doesn't leap. */
function nearestPitch(step: Pitch['step'], prev: Pitch | null): Pitch {
  if (!prev) return { step, octave: 4, alter: 0 };
  const prevMidi = midiOf(prev);
  return [prev.octave - 1, prev.octave, prev.octave + 1]
    .map((octave) => ({ step, octave, alter: 0 }))
    .reduce((a, b) => (Math.abs(midiOf(b) - prevMidi) < Math.abs(midiOf(a) - prevMidi) ? b : a));
}

export interface PsalmComposerDialogProps {
  open: boolean;
  onClose: () => void;
  /** Citation of the day's psalm, e.g. "Psalm 34:2-9". Titles the score. */
  citation: string | null;
  /** Liturgical day, e.g. "19th Sunday in Ordinary Time". */
  observation: string | null;
  /** The psalm text, refrain first. Seeds the syllable queue. */
  psalmText: string | null;
  /** Called with the saved row id, its title, and the engraved image — so the
   *  planner can record the image on the Mass instead of trying to find it
   *  again later by matching titles. */
  onSaved?: (id: string, title: string, imageUrl: string | null) => void;
  /** A setting already composed for this Mass. Reopening loads it back so it
   *  can be edited, rather than starting a blank staff and saving a duplicate. */
  existingScoreId?: string | null;
  /** The plan's sung-setting title. The most reliable way to find a setting
   *  saved before the id link existed: saving writes this, so it matches the
   *  score's own title even when the citation does not. */
  settingTitle?: string | null;
}

export function PsalmComposerDialog({
  open, onClose, citation, observation, psalmText, onSaved, existingScoreId, settingTitle,
}: PsalmComposerDialogProps) {
  const { user } = useAuth();
  const [score, setScore] = useState<EditorScore>(() => emptyScore());
  const [armed, setArmed] = useState<BaseDur>('quarter');
  const [armedDots, setArmedDots] = useState<0 | 1 | 2>(0);
  // Chromatic alteration on top of whatever the key gives. Without this a
  // minor psalm tone cannot have its raised leading tone, which is not an
  // edge case — it is how most of them cadence.
  const [armedAlter, setArmedAlter] = useState<-1 | 0 | 1>(0);
  const [octaveShift, setOctaveShift] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const stackRef = useRef(new CommandStack());
  const scoreRef = useRef(score); scoreRef.current = score;
  const staffRef = useRef<HTMLDivElement | null>(null);

  /**
   * The engraved score's own height, in unscaled (4-inch) pixels.
   *
   * Read back from the DOM rather than derived, because how tall a score is
   * depends on how many systems the engraver decided to pack — a number this
   * dialog asks for but does not get to choose (see `layout`). Measured off
   * the untransformed element, so ResizeObserver reports layout pixels and
   * the SCREEN_ZOOM multiplication happens exactly once, in the wrapper.
   */
  const [staffH, setStaffH] = useState(0);
  const staffObsRef = useRef<ResizeObserver | null>(null);
  // Attached as a ref CALLBACK, not from an effect keyed on `open`. The
  // staff lives inside a portalled dialog, so "when does the node exist"
  // is the portal's business, not ours — the callback fires the moment it
  // does, and again with null when it goes away.
  const attachStaff = useCallback((el: HTMLDivElement | null) => {
    staffRef.current = el;
    staffObsRef.current?.disconnect();
    staffObsRef.current = null;
    if (!el) { setStaffH(0); return; }
    setStaffH(el.offsetHeight);
    if (typeof ResizeObserver === 'undefined') return;   // jsdom / SSR safety
    const ro = new ResizeObserver(() => setStaffH(el.offsetHeight));
    ro.observe(el);
    staffObsRef.current = ro;
  }, []);

  /**
   * The words still to be placed, as STATE rather than a derived list.
   *
   * Derived, it could only ever hand out whole words — so "shepherd" went on
   * one note and there was no way to sing it across two, which is most of
   * what setting a psalm actually involves. As state it can be split: the
   * next word breaks into two syllables in place, and everything after it
   * shifts along.
   */
  const [syllables, setSyllables] = useState<string[]>([]);
  const initialSyllables = useMemo(() => psalmSyllables(psalmText ?? ''), [psalmText]);
  const lines = useMemo(() => psalmLines(psalmText ?? ''), [psalmText]);

  // Refill when the dialog opens, not on every psalmText change: a split the
  // user made must survive the readings being refetched.
  useEffect(() => {
    if (open) setSyllables(initialSyllables);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // DERIVED, not tracked. A hand-maintained cursor drifts the moment undo,
  // delete or a click-and-retype enters the picture — every one of those has
  // to remember to nudge it back. Counting the notes that actually carry a
  // word is self-correcting: undo a note and its word is free again, with no
  // bookkeeping to get wrong.
  const syllableIndex = useMemo(
    () => score.elements.filter((el) => el.kind === 'note' && !!el.lyric).length,
    [score],
  );

  /**
   * Reopen the setting already composed for this Mass.
   *
   * The MusicXML has always been saved; nothing loaded it back, so every
   * visit began on a blank staff and saving filed a SECOND copy rather than
   * revising the first. The score is parsed from the stored MusicXML — the
   * same document the library holds — so what is edited is exactly what was
   * saved, not a re-derivation of it.
   */
  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      /**
       * Find the setting to reopen.
       *
       * The id is the reliable link, but it only exists for settings saved
       * since it was introduced — anything composed before that has a perfect
       * score sitting in the library and no pointer to it. Rather than make
       * the user re-save to repair a link they never knew about, fall back to
       * searching the tenant's psalm settings by name.
       *
       * Matched CLIENT-side against the sung-setting title first, then the
       * citation: the composer names a score from the citation at the moment
       * it is saved, so a Sunday whose responsorial is a canticle has two
       * different strings for one piece of music.
       */
      let id = existingScoreId ?? null;
      if (!id) {
        const { data: candidates } = await supabase
          .from('gw_sheet_music')
          .select('id, title, created_at')
          .contains('tags', ['responsorial-psalm'])
          .not('xml_content', 'is', null)
          .order('created_at', { ascending: false })
          .limit(50);
        const rows = (candidates ?? []) as Array<{ id: string; title: string }>;
        const norm = (v: string) => v.toLowerCase().replace(/\s+/g, ' ').trim();
        // Sung-setting title first: it is what saving wrote, so it matches
        // even when the citation names a different book than the score does.
        const wanted = [settingTitle, citation, observation].map((v) => norm(v ?? '')).filter(Boolean);
        id = rows.find((r) => wanted.some((w) => norm(r.title).includes(w) || w.includes(norm(r.title))))?.id
          ?? null;
      }
      if (!alive || !id) return;

      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('title, composer, xml_content')
        .eq('id', id)
        .maybeSingle();
      if (!alive || error || !data?.xml_content) return;
      try {
        setScore(musicXmlToEditorScore(data.xml_content as string));
        setSavedId(id);                       // so Save revises rather than duplicates
        if (data.title) setTitle(data.title as string);
        if (data.composer) setComposer(data.composer as string);
      } catch {
        // A score that will not parse must not blank the editor silently —
        // say so and leave the staff empty to start again.
        toast.error('That saved setting could not be reopened. Starting a new one.');
      }
    })();
    return () => { alive = false; };
  }, [open, existingScoreId, citation, observation, settingTitle]);

  // Seed title/composer when the dialog opens. Deliberately not on every
  // prop change — the user may have edited them, and clobbering a typed
  // title because the readings refetched would be maddening. Skipped entirely
  // when an existing setting is being loaded, which brings its own title.
  useEffect(() => {
    if (!open) return;
    // Seeded only while nothing has been recovered; the loader overwrites
    // these with the saved setting's own title and composer if it finds one.
    if (savedId) return;
    setTitle(psalmScoreTitle(citation, observation));
    setComposer(
      (user?.user_metadata?.full_name as string | undefined)
      ?? (user?.email ? String(user.email).split('@')[0] : '')
      ?? '',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /**
   * Apply one or more commands as a single edit.
   *
   * Takes a LIST rather than being called repeatedly, because scoreRef only
   * catches up on render: two dispatch calls in one handler would both read
   * the pre-edit score and the second would silently discard the first.
   * Chaining through a local `next` keeps each command applied to the result
   * of the one before it, and keeps do() called exactly once per command so
   * the undo stack stays honest under StrictMode's double-invoked updaters.
   */
  const dispatchAll = useCallback((...cmds: Parameters<CommandStack['do']>[0][]) => {
    let next = scoreRef.current;
    for (const cmd of cmds) next = stackRef.current.do(cmd, next);
    scoreRef.current = next;   // later handlers in the same tick see the edit
    setScore(next);
  }, []);
  const dispatch = useCallback(
    (cmd: Parameters<CommandStack['do']>[0]) => dispatchAll(cmd),
    [dispatchAll],
  );

  /** Insert a note and attach the next unsung syllable to it. */
  const addNote = useCallback((pitch: Pitch) => {
    const s = scoreRef.current;
    playPitch(midiOf(pitch));
    const at = selected != null ? selected + 1 : s.elements.length;
    // The lyric is a SECOND command, not part of the insert, so undo peels
    // the word off the note before removing the note — what a user expects
    // after realising they attached the wrong syllable.
    const syl = syllables[syllableIndex];
    if (syl) dispatchAll(insertElement(at, noteOf(pitch, armed, armedDots)), setLyric(at, syl));
    else dispatchAll(insertElement(at, noteOf(pitch, armed, armedDots)));
    setSelected(selected != null ? at : null);
  }, [armed, armedDots, selected, dispatchAll, syllables, syllableIndex]);

  const addByLetter = useCallback((step: Pitch['step']) => {
    const prev = [...scoreRef.current.elements].reverse()
      .find((el): el is Extract<typeof el, { kind: 'note' }> => el.kind === 'note');
    // A letter names an absolute pitch, so the armed accidental IS its alter.
    addNote({ ...nearestPitch(step, prev ? prev.pitch : null), alter: armedAlter });
  }, [addNote, armedAlter]);

  const addRest = useCallback(() => {
    const s = scoreRef.current;
    const at = selected != null ? selected + 1 : s.elements.length;
    dispatch(insertElement(at, restOf(armed, armedDots)));
  }, [armed, armedDots, selected, dispatch]);

  const undo = useCallback(() => {
    // undo() returns the score unchanged when there is nothing to undo, so
    // the stack — not the return value — is what says whether it did anything.
    if (!stackRef.current.canUndo) return;
    const next = stackRef.current.undo(scoreRef.current);
    scoreRef.current = next;
    setScore(next);
  }, []);

  const removeLast = useCallback(() => {
    const s = scoreRef.current;
    const at = selected ?? s.elements.length - 1;
    if (at < 0) return;
    dispatch(deleteElement(at));
    setSelected(null);
  }, [selected, dispatch]);

  // MIDI keyboard: exact pitch, armed duration — the same "arm a duration,
  // play the notes" rhythm as every scoring app.
  const onMidiNote = useCallback((midiNote: number) => {
    // An explicitly armed flat or sharp is the user's spelling decision and
    // outranks the key's default; otherwise flat keys spell black notes as
    // flats and sharp keys as sharps.
    const prefer: 'sharp' | 'flat' =
      armedAlter === -1 ? 'flat'
      : armedAlter === 1 ? 'sharp'
      : scoreRef.current.keyFifths < 0 ? 'flat' : 'sharp';
    addNote(midiToPitch(midiNote, prefer));
  }, [addNote, armedAlter]);
  const midi = useMidiInput(onMidiNote);

  /**
   * Arm an accidental for the next note — and if a note is selected, apply it
   * to that note now.
   *
   * Both, because both are what a user means depending on where they are: mid
   * entry it is "the next note is sharp", and after clicking a wrong note it
   * is "make THAT one sharp". Applying only to the selection would break
   * entry; only arming would leave no way to fix a note without deleting it.
   */
  const armAccidental = useCallback((alter: -1 | 0 | 1) => {
    setArmedAlter((cur) => (cur === alter ? 0 : alter));
    const el = scoreRef.current.elements[selected ?? -1];
    if (selected != null && el?.kind === 'note') {
      playPitch(midiOf({ ...el.pitch, alter }));
      dispatch(setAccidental(selected, alter));
    }
  }, [selected, dispatch]);

  /** Move the selected note by a semitone, sounding where it lands. */
  const nudgePitch = useCallback((dir: 1 | -1) => {
    if (selected == null) return;
    const el = scoreRef.current.elements[selected];
    if (el?.kind !== 'note') return;
    playPitch(midiOf(el.pitch) + dir);
    dispatch(transpose(selected, dir));
  }, [selected, dispatch]);

  /** Same sound, different spelling: F sharp becomes G flat. */
  const respell = useCallback(() => {
    if (selected == null) return;
    if (scoreRef.current.elements[selected]?.kind !== 'note') return;
    dispatch(respellEnharmonic(selected));
  }, [selected, dispatch]);

  /** Select a note and sound it, so the staff can be read by ear. */
  const selectNote = useCallback((index: number) => {
    setSelected(index);
    const el = scoreRef.current.elements[index];
    if (el?.kind === 'note') playPitch(midiOf(el.pitch));
  }, []);

  /**
   * Break the next queued word into two syllables.
   *
   * Splits halfway unless told otherwise, leaving a hyphen on the first part
   * so the engraved lyric reads "shep-" as a singer expects. psalmSyllables
   * already treats a trailing hyphen as a syllable break, so a split word
   * survives being saved and reopened.
   *
   * Repeatable: splitting "shepherd", then splitting again, gives three
   * syllables — so a long word can be divided without anyone having to type
   * the whole psalm out hyphenated in advance.
   */
  const splitNextWord = useCallback((at?: number) => {
    setSyllables((cur) => {
      const i = syllableIndex;
      const word = cur[i];
      if (!word) return cur;
      const bare = word.replace(/-$/, '');
      if (bare.length < 2) return cur;          // nothing left to split
      const cut = Math.min(Math.max(1, at ?? Math.ceil(bare.length / 2)), bare.length - 1);
      const head = `${bare.slice(0, cut)}-`;
      const tail = bare.slice(cut) + (word.endsWith('-') ? '-' : '');
      return [...cur.slice(0, i), head, tail, ...cur.slice(i + 1)];
    });
  }, [syllableIndex]);

  /** Rejoin the next word with the one after it — undoing a split. */
  const joinNextWord = useCallback(() => {
    setSyllables((cur) => {
      const i = syllableIndex;
      if (!cur[i] || !cur[i + 1]) return cur;
      const joined = cur[i].replace(/-$/, '') + cur[i + 1];
      return [...cur.slice(0, i), joined, ...cur.slice(i + 2)];
    });
  }, [syllableIndex]);

  /** Set the lyric on the selected note outright — the escape hatch for
   *  anything the queue cannot express. */
  const setSelectedLyric = useCallback((text: string) => {
    if (selected == null) return;
    if (scoreRef.current.elements[selected]?.kind !== 'note') return;
    dispatch(setLyric(selected, text));
  }, [selected, dispatch]);

  // Keyboard entry. Letters A-G are pitches; digits 1-7 are scale degrees.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      // Never steal keystrokes from the title/composer fields.
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toUpperCase();
      if (LETTERS.includes(k as Pitch['step'])) { e.preventDefault(); addByLetter(k as Pitch['step']); return; }
      if (e.key === 'Backspace') { e.preventDefault(); removeLast(); return; }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); addRest(); return; }
      // '-' and '=' sit either side of the number row the degrees use, so an
      // accidental is reachable without leaving the entry hand.
      // '=' is the unshifted '+', so both reach sharp without a modifier.
      if (e.key === '-' || e.key === '_') { e.preventDefault(); armAccidental(-1); return; }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); armAccidental(1); return; }
      if (e.key === '0') { e.preventDefault(); armAccidental(0); return; }
      if (selected != null) {
        if (e.key === 'ArrowUp') { e.preventDefault(); nudgePitch(1); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); nudgePitch(-1); return; }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          selectNote(Math.max(0, selected - 1));
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          selectNote(Math.min(scoreRef.current.elements.length - 1, selected + 1));
          return;
        }
        if (e.key === 'Enter') { e.preventDefault(); respell(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, addByLetter, removeLast, addRest, armAccidental, nudgePitch, respell, selectNote, selected]);

  /**
   * Key, mode and metre change the SCORE, not a note, so they bypass the
   * command stack — undo walks back through note entry, and having a key
   * change interleaved in that history would make undo unpredictable. They
   * take effect on the next note entered, without touching existing ones.
   */
  const setAttrs = useCallback((patch: Partial<EditorScore>) => {
    const next = { ...scoreRef.current, ...patch };
    scoreRef.current = next;
    setScore(next);
  }, []);

  // How many bars share a printed line. Kevin's call, not the engine's — a
  // psalm card is a physical thing and how dense it should be is a taste
  // decision. measuresPerLine only seeds the opening choice from the lyric
  // load; from there the toggle wins.
  const [perLine, setPerLine] = useState<2 | 4>(2);
  useEffect(() => {
    if (open) setPerLine(measuresPerLine(score) >= 3 ? 4 : 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // What the engraver ACTUALLY packed. targetPerRow is a request the fit
  // check can refuse, and it did: at the default reading size a 4-inch staff
  // has ~198 logical units of room, which one bar of lyrics fills on its own
  // — so every line came out single-measure while the caption claimed two.
  const [layout, setLayout] = useState<{ rows: number; perRow: number } | null>(null);

  /**
   * Move the lyric line, and keep the value on the SCORE.
   *
   * On the score rather than in component state because it has to be saved:
   * the spacing a psalm was engraved with is part of the setting, not part of
   * this session. Through setAttrs, so it bypasses the undo stack for the same
   * reason key and metre do — undo walks back through note entry, and having
   * spacing tweaks interleaved there makes it unpredictable.
   *
   * Exactly 0 clears the field instead of storing a zero, so a score at the
   * automatic placement stays indistinguishable from one that never had a
   * preference — including in the MusicXML, which omits it entirely.
   */
  const lyricOffset = score.lyricOffset ?? 0;
  const nudgeLyrics = useCallback((delta: number) => {
    const next = Math.max(
      LYRIC_NUDGE_MIN,
      Math.min(LYRIC_NUDGE_MAX, (scoreRef.current.lyricOffset ?? 0) + delta),
    );
    setAttrs({ lyricOffset: next === 0 ? undefined : next });
  }, [setAttrs]);

  const renderJpeg = useCallback(async (): Promise<Blob | null> => {
    const svg = staffRef.current?.querySelector('svg');
    if (!svg) return null;
    try {
      return await svgToJpegBlob(svg as SVGSVGElement);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(
        /music font/.test(msg)
          ? "Couldn't load the music font, so the notes would export as empty boxes. Reload and try again."
          : 'Could not render the image.',
      );
      return null;
    }
  }, []);

  const exportJpeg = useCallback(async () => {
    const blob = await renderJpeg();
    if (blob) downloadBlob(blob, imageFileName(title || 'responsorial-psalm'));
  }, [renderJpeg, title]);

  const save = useCallback(async () => {
    if (score.elements.length === 0) { toast.error('Add some notes first.'); return; }
    if (!title.trim()) { toast.error('Give the setting a title.'); return; }
    setSaving(true);
    try {
      const image = await renderJpeg();
      const { id, imageUrl } = await savePsalmToLibrary({
        score, title: title.trim(), composer: composer.trim() || 'Unknown',
        image, existingId: savedId,
      });
      setSavedId(id);
      toast.success(savedId ? 'Setting updated.' : 'Saved to the music library.');
      onSaved?.(id, title.trim(), imageUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }, [score, title, composer, savedId, renderJpeg, onSaved]);

  const remaining = syllables.length - syllableIndex;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* sm:p-4 rather than the shell's sm:p-6: 16px off the top is 16px the
          staff moves up, and this dialog is judged entirely on whether the
          last system is on screen. An iPad in landscape (1024×768) is the
          tightest real case and it comes down to single-digit pixels. */}
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto sm:p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music4 className="h-4 w-4" aria-hidden />
            Compose the responsorial psalm
          </DialogTitle>
          {/* Same facts, fewer lines. Every key this used to spell out in a
              paragraph is still here — it just no longer costs the staff
              four lines of the dialog to say so. */}
          <DialogDescription className="text-xs">
            <strong>A–G</strong> or MIDI to enter notes · <strong>−</strong>/<strong>+</strong> flat
            and sharp · click a note to hear it, <strong>↑↓</strong> pitch, <strong>←→</strong> move,{' '}
            <strong>Enter</strong> respells. Psalm words attach as you go.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          {/* Title and composer, labels beside rather than above: one 32px
              row instead of two 58px ones, and the field is still labelled. */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="psalm-title" className={FIELD_LABEL_CLS}>Title</Label>
              <Input
                id="psalm-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="psalm-composer" className={FIELD_LABEL_CLS}>Composed by</Label>
              <Input
                id="psalm-composer"
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                placeholder="Your name"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* One controls block, three rows: what the staff IS, what the next
              note IS, and the pitches themselves. Previously three separate
              bordered blocks whose borders, padding and the gaps between them
              cost more height than a whole system of music. */}
          <div className="space-y-1.5 border border-border p-1.5">

            {/* Row 1 — score attributes, plus the two things that are set once
                and then left alone (octave offset, MIDI). */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <div className="flex items-center gap-1">
                <Label htmlFor="psalm-key" className={FIELD_LABEL_CLS}>Key</Label>
                <select
                  id="psalm-key"
                  value={score.keyFifths}
                  onChange={(e) => setAttrs({ keyFifths: Number(e.target.value) })}
                  className={SELECT_CLS}
                >
                  {KEYS.map((k) => (
                    <option key={k.fifths} value={k.fifths}>{k.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <Label htmlFor="psalm-mode" className={FIELD_LABEL_CLS}>Mode</Label>
                <select
                  id="psalm-mode"
                  value={score.mode}
                  onChange={(e) => setAttrs({ mode: e.target.value as 'major' | 'minor' })}
                  className={SELECT_CLS}
                >
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <Label htmlFor="psalm-meter" className={FIELD_LABEL_CLS}>Metre</Label>
                <select
                  id="psalm-meter"
                  value={`${score.timeSig.beats}/${score.timeSig.beatType}`}
                  onChange={(e) => {
                    const [beats, beatType] = e.target.value.split('/').map(Number);
                    setAttrs({ timeSig: { beats, beatType } });
                  }}
                  className={SELECT_CLS}
                >
                  {METERS.map((m) => (
                    <option key={`${m.beats}/${m.beatType}`} value={`${m.beats}/${m.beatType}`}>
                      {m.beats}/{m.beatType}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <Label htmlFor="psalm-clef" className={FIELD_LABEL_CLS}>Clef</Label>
                <select
                  id="psalm-clef"
                  value={score.clef}
                  onChange={(e) => setAttrs({ clef: e.target.value as EditorScore['clef'] })}
                  className={SELECT_CLS}
                >
                  <option value="treble">Treble</option>
                  <option value="bass">Bass</option>
                  <option value="alto">Alto</option>
                </select>
              </div>
              <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
              <Button type="button" size="sm" variant="secondary" className="px-2.5"
                onClick={() => setOctaveShift((o) => Math.max(-2, o - 1))} aria-label="Octave down">
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">8ve {octaveShift >= 0 ? `+${octaveShift}` : octaveShift}</span>
              <Button type="button" size="sm" variant="secondary" className="px-2.5"
                onClick={() => setOctaveShift((o) => Math.min(2, o + 1))} aria-label="Octave up">
                <Plus className="h-4 w-4" />
              </Button>
              <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
              <Button
                type="button" size="sm" className="px-2.5 text-xs"
                variant={midi.state.connected ? 'default' : 'secondary'}
                onClick={() => (midi.state.connected ? midi.disable() : void midi.enable())}
                disabled={!midi.state.supported}
                title={midi.state.supported ? undefined : 'This browser has no Web MIDI support'}
              >
                <Piano className="mr-1 h-4 w-4" />
                {midi.state.connected ? 'MIDI on' : 'MIDI'}
              </Button>
            </div>

            {/* Row 2 — what the NEXT note will be, and the two edits */}
            <div className="flex flex-wrap items-center gap-1 border-t border-border pt-1.5">
              {DURATIONS.map((d) => (
                <Button
                  key={d.code}
                  type="button"
                  size="sm"
                  variant={armed === d.code ? 'default' : 'secondary'}
                  onClick={() => setArmed(d.code)}
                  aria-pressed={armed === d.code}
                  // No aria-label: the visible word IS the name now. An
                  // aria-label of "eighth" over a button reading "8th" would
                  // make the spoken name differ from the printed one.
                  className="text-xs"
                >
                  {d.label}
                </Button>
              ))}
              {/* Accidentals. Flat and sharp arm for the next note; natural
                  clears the arming and, on a selected note, cancels an
                  accidental already there. */}
              {([
                { alter: -1 as const, glyph: '\u266d', name: 'Flat' },
                { alter: 0 as const, glyph: '\u266e', name: 'Natural' },
                { alter: 1 as const, glyph: '\u266f', name: 'Sharp' },
              ]).map((a) => (
                <Button
                  key={a.name}
                  type="button"
                  size="sm"
                  variant={armedAlter === a.alter ? 'default' : 'secondary'}
                  aria-pressed={armedAlter === a.alter}
                  aria-label={a.name}
                  title={`${a.name} \u2014 arms the next note, or changes the selected one`}
                  onClick={() => armAccidental(a.alter)}
                  className="min-w-9 px-2 text-base leading-none"
                >
                  {a.glyph}
                </Button>
              ))}
              <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
              {/* Dots multiply the armed duration; two dots is as far as psalm
                  writing ever needs. */}
              {([1, 2] as const).map((d) => (
                <Button
                  key={d}
                  type="button"
                  size="sm"
                  variant={armedDots === d ? 'default' : 'secondary'}
                  aria-pressed={armedDots === d}
                  aria-label={d === 1 ? 'Dotted' : 'Double dotted'}
                  title={d === 1 ? 'Dotted' : 'Double dotted'}
                  onClick={() => setArmedDots((cur) => (cur === d ? 0 : d))}
                  className="min-w-9 px-2 text-base leading-none"
                >
                  {'.'.repeat(d)}
                </Button>
              ))}
              <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
              <Button type="button" size="sm" variant="secondary" onClick={addRest}
                className="px-2.5 text-xs"
                title="Add a rest of the armed duration">
                Rest
              </Button>
              <Button type="button" size="sm" variant="secondary" className="px-2.5"
                onClick={undo} aria-label="Undo">
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button type="button" size="sm" variant="secondary" className="px-2.5"
                onClick={removeLast} aria-label="Delete note">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Row 3 — the pitch pad. Phones and iPads have no hardware
                keyboard, so these are the most-tapped controls on the screen
                and the last thing that should be shrunk: they keep the full
                size="sm" touch target. The optional lyric field shares the
                row rather than claiming another one. */}
            <div className="flex flex-wrap items-center gap-1 border-t border-border pt-1.5">
              {LETTERS.map((l) => (
                <Button key={l} type="button" size="sm" variant="outline"
                  onClick={() => addByLetter(l)} className="min-w-9 px-2">
                  {l}
                </Button>
              ))}
              {/* Whatever the queue cannot express, type here. Clicking a note
                  selects it; this is its syllable. */}
              {selected != null && score.elements[selected]?.kind === 'note' && (
                <div className="ml-1 flex min-w-[12rem] flex-1 items-center gap-1.5">
                  <Label htmlFor="psalm-note-lyric" className={FIELD_LABEL_CLS}>Lyric</Label>
                  <Input
                    id="psalm-note-lyric"
                    value={(score.elements[selected] as { lyric?: string }).lyric ?? ''}
                    onChange={(e) => setSelectedLyric(e.target.value)}
                    placeholder="e.g. shep-"
                    className="h-8 text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* The staff is laid out at its true print size and then
              CSS-zoomed for the screen. Laying it out larger and shrinking
              the export would change which measures share a line — the
              layout has to be decided at the size it will be printed. The
              zoom is presentation only; the SVG's own coordinates, and so
              the JPEG, stay at the printed width.

              The zoom wrapper is sized EXPLICITLY, in both axes, because
              transform: scale() paints bigger without laying out bigger.
              The frame therefore reserved the score's unscaled height —
              238px for something that paints 398 — and quietly clipped the
              whole second system into a nested scrollbox. That is half of
              "I can't see all the measures without scrolling" and no amount
              of shrinking the controls above would have fixed it. */}
          <div className="flex justify-center overflow-x-auto border border-border bg-card p-1.5">
            <div style={{ width: PSALM_WIDTH_PX * SCREEN_ZOOM, height: staffH ? staffH * SCREEN_ZOOM : undefined }}>
              <div
                ref={attachStaff}
                style={{
                  width: PSALM_WIDTH_PX,
                  transform: `scale(${SCREEN_ZOOM})`,
                  transformOrigin: 'top left',
                }}
              >
                <NotationView
                  score={score}
                  width={PSALM_WIDTH_PX}
                  targetPerRow={perLine}
                  scale={ENGRAVING_SCALE}
                  fitScaleFloor={PSALM_MIN_ENGRAVING_SCALE}
                  onLayout={setLayout}
                  lyricOffset={lyricOffset}
                  selectedIndex={selected}
                  onNoteClick={selectNote}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-muted-foreground">
              {PSALM_WIDTH_IN}″ wide · print
            </span>
            {PER_LINE_CHOICES.map((n) => (
              <Button
                key={n}
                type="button"
                size="sm"
                variant={perLine === n ? 'default' : 'outline'}
                aria-pressed={perLine === n}
                onClick={() => setPerLine(n)}
                className="text-xs"
              >
                {n} per line
              </Button>
            ))}
            {/* The engraver can still refuse: a bar dense enough not to fit
                drops the row below the request. Reporting what it actually
                did beats printing the number we asked for. */}
            {layout && layout.perRow > 0 && layout.perRow !== perLine && (
              <span className="text-xs text-muted-foreground">
                (fits {layout.perRow} here)
              </span>
            )}
            {/* The lyric nudge shares this row deliberately. The control stack
                above was compacted precisely so the last system stays on
                screen on an iPad in landscape, where it comes down to single
                digit pixels — a new row here would spend more of that budget
                than every control in it is worth. */}
            <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
            <div className="flex items-center gap-1" role="group" aria-label="Lyric spacing">
              <span className="text-xs text-muted-foreground">Lyrics</span>
              <Button
                type="button" size="sm" variant="secondary" className="px-2.5"
                onClick={() => nudgeLyrics(-LYRIC_NUDGE_STEP)}
                disabled={lyricOffset <= LYRIC_NUDGE_MIN}
                aria-label="Move lyrics closer to the notes"
                title="Move the words up, closer to the notes"
              >
                <Minus className="h-4 w-4" />
              </Button>
              {/* "auto" is both the readout and the way home: the user can see
                  at a glance whether they are on the engraver's own placement
                  or their own, and stepping back to it says so. */}
              <span
                className="min-w-[2.25rem] text-center text-xs tabular-nums text-muted-foreground"
                aria-live="polite"
                data-testid="lyric-offset"
              >
                {lyricOffset === 0 ? 'auto' : lyricOffset > 0 ? `+${lyricOffset}` : `−${-lyricOffset}`}
              </span>
              <Button
                type="button" size="sm" variant="secondary" className="px-2.5"
                onClick={() => nudgeLyrics(LYRIC_NUDGE_STEP)}
                disabled={lyricOffset >= LYRIC_NUDGE_MAX}
                aria-label="Move lyrics away from the notes"
                title="Move the words down, away from the notes"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Syllable queue */}
          {lines.length > 0 && (
            <div className="border border-border p-2">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium">Psalm text</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {syllables[syllableIndex] && (
                    <>
                      <span className="text-xs text-muted-foreground">
                        next: <strong data-testid="next-syllable">{syllables[syllableIndex]}</strong>
                      </span>
                      <Button type="button" size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => splitNextWord()}
                        title="Break this word into two syllables">
                        Split
                      </Button>
                      {syllables[syllableIndex + 1] && (
                        <Button type="button" size="sm" variant="ghost" className="h-7 text-xs"
                          onClick={joinNextWord}
                          title="Rejoin with the next syllable">
                          Join
                        </Button>
                      )}
                    </>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {remaining > 0 ? `${remaining} left` : 'all words placed'}
                  </span>
                </div>
              </div>
              {/* Refrain/verse shape, not a paragraph. The refrain is set in
                  bold with a blank line around it, matching how the planner
                  already prints the psalm — the form is what a cantor reads
                  off when deciding where the music goes. */}
              <div className="space-y-1">
                {lines.map((line, li) => {
                  const prev = lines[li - 1];
                  const spaceAbove = li > 0 && (line.isRefrain || prev?.isRefrain);
                  return (
                    <p
                      key={`${line.text}-${li}`}
                      className={cn(
                        'text-sm leading-relaxed',
                        line.isRefrain ? 'font-semibold' : 'text-foreground/90 pl-3',
                        spaceAbove && 'mt-4',
                      )}
                    >
                      {line.tokens.map((tok, ti) => {
                        const i = line.startIndex + ti;
                        return (
                          <span
                            key={`${tok}-${i}`}
                            className={
                              i < syllableIndex ? 'text-muted-foreground/50'
                              : i === syllableIndex ? 'bg-primary/15 font-semibold' : ''
                            }
                          >
                            {tok}{' '}
                          </span>
                        );
                      })}
                    </p>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={exportJpeg}
              disabled={score.elements.length === 0}>
              <Download className="mr-1.5 h-4 w-4" /> Export JPG
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              <Save className="mr-1.5 h-4 w-4" />
              {saving ? 'Saving…' : savedId ? 'Update in library' : 'Save to library'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
