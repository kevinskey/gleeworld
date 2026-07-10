// Ported from the standalone songwriter app's client/src/components/SectionBlock.tsx.
// Editing logic (line editing, dictation, syllable badges, add/remove lines,
// send-line-to-graveyard via Backspace-on-empty) is kept byte-identical to
// the source — only imports and Tailwind classes changed for this app's
// light theme + shadcn design tokens.

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Mic, Square, ChevronUp, ChevronDown, X } from 'lucide-react';
import type { Section } from '@/lib/songwriting/types';
import { countSyllables } from '@/lib/songwriting/syllables';
import { createRecognition, isSpeechRecognitionSupported } from '@/lib/songwriting/speech';
import { analyzeInternalRhymes, tintFor, tokenize } from '@/lib/songwriting/rhymeKey';

type Props = {
  section: Section;
  canMoveUp: boolean;
  canMoveDown: boolean;
  focusedLine: number | null;
  highlightRhymes?: boolean;
  // Viewer (non-owner) opening a tenant-shared song: render the label and
  // lines as plain text (syllable badges stay), and hide every editing
  // affordance (dictation mic, reorder/delete). Autosave is separately
  // guarded at update()'s source in SongwritingEditorPage, so this is a UX
  // affordance, not the write safety net.
  readOnly?: boolean;
  onChange: (patch: Partial<Section>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onFocusLine: (index: number) => void;
  onSelectWord: (word: string) => void;
};

const TYPE_COLORS: Record<Section['type'], string> = {
  verse: 'text-muted-foreground',
  'pre-chorus': 'text-amber-700',
  chorus: 'text-primary',
  bridge: 'text-purple-700',
  intro: 'text-muted-foreground',
  outro: 'text-muted-foreground',
};

export default function SectionBlock({
  section, canMoveUp, canMoveDown, focusedLine, highlightRhymes, readOnly = false,
  onChange, onDelete, onMoveUp, onMoveDown, onFocusLine, onSelectWord,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any | null>(null);
  const linesRef = useRef<string[]>(section.lines);
  const [dictatingIndex, setDictatingIndex] = useState<number | null>(null);
  const [interim, setInterim] = useState<string>('');
  const dictationSupported = isSpeechRecognitionSupported();

  // Keep latest lines accessible to recognition handlers without re-binding listeners
  useEffect(() => { linesRef.current = section.lines; }, [section.lines]);

  useEffect(() => () => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    recognitionRef.current = null;
  }, []);

  function updateLine(i: number, value: string) {
    const lines = [...linesRef.current];
    lines[i] = value;
    onChange({ lines });
  }

  function stopDictation() {
    const rec = recognitionRef.current;
    if (rec) {
      try { rec.stop(); } catch { /* noop */ }
    }
    recognitionRef.current = null;
    setDictatingIndex(null);
    setInterim('');
  }

  function startDictation(i: number) {
    if (recognitionRef.current) stopDictation();
    const rec = createRecognition();
    if (!rec) {
      toast.error('Dictation is not supported in this browser');
      return;
    }
    recognitionRef.current = rec;
    setDictatingIndex(i);
    setInterim('');

    rec.onresult = (event: any) => {
      let interimText = '';
      let finalText = '';
      for (let r = event.resultIndex; r < event.results.length; r++) {
        const result = event.results[r];
        const t = result[0]?.transcript || '';
        if (result.isFinal) finalText += t;
        else interimText += t;
      }
      if (finalText) {
        const current = linesRef.current[i] || '';
        const sep = current && !current.endsWith(' ') ? ' ' : '';
        const cleaned = finalText.trim();
        if (cleaned) updateLine(i, current + sep + cleaned);
      }
      setInterim(interimText);
    };
    rec.onerror = (e: any) => {
      const code = e?.error;
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        toast.error('Microphone access denied. Enable it in your browser settings.');
      } else if (code === 'no-speech') {
        // Common, non-fatal — silently end this attempt
      } else if (code) {
        toast.error(`Dictation error: ${code}`);
      }
      stopDictation();
    };
    rec.onend = () => {
      // Browser auto-stops after silence; surface that as "stopped"
      if (recognitionRef.current === rec) {
        recognitionRef.current = null;
        setDictatingIndex(null);
        setInterim('');
      }
    };

    try {
      rec.start();
    } catch (err: any) {
      toast.error(err?.message || 'Could not start dictation');
      stopDictation();
    }
  }

  function toggleDictation(i: number) {
    if (dictatingIndex === i) {
      stopDictation();
    } else {
      startDictation(i);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, i: number) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const lines = [...section.lines];
      lines.splice(i + 1, 0, '');
      onChange({ lines });
      setTimeout(() => {
        const inputs = containerRef.current?.querySelectorAll<HTMLTextAreaElement>('textarea.lyric-line');
        inputs?.[i + 1]?.focus();
      }, 0);
    } else if (e.key === 'Backspace' && section.lines[i] === '' && section.lines.length > 1) {
      e.preventDefault();
      const lines = section.lines.filter((_, idx) => idx !== i);
      onChange({ lines });
      setTimeout(() => {
        const inputs = containerRef.current?.querySelectorAll<HTMLTextAreaElement>('textarea.lyric-line');
        inputs?.[Math.max(0, i - 1)]?.focus();
      }, 0);
    }
  }

  function handleMouseUp(e: React.MouseEvent<HTMLTextAreaElement>) {
    const input = e.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    if (start !== end) {
      const selected = input.value.slice(start, end).trim();
      if (selected && /^[a-zA-Z'-]+$/.test(selected)) onSelectWord(selected);
    } else {
      const value = input.value;
      let l = start, r = start;
      while (l > 0 && /[a-zA-Z'-]/.test(value[l - 1])) l--;
      while (r < value.length && /[a-zA-Z'-]/.test(value[r])) r++;
      const word = value.slice(l, r);
      if (word) onSelectWord(word);
    }
  }

  return (
    <div ref={containerRef} className="group">
      <div className="flex items-center gap-2 mb-2">
        {readOnly ? (
          <span className={`text-xs font-semibold uppercase tracking-widest ${TYPE_COLORS[section.type]}`}>
            {section.label || section.type}
          </span>
        ) : (
          <input
            type="text"
            value={section.label || ''}
            onChange={(e) => onChange({ label: e.target.value })}
            className={`text-xs font-semibold uppercase tracking-widest bg-transparent border-0 focus:outline-none w-auto min-w-[5rem] ${TYPE_COLORS[section.type]}`}
            placeholder={section.type}
          />
        )}
        <div className="flex-1 h-px bg-border" />
        {!readOnly && (
          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
            <button
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-1"
              aria-label="Move section up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-1"
              aria-label="Move section down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="text-rose-500 hover:text-rose-700 p-1"
              aria-label="Delete section"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div>
        {readOnly && section.lines.map((line, i) => (
          <div key={i}>
            <div className="flex items-start gap-3 py-1">
              <p className="flex-1 font-serif text-base leading-snug text-foreground whitespace-pre-wrap m-0">
                {line || <span className="text-muted-foreground/60">(blank line)</span>}
              </p>
              <span
                className="text-xs font-medium text-muted-foreground w-6 text-right tabular-nums select-none"
                title="Syllable count"
              >
                {line ? countSyllables(line) : ''}
              </span>
            </div>
            {highlightRhymes && line.trim() && <RhymePreview line={line} />}
          </div>
        ))}
        {!readOnly && section.lines.map((line, i) => {
          const isDictating = dictatingIndex === i;
          return (
            <div key={i} className="group/line">
              <div className="flex items-start gap-3">
                <textarea
                  rows={1}
                  value={line}
                  onChange={(e) => updateLine(i, e.target.value)}
                  onFocus={() => onFocusLine(i)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  onMouseUp={handleMouseUp}
                  style={{ fieldSizing: 'content' } as unknown as React.CSSProperties}
                  className={`lyric-line w-full bg-transparent border-0 border-b ${
                    focusedLine === i ? 'border-primary' : 'border-transparent hover:border-border'
                  } focus:border-primary focus:outline-none py-1 px-0 resize-none overflow-hidden font-serif text-base leading-snug text-foreground placeholder:text-muted-foreground/60`}
                  placeholder={i === 0 ? 'Start writing…' : ''}
                />
                <button
                  type="button"
                  onClick={() => toggleDictation(i)}
                  disabled={!dictationSupported}
                  title={
                    !dictationSupported
                      ? 'Dictation not supported in this browser'
                      : isDictating
                      ? 'Stop dictation'
                      : 'Dictate into this line'
                  }
                  className={`w-6 h-6 flex items-center justify-center rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                    isDictating
                      ? 'text-rose-600'
                      : 'text-muted-foreground/50 hover:text-primary opacity-0 group-hover/line:opacity-100 focus:opacity-100'
                  }`}
                  aria-pressed={isDictating}
                  aria-label={isDictating ? 'Stop dictation' : 'Start dictation'}
                >
                  {isDictating ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <span
                  className="text-xs font-medium text-muted-foreground w-6 text-right tabular-nums select-none"
                  title="Syllable count"
                >
                  {line ? countSyllables(line) : ''}
                </span>
              </div>
              {isDictating && interim && (
                <div className="text-sm text-muted-foreground italic pl-0 pr-16 leading-snug">
                  {interim}
                </div>
              )}
              {highlightRhymes && line.trim() && <RhymePreview line={line} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RhymePreview({ line }: { line: string }) {
  const { tokens, isWord } = tokenize(line);
  const wordTokens = tokens.filter((_, i) => isWord[i]);
  const map = analyzeInternalRhymes(wordTokens);
  if (map.groupCount === 0) return null;

  let wordIdx = -1;
  return (
    <div className="text-sm font-serif leading-snug pl-0 pr-16 mt-0.5 -ml-0.5">
      {tokens.map((tok, i) => {
        if (!isWord[i]) return <span key={i}>{tok}</span>;
        wordIdx += 1;
        const group = map.groups[wordIdx];
        if (group) {
          return (
            <span key={i} className={`px-1 rounded ${tintFor(group)}`}>
              {tok}
            </span>
          );
        }
        return <span key={i} className="text-muted-foreground">{tok}</span>;
      })}
    </div>
  );
}
