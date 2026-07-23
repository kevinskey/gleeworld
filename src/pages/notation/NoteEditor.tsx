import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { EditorScore, noteOf, restOf, Pitch } from '@/lib/notation/model';
import { BaseDur } from '@/lib/notation/duration';
import { insertElement, deleteElement, transpose, changeDuration, tieToNext, setAccidental, respellEnharmonic, setLyric, CommandStack } from '@/lib/notation/commands';
import { playPitch } from '@/lib/notation/pitchAudio';
import { useMidiInput, midiToPitch } from '@/lib/notation/useMidiInput';
import { NotationView } from './NotationView';

const CHROMA_MIDI: Record<Pitch['step'], number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midiOf = (p: Pitch) => (p.octave + 1) * 12 + CHROMA_MIDI[p.step] + p.alter;

const DURATIONS: { code: BaseDur; label: string; key: string }[] = [
  { code: 'whole', label: 'Whole', key: '1' }, { code: 'half', label: 'Half', key: '2' },
  { code: 'quarter', label: 'Quarter', key: '3' }, { code: 'eighth', label: 'Eighth', key: '4' },
  { code: '16th', label: '16th', key: '5' }, { code: '32nd', label: '32nd', key: '6' },
];

// Compact toolbar-button style; dark when the option is armed/active.
const pill = (active: boolean) =>
  `rounded-md px-2.5 py-1.5 text-sm font-medium ${active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`;

// Place the pitch letter in the octave nearest the previous note (so C after a high B
// stays close, rather than jumping to a fixed octave).
function nearestPitch(step: Pitch['step'], prev: Pitch | null): Pitch {
  const CHROMA: Record<Pitch['step'], number> = { C:0,D:2,E:4,F:5,G:7,A:9,B:11 };
  const base = prev ? prev.octave : 4;
  const candidates = [base - 1, base, base + 1].map((oct) => ({ step, octave: oct, alter: 0 }));
  if (!prev) return { step, octave: 4, alter: 0 };
  const prevMidi = (prev.octave + 1) * 12 + CHROMA[prev.step] + prev.alter;
  return candidates.reduce((a, b) =>
    Math.abs((b.octave+1)*12 + CHROMA[b.step] - prevMidi) < Math.abs((a.octave+1)*12 + CHROMA[a.step] - prevMidi) ? b : a);
}

