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
  degreeToPitch, measuresPerLine, psalmSyllables, psalmLines, psalmScoreTitle,
  PSALM_WIDTH_PX, PSALM_WIDTH_IN,
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
 * The staff is a fixed 4 inches (PSALM_WIDTH_PX at 96dpi). Everything else —
 * measures per line, overall height — follows from that width and the lyric
 * load, per measuresPerLine().
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
 * Engraving size per layout choice.
 *
 * Four inches is narrow, so bars-per-line and note size trade directly
 * against each other: the layout space is 384/scale units and the clef and
 * time signature take ~70 of it before a note is drawn. At NotationView's
 * reading default of 1.35 that leaves ~198 units — which one bar of quarter
 * notes under lyrics consumes on its own, which is exactly why every line
 * came out one measure wide.
 *
 * So two-per-line is engraved near full size and four-per-line noticeably
 * smaller. Small print is the honest consequence of fitting four bars in
 * four inches, not a regression.
 */
const ENGRAVING_SCALE: Record<2 | 4, number> = { 2: 1.0, 4: 0.62 };

/** On-screen magnification. Presentation only — see the staff markup. */
const SCREEN_ZOOM = 1.6;

const PER_LINE_CHOICES = [2, 4] as const;

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
  const staffRef = useRef<HTMLDivElement>(null);

  const syllables = useMemo(() => psalmSyllables(psalmText ?? ''), [psalmText]);
  const lines = useMemo(() => psalmLines(psalmText ?? ''), [psalmText]);

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

  const addByDegree = useCallback((degree: number) => {
    const s = scoreRef.current;
    const base = degreeToPitch(degree, s.keyFifths, s.mode, octaveShift);
    // The degree is already spelled for the key, so the accidental SHIFTS it
    // rather than replacing it: sharpening degree 7 in D minor gives C sharp,
    // and sharpening the tonic of E flat gives E natural. VexFlow prints
    // whichever sign the key signature makes necessary.
    const alter = Math.max(-2, Math.min(2, base.alter + armedAlter));
    addNote({ ...base, alter });
  }, [addNote, octaveShift, armedAlter]);

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
      if (/^[1-7]$/.test(e.key)) { e.preventDefault(); addByDegree(Number(e.key)); return; }
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
  }, [open, addByLetter, addByDegree, removeLast, addRest, armAccidental, nudgePitch, respell, selectNote, selected]);

  /**
   * Key, mode and metre change the SCORE, not a note, so they bypass the
   * command stack — undo walks back through note entry, and having a key
   * change interleaved in that history would make undo unpredictable. They
   * are also re-read by degreeToPitch on the next entry, so changing the key
   * re-aims the number row immediately without touching existing notes.
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
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music4 className="h-4 w-4" aria-hidden />
            Compose the responsorial psalm
          </DialogTitle>
          <DialogDescription>
            Type letters <strong>A–G</strong> for pitches or <strong>1–7</strong> for scale
            degrees in the key — or play a MIDI keyboard. <strong>−</strong> and{' '}
            <strong>+</strong> flat and sharp. Click a note to hear it, then{' '}
            <strong>↑↓</strong> to move its pitch, <strong>←→</strong> between notes, and{' '}
            <strong>Enter</strong> for the enharmonic spelling. Words from the day&rsquo;s
            psalm attach as you go.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="psalm-title" className="text-xs">Title</Label>
              <Input id="psalm-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="psalm-composer" className="text-xs">Composed by</Label>
              <Input
                id="psalm-composer"
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                placeholder="Your name"
              />
            </div>
          </div>

          {/* Score attributes — what the staff IS, before what goes on it */}
          <div className="flex flex-wrap items-end gap-3 border border-border p-2">
            <div className="space-y-1">
              <Label htmlFor="psalm-key" className="text-xs">Key</Label>
              <select
                id="psalm-key"
                value={score.keyFifths}
                onChange={(e) => setAttrs({ keyFifths: Number(e.target.value) })}
                className="h-9 border border-input bg-background px-2 text-sm"
              >
                {KEYS.map((k) => (
                  <option key={k.fifths} value={k.fifths}>{k.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="psalm-mode" className="text-xs">Mode</Label>
              <select
                id="psalm-mode"
                value={score.mode}
                onChange={(e) => setAttrs({ mode: e.target.value as 'major' | 'minor' })}
                className="h-9 border border-input bg-background px-2 text-sm"
              >
                <option value="major">Major</option>
                <option value="minor">Minor</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="psalm-meter" className="text-xs">Metre</Label>
              <select
                id="psalm-meter"
                value={`${score.timeSig.beats}/${score.timeSig.beatType}`}
                onChange={(e) => {
                  const [beats, beatType] = e.target.value.split('/').map(Number);
                  setAttrs({ timeSig: { beats, beatType } });
                }}
                className="h-9 border border-input bg-background px-2 text-sm"
              >
                {METERS.map((m) => (
                  <option key={`${m.beats}/${m.beatType}`} value={`${m.beats}/${m.beatType}`}>
                    {m.beats}/{m.beatType}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="psalm-clef" className="text-xs">Clef</Label>
              <select
                id="psalm-clef"
                value={score.clef}
                onChange={(e) => setAttrs({ clef: e.target.value as EditorScore['clef'] })}
                className="h-9 border border-input bg-background px-2 text-sm"
              >
                <option value="treble">Treble</option>
                <option value="bass">Bass</option>
                <option value="alto">Alto</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              The number keys follow the key — in E♭, <strong>3</strong> is G.
            </p>
          </div>

          {/* Entry toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 border border-border p-2">
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
                className="min-w-9 text-base leading-none"
              >
                {a.glyph}
              </Button>
            ))}
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
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
                className="min-w-9 text-base leading-none"
              >
                {'.'.repeat(d)}
              </Button>
            ))}
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            <Button type="button" size="sm" variant="secondary" onClick={addRest}
              title="Add a rest of the armed duration">
              Rest
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={undo} aria-label="Undo">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={removeLast} aria-label="Delete note">
              <Trash2 className="h-4 w-4" />
            </Button>
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            <Button type="button" size="sm" variant="secondary"
              onClick={() => setOctaveShift((o) => Math.max(-2, o - 1))} aria-label="Octave down">
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground">8ve {octaveShift >= 0 ? `+${octaveShift}` : octaveShift}</span>
            <Button type="button" size="sm" variant="secondary"
              onClick={() => setOctaveShift((o) => Math.min(2, o + 1))} aria-label="Octave up">
              <Plus className="h-4 w-4" />
            </Button>
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            <Button
              type="button" size="sm"
              variant={midi.state.connected ? 'default' : 'secondary'}
              onClick={() => (midi.state.connected ? midi.disable() : void midi.enable())}
              disabled={!midi.state.supported}
              title={midi.state.supported ? undefined : 'This browser has no Web MIDI support'}
            >
              <Piano className="mr-1.5 h-4 w-4" />
              {midi.state.connected ? 'MIDI on' : 'MIDI'}
            </Button>
          </div>

          {/* Degree + letter pads — phones and iPads have no hardware keyboard.
              Each degree shows the note it will actually produce in the
              current key: bare numbers left people asking what they were for,
              and the answer changes with the key signature, so the button has
              to say it rather than a caption elsewhere. */}
          <p className="text-xs text-muted-foreground">
            <strong>Scale degrees</strong> follow the key — the note under each number is what
            it will write. <strong>Letters</strong> are absolute pitches.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => {
              const p = degreeToPitch(d, score.keyFifths, score.mode, octaveShift);
              const name = `${p.step}${p.alter > 0 ? '♯'.repeat(p.alter) : p.alter < 0 ? '♭'.repeat(-p.alter) : ''}`;
              return (
                <Button
                  key={d}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addByDegree(d)}
                  title={`Scale degree ${d} — ${name} in this key`}
                  aria-label={`Scale degree ${d}, ${name}`}
                  className="h-auto min-w-11 flex-col gap-0 py-1 leading-none"
                >
                  <span className="text-sm tabular-nums">{d}</span>
                  <span className="text-[10px] font-normal text-muted-foreground">{name}</span>
                </Button>
              );
            })}
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            {LETTERS.map((l) => (
              <Button key={l} type="button" size="sm" variant="outline"
                onClick={() => addByLetter(l)} className="min-w-9">
                {l}
              </Button>
            ))}
          </div>

          {/* The staff is laid out at its true 4-inch print size and then
              CSS-zoomed for the screen. Laying it out larger and shrinking
              the export would change which measures share a line — the
              layout has to be decided at the size it will be printed. The
              zoom is presentation only; the SVG's own coordinates, and so
              the JPEG, stay at 4 inches. */}
          <div className="flex justify-center overflow-x-auto border border-border bg-card p-3">
            <div style={{ width: PSALM_WIDTH_PX * SCREEN_ZOOM }}>
              <div
                ref={staffRef}
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
                  scale={ENGRAVING_SCALE[perLine]}
                  onLayout={setLayout}
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
          </div>

          {/* Syllable queue */}
          {lines.length > 0 && (
            <div className="border border-border p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium">Psalm text</span>
                <span className="text-xs text-muted-foreground">
                  {remaining > 0 ? `${remaining} words left` : 'all words placed'}
                </span>
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
