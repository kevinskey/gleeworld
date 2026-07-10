import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorScore, noteOf, restOf, Pitch } from '@/lib/notation/model';
import { BaseDur } from '@/lib/notation/duration';
import { insertElement, deleteElement, transpose, CommandStack } from '@/lib/notation/commands';
import { NotationView } from './NotationView';

const DURATIONS: { code: BaseDur; label: string; key: string }[] = [
  { code: 'whole', label: 'Whole', key: '1' }, { code: 'half', label: 'Half', key: '2' },
  { code: 'quarter', label: 'Quarter', key: '3' }, { code: 'eighth', label: 'Eighth', key: '4' },
  { code: '16th', label: '16th', key: '5' }, { code: '32nd', label: '32nd', key: '6' },
];

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
        const pitch = nearestPitch(e.key.toUpperCase() as Pitch['step'], prev ? prev.pitch : null);
        dispatch(insertElement(s.elements.length, noteOf(pitch, armed)));
        return;
      }
      if (e.key === 'r' || e.key === 'R') { dispatch(insertElement(s.elements.length, restOf(armed))); return; }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const at = selected ?? s.elements.length - 1;
        if (at >= 0) {
          e.preventDefault();
          dispatch(deleteElement(at));
          setSelected(null);
        }
        return;
      }
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && selected != null) {
        e.preventDefault();
        dispatch(transpose(selected, e.key === 'ArrowUp' ? 1 : -1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [armed, selected, dispatch]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {DURATIONS.map((d) => (
          <button key={d.code} onClick={() => setArmed(d.code)}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${armed === d.code ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {d.label}
          </button>
        ))}
      </div>
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <NotationView score={score} onNoteClick={setSelected} />
      </div>
    </div>
  );
}
