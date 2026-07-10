import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { EditorScore, noteOf, restOf, Pitch } from '@/lib/notation/model';
import { BaseDur } from '@/lib/notation/duration';
import { insertElement, deleteElement, transpose, changeDuration, tieToNext, setAccidental, CommandStack } from '@/lib/notation/commands';
import { NotationView } from './NotationView';

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
  const stackRef = useRef(new CommandStack());
  const scoreRef = useRef(score); scoreRef.current = score;

  const dispatch = useCallback((cmd: Parameters<CommandStack['do']>[0]) => {
    onChange(stackRef.current.do(cmd, scoreRef.current));
  }, [onChange]);

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
        const prev = [...s.elements].reverse().find((el) => el.kind === 'note') as any;
        const basePitch = nearestPitch(e.key.toUpperCase() as Pitch['step'], prev ? prev.pitch : null);
        const pitch = { ...basePitch, alter: armedAlter };
        const insertAt = selected != null ? selected + 1 : s.elements.length;
        dispatch(insertElement(insertAt, noteOf(pitch, armed, armedDots)));
        if (selected != null) setSelected(insertAt);
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        const insertAt = selected != null ? selected + 1 : s.elements.length;
        dispatch(insertElement(insertAt, restOf(armed, armedDots)));
        if (selected != null) setSelected(insertAt);
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const at = selected ?? s.elements.length - 1;
        if (at >= 0) {
          e.preventDefault();
          dispatch(deleteElement(at));
          setSelected(null);
        }
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
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        if (s.elements.length === 0) return;
        setSelected((cur) => {
          const next = cur == null ? (e.key === 'ArrowRight' ? 0 : s.elements.length - 1)
                                   : cur + (e.key === 'ArrowRight' ? 1 : -1);
          return Math.max(0, Math.min(s.elements.length - 1, next));
        });
        return;
      }
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && selected != null) {
        e.preventDefault();
        dispatch(transpose(selected, e.key === 'ArrowUp' ? 1 : -1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [armed, armedDots, armedAlter, selected, dispatch]);

  return (
    <div className="space-y-2">
      {/* Duration palette + dots + accidentals — one compact row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {DURATIONS.map((d) => (
          <button key={d.code} onClick={() => setArmed(d.code)} className={pill(armed === d.code)}>
            {d.label}
          </button>
        ))}
        <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden />
        <button onClick={() => setArmedDots((d) => ((d + 1) % 3) as 0 | 1 | 2)} className={pill(armedDots > 0)}>
          Dot: {armedDots}
        </button>
        <button onClick={() => setArmedAlter(0)} className={pill(armedAlter === 0)}>♮</button>
        <button onClick={() => setArmedAlter(1)} className={pill(armedAlter === 1)}>♯</button>
        <button onClick={() => setArmedAlter(-1)} className={pill(armedAlter === -1)}>♭</button>
      </div>
      <div className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs leading-relaxed text-slate-600">
        <span className="font-medium text-slate-700">Type to write music.</span>{' '}
        Press <Kbd>A</Kbd>–<Kbd>G</Kbd> to add notes · <Kbd>1</Kbd>–<Kbd>6</Kbd> duration ·{' '}
        <Kbd>.</Kbd> dot · <Kbd>=</Kbd> sharp · <Kbd>-</Kbd> flat · <Kbd>R</Kbd> rest ·{' '}
        <Kbd>←</Kbd>/<Kbd>→</Kbd> select a note · <Kbd>↑</Kbd>/<Kbd>↓</Kbd> move its pitch ·{' '}
        <Kbd>T</Kbd> tie to next · <Kbd>⌫</Kbd> delete. Click a note to select it.
      </div>
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <NotationView score={score} onNoteClick={setSelected} />
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