export function NoteEditor({ score, onChange }: { score: EditorScore; onChange: (s: EditorScore) => void }) {
  const [armed, setArmed] = useState<BaseDur>('quarter');
  const [armedDots, setArmedDots] = useState<0 | 1 | 2>(0);
  const [armedAlter, setArmedAlter] = useState<-1 | 0 | 1>(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [lyricMode, setLyricMode] = useState(false);
  const stackRef = useRef(new CommandStack());
  const scoreRef = useRef(score); scoreRef.current = score;

  const dispatch = useCallback((cmd: Parameters<CommandStack['do']>[0]) => {
    onChange(stackRef.current.do(cmd, scoreRef.current));
  }, [onChange]);

  // Advance the lyric cursor to the next note (skipping rests); if there is none, stay put.
  const advanceToNextNote = useCallback((from: number) => {
    const s = scoreRef.current;
    for (let i = from + 1; i < s.elements.length; i++) {
      if (s.elements[i].kind === 'note') { setSelected(i); return; }
    }
  }, []);

  // Shared entry actions — fired by the desktop keyboard shortcuts AND the
  // on-screen note pad below (phones/tablets have no hardware keyboard, so
  // the pad is the only way to enter pitches there).
  const addPitch = useCallback((step: Pitch['step']) => {
    const s = scoreRef.current;
    const prev = [...s.elements].reverse().find((el) => el.kind === 'note') as any;
    const basePitch = nearestPitch(step, prev ? prev.pitch : null);
    const pitch = { ...basePitch, alter: armedAlter };
    playPitch(midiOf(pitch));  // sound the entered pitch
    const insertAt = selected != null ? selected + 1 : s.elements.length;
    dispatch(insertElement(insertAt, noteOf(pitch, armed, armedDots)));
    if (selected != null) setSelected(insertAt);
  }, [armed, armedDots, armedAlter, selected, dispatch]);

  // MIDI note-on → insert a note at the exact pitch the keyboard played.
  // Uses the currently-armed duration/dots so the "arm quarter, play notes"
  // rhythm matches every other DAW/scoring app. armedAlter only affects
  // the choice of enharmonic spelling for black keys: sharp by default
  // (matches Sibelius Fast Note Input), flat when the user armed ♭.
  const addPitchFromMidi = useCallback((midi: number) => {
    const prefer = armedAlter === -1 ? 'flat' : 'sharp';
    const pitch = midiToPitch(midi, prefer);
    playPitch(midi);
    const s = scoreRef.current;
    const insertAt = selected != null ? selected + 1 : s.elements.length;
    dispatch(insertElement(insertAt, noteOf(pitch, armed, armedDots)));
    if (selected != null) setSelected(insertAt);
  }, [armed, armedDots, armedAlter, selected, dispatch]);

  const midi = useMidiInput(addPitchFromMidi);

  const addRest = useCallback(() => {
    const insertAt = selected != null ? selected + 1 : scoreRef.current.elements.length;
    dispatch(insertElement(insertAt, restOf(armed, armedDots)));
    if (selected != null) setSelected(insertAt);
  }, [armed, armedDots, selected, dispatch]);

  const deleteAtCursor = useCallback(() => {
    const at = selected ?? scoreRef.current.elements.length - 1;
    if (at < 0) return false;
    dispatch(deleteElement(at));
    setSelected(null);
    return true;
  }, [selected, dispatch]);

  const moveSelection = useCallback((dir: 1 | -1) => {
    const s = scoreRef.current;
    if (s.elements.length === 0) return;
    setSelected((cur) => {
      const next = cur == null ? (dir === 1 ? 0 : s.elements.length - 1) : cur + dir;
      return Math.max(0, Math.min(s.elements.length - 1, next));
    });
  }, []);

  const nudgePitch = useCallback((dir: 1 | -1) => {
    if (selected == null) return;
    const el = scoreRef.current.elements[selected];
    if (el?.kind === 'note') playPitch(midiOf(el.pitch) + dir);  // sound the new pitch
    dispatch(transpose(selected, dir));
  }, [selected, dispatch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Task 12 puts this editor on a page with a title <input>, due-date input, and
      // student <select>. Without this guard, typing into those fields would be
      // hijacked as note-entry keystrokes (e.g. "c" inserting a note).
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;

      const s = scoreRef.current;
      const dur = DURATIONS.find((d) => d.key === e.key);
      if (dur) { setArmed(dur.code); return; }
      if (/^[a-gA-G]$/.test(e.key)) {
        addPitch(e.key.toUpperCase() as Pitch['step']);
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        addRest();
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (deleteAtCursor()) e.preventDefault();
        return;
      }
      if (e.key === '.') {
        e.preventDefault();
        if (selected != null && s.elements[selected]) {
          const el = s.elements[selected];
          dispatch(changeDuration(selected, el.base, ((el.dots + 1) % 3) as 0 | 1 | 2));
        } else {
          setArmedDots((d) => ((d + 1) % 3) as 0 | 1 | 2);
        }
        return;
      }
      const ACC: Record<string, -1 | 0 | 1> = { '=': 1, '-': -1, '0': 0 };
      if (e.key in ACC) {
        const alter = ACC[e.key];
        if (selected != null && s.elements[selected]?.kind === 'note') dispatch(setAccidental(selected, alter));
        else setArmedAlter(alter);
        return;
      }
      if (e.key === 't' || e.key === 'T') {
        if (selected != null && s.elements[selected]?.kind === 'note') dispatch(tieToNext(selected));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (selected != null && s.elements[selected]?.kind === 'note') dispatch(respellEnharmonic(selected));
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        moveSelection(e.key === 'ArrowRight' ? 1 : -1);
        return;
      }
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && selected != null) {
        e.preventDefault();
        nudgePitch(e.key === 'ArrowUp' ? 1 : -1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, dispatch, addPitch, addRest, deleteAtCursor, moveSelection, nudgePitch]);

  return (
    <div className="space-y-2">
      {/* Duration palette + dots + accidentals — one compact row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {DURATIONS.map((d) => {
          // Duration is the "armed pen" — the one thing the user is about
          // to insert. Painting the active choice in the primary color
          // makes it read at a glance rather than blending in with the
          // rest of the toolbar. Matches the Lyrics=orange / MIDI=red
          // convention of using one color per armed-mode family.
          const active = armed === d.code;
          return (
            <button
              key={d.code}
              onClick={() => setArmed(d.code)}
              className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                active ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className={`mr-1 font-mono text-[11px] ${active ? 'text-primary-foreground/80' : 'text-slate-400'}`}>{d.key}</span>
              {d.label}
            </button>
          );
        })}
        <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden />
        {/* Rhythmic dots: real bold bullets rather than "Dot: N" text so the
            button reads as musical notation instead of a form field. w-14
            keeps a 0/1/2-dot label from jostling neighbors when it flips.
            The 0 state shows a faded outline dot so the affordance is
            visible even when the button is "off". */}
        <button
          onClick={() => setArmedDots((d) => ((d + 1) % 3) as 0 | 1 | 2)}
          className={`rounded-md px-2.5 py-1.5 font-bold w-14 text-center leading-none ${
            armedDots > 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
          }`}
          title={`Dots: ${armedDots}`}
          aria-label={`Dots: ${armedDots}`}
        >
          <span className="text-2xl tracking-tight">
            {armedDots === 0 ? '○' : '•'.repeat(armedDots)}
          </span>
        </button>
        {/* Accidentals — larger glyphs so ♮ ♯ ♭ read at score-symbol size
            instead of body-text size, matching the real notation they'll
            attach to. Fixed w-10 for consistent hit target. */}
        <button
          onClick={() => setArmedAlter(0)}
          className={`rounded-md px-2 py-1 w-10 text-center leading-none text-2xl font-semibold ${
            armedAlter === 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
          }`}
          aria-label="Natural"
        >♮</button>
        <button
          onClick={() => setArmedAlter(1)}
          className={`rounded-md px-2 py-1 w-10 text-center leading-none text-2xl font-semibold ${
            armedAlter === 1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
          }`}
          aria-label="Sharp"
        >♯</button>
        <button
          onClick={() => setArmedAlter(-1)}
          className={`rounded-md px-2 py-1 w-10 text-center leading-none text-2xl font-semibold ${
            armedAlter === -1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
          }`}
          aria-label="Flat"
        >♭</button>
        <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden />
        {/* Lyrics + MIDI live in a nested flex group so they wrap together
            as one unit when the toolbar runs out of width — MIDI never
            spills onto its own line while Lyrics stays behind. Fixed
            widths mean neither button shifts its neighbor when armed. */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              const next = !lyricMode;
              setLyricMode(next);
              // Entering lyric mode with nothing selected: drop the cursor on the first note.
              if (next && (selected == null || score.elements[selected]?.kind !== 'note')) {
                const first = score.elements.findIndex((el) => el.kind === 'note');
                if (first >= 0) setSelected(first);
              }
            }}
            // Orange when armed (matches the orange lyric-cursor + selection
            // color used in NotationView so "lyrics mode" reads visually
            // consistent with the surface it drives).
            className={`rounded-md px-2.5 py-1.5 text-sm font-medium w-20 text-center ${
              lyricMode
                ? 'bg-orange-500 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            Lyrics
          </button>
          {midi.state.supported && (
            <button
              onClick={() => (midi.state.connected ? midi.disable() : midi.enable())}
              // Same fixed-width + color-only feedback as Lyrics — rose-600
              // when live so it reads as "hot mic".
              className={`rounded-md px-2.5 py-1.5 text-sm font-medium w-16 text-center ${
                midi.state.connected
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
              title={midi.state.connected
                ? `MIDI on — listening to: ${midi.state.inputNames.join(', ') || '(no device)'}`
                : 'Enable a plugged-in MIDI keyboard for note entry'}
            >
              MIDI
            </button>
          )}
        </div>
      </div>
      {midi.state.error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
          MIDI: {midi.state.error}
        </div>
      )}
      {midi.state.connected && midi.state.inputNames.length === 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          MIDI is on but no keyboards are connected. Plug one in — it'll be picked up automatically.
        </div>
      )}
      <div className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs leading-relaxed text-slate-600">
        <span className="font-medium text-slate-700">Type, tap the note pad, or play a MIDI keyboard.</span>{' '}
        Press <Kbd>A</Kbd>–<Kbd>G</Kbd> to add notes · <Kbd>1</Kbd>–<Kbd>6</Kbd> duration ·{' '}
        <Kbd>.</Kbd> dot · <Kbd>=</Kbd> sharp · <Kbd>-</Kbd> flat · <Kbd>R</Kbd> rest ·{' '}
        <Kbd>←</Kbd>/<Kbd>→</Kbd> select a note · <Kbd>↑</Kbd>/<Kbd>↓</Kbd> move its pitch ·{' '}
        <Kbd>T</Kbd> tie to next · <Kbd>↵</Kbd> respell (♯/♭) · <Kbd>⌫</Kbd> delete ·{' '}
        <Kbd>Lyrics</Kbd> then type under the note: <Kbd>Space</Kbd> = next word, <Kbd>-</Kbd> = hyphen to next syllable.
      </div>
      {/* On-screen note pad — tap-to-enter for phones/tablets (the keydown
          shortcuts above need a hardware keyboard, which touch devices lack).
          Also usable with a mouse; fires the exact same shared actions. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const).map((step) => (
          <button
            key={step}
            aria-label={`Add note ${step}`}
            onClick={() => addPitch(step)}
            className="min-w-10 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 active:bg-slate-900 active:text-white"
          >
            {step}
          </button>
        ))}
        <button aria-label="Add rest" onClick={addRest} className={pill(false)}>Rest</button>
        <button aria-label="Delete" onClick={deleteAtCursor} className={pill(false)}>⌫</button>
        <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden />
        <button aria-label="Select previous note" onClick={() => moveSelection(-1)} className={pill(false)}>◀</button>
        <button aria-label="Select next note" onClick={() => moveSelection(1)} className={pill(false)}>▶</button>
        <button aria-label="Pitch up" onClick={() => nudgePitch(1)} className={pill(false)}>▲</button>
        <button aria-label="Pitch down" onClick={() => nudgePitch(-1)} className={pill(false)}>▼</button>
      </div>
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <NotationView
          score={score}
          onNoteClick={setSelected}
          selectedIndex={selected}
          editingLyric={lyricMode && selected != null && score.elements[selected]?.kind === 'note'}
          lyricValue={selected != null ? (score.elements[selected] as any)?.lyric ?? '' : ''}
          onLyricChange={(v) => selected != null && dispatch(setLyric(selected, v))}
          onLyricAdvance={() => selected != null && advanceToNextNote(selected)}
          onLyricExit={() => setLyricMode(false)}
        />
      </div>
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-800 shadow-sm">
      {children}
    </kbd>
  );
}
