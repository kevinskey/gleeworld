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
  insertElement, deleteElement, setLyric, CommandStack,
} from '@/lib/notation/commands';
import { playPitch } from '@/lib/notation/pitchAudio';
import { useMidiInput, midiToPitch } from '@/lib/notation/useMidiInput';
import { svgToJpegBlob, imageFileName, downloadBlob } from '@/lib/notation/exportImage';
import {
  degreeToPitch, measuresPerLine, psalmSyllables, psalmScoreTitle, PSALM_WIDTH_PX, PSALM_WIDTH_IN,
} from '@/lib/liturgy/psalmComposer';
import { savePsalmToLibrary } from '@/lib/liturgy/psalmScores';
import { useAuth } from '@/contexts/AuthContext';

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

const DURATIONS: { code: BaseDur; label: string }[] = [
  { code: 'whole', label: '𝅝' }, { code: 'half', label: '𝅗𝅥' },
  { code: 'quarter', label: '♩' }, { code: 'eighth', label: '♪' },
  { code: '16th', label: '♬' },
];

const LETTERS: Pitch['step'][] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

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
  /** Called with the saved library row id, so the planner can link it. */
  onSaved?: (id: string, title: string) => void;
}

export function PsalmComposerDialog({
  open, onClose, citation, observation, psalmText, onSaved,
}: PsalmComposerDialogProps) {
  const { user } = useAuth();
  const [score, setScore] = useState<EditorScore>(() => emptyScore());
  const [armed, setArmed] = useState<BaseDur>('quarter');
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

  // DERIVED, not tracked. A hand-maintained cursor drifts the moment undo,
  // delete or a click-and-retype enters the picture — every one of those has
  // to remember to nudge it back. Counting the notes that actually carry a
  // word is self-correcting: undo a note and its word is free again, with no
  // bookkeeping to get wrong.
  const syllableIndex = useMemo(
    () => score.elements.filter((el) => el.kind === 'note' && !!el.lyric).length,
    [score],
  );

  // Seed title/composer when the dialog opens. Deliberately not on every
  // prop change — the user may have edited them, and clobbering a typed
  // title because the readings refetched would be maddening.
  useEffect(() => {
    if (!open) return;
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
    if (syl) dispatchAll(insertElement(at, noteOf(pitch, armed, 0)), setLyric(at, syl));
    else dispatchAll(insertElement(at, noteOf(pitch, armed, 0)));
    setSelected(selected != null ? at : null);
  }, [armed, selected, dispatchAll, syllables, syllableIndex]);

  const addByLetter = useCallback((step: Pitch['step']) => {
    const prev = [...scoreRef.current.elements].reverse()
      .find((el): el is Extract<typeof el, { kind: 'note' }> => el.kind === 'note');
    addNote(nearestPitch(step, prev ? prev.pitch : null));
  }, [addNote]);

  const addByDegree = useCallback((degree: number) => {
    const s = scoreRef.current;
    addNote(degreeToPitch(degree, s.keyFifths, s.mode, octaveShift));
  }, [addNote, octaveShift]);

  const addRest = useCallback(() => {
    const s = scoreRef.current;
    const at = selected != null ? selected + 1 : s.elements.length;
    dispatch(insertElement(at, restOf(armed, 0)));
  }, [armed, selected, dispatch]);

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
    const prefer = scoreRef.current.keyFifths < 0 ? 'flat' : 'sharp';
    addNote(midiToPitch(midiNote, prefer));
  }, [addNote]);
  const midi = useMidiInput(onMidiNote);

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
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); addRest(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, addByLetter, addByDegree, removeLast, addRest]);

  const perRow = useMemo(() => measuresPerLine(score), [score]);

  const renderJpeg = useCallback(async (): Promise<Blob | null> => {
    const svg = staffRef.current?.querySelector('svg');
    if (!svg) return null;
    try {
      return await svgToJpegBlob(svg as SVGSVGElement);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not render the image.');
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
      const { id } = await savePsalmToLibrary({
        score, title: title.trim(), composer: composer.trim() || 'Unknown',
        image, existingId: savedId,
      });
      setSavedId(id);
      toast.success(savedId ? 'Setting updated.' : 'Saved to the music library.');
      onSaved?.(id, title.trim());
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
            degrees in the key — or play a MIDI keyboard. Words from the day&rsquo;s psalm
            attach as you go.
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
                aria-label={d.code}
                className="min-w-9 text-base leading-none"
              >
                {d.label}
              </Button>
            ))}
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            <Button type="button" size="sm" variant="secondary" onClick={addRest}>Rest</Button>
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

          {/* Degree + letter pads — phones and iPads have no hardware keyboard */}
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <Button key={d} type="button" size="sm" variant="outline"
                onClick={() => addByDegree(d)} className="min-w-9 tabular-nums">
                {d}
              </Button>
            ))}
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            {LETTERS.map((l) => (
              <Button key={l} type="button" size="sm" variant="outline"
                onClick={() => addByLetter(l)} className="min-w-9">
                {l}
              </Button>
            ))}
          </div>

          {/* The staff, at exactly 4 inches */}
          <div className="flex justify-center border border-border bg-card p-3">
            <div ref={staffRef} style={{ width: PSALM_WIDTH_PX }}>
              <NotationView
                score={score}
                width={PSALM_WIDTH_PX}
                targetPerRow={perRow}
                selectedIndex={selected}
                onNoteClick={(i) => setSelected(i)}
              />
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {PSALM_WIDTH_IN}″ wide · {perRow} {perRow === 1 ? 'measure' : 'measures'} per line
          </p>

          {/* Syllable queue */}
          {syllables.length > 0 && (
            <div className="border border-border p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium">Psalm text</span>
                <span className="text-xs text-muted-foreground">
                  {remaining > 0 ? `${remaining} words left` : 'all words placed'}
                </span>
              </div>
              <p className="text-sm leading-relaxed">
                {syllables.map((s, i) => (
                  <span
                    key={`${s}-${i}`}
                    className={
                      i < syllableIndex ? 'text-muted-foreground/50'
                      : i === syllableIndex ? 'bg-primary/15 font-semibold' : ''
                    }
                  >
                    {s}{' '}
                  </span>
                ))}
              </p>
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
