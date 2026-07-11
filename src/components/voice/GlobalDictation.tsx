// App-wide voice dictation. Mounted once (App.tsx): a floating mic pill
// appears whenever a text-editable element has focus — every input,
// textarea, and rich editor on every page, current and future, with no
// per-component wiring. Speech goes in at the caret:
//   - inputs/textareas: native value setter + input event, so React
//     controlled fields see a real change
//   - contenteditable (TipTap/ProseMirror): execCommand insertText,
//     which ProseMirror ingests through its beforeinput path
// Uses the Web Speech API (Chrome/Edge/Safari). Where it's unavailable
// (Firefox, the iOS app's WKWebView) the pill never renders — iOS users
// already have the keyboard mic for native dictation.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { createRecognition, isSpeechRecognitionSupported } from '@/lib/songwriting/speech';

type Editable = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel']);

function findEditable(el: EventTarget | null): Editable | null {
  if (!(el instanceof HTMLElement)) return null;
  if (el instanceof HTMLInputElement) {
    return TEXT_INPUT_TYPES.has(el.type) && !el.readOnly && !el.disabled ? el : null;
  }
  if (el instanceof HTMLTextAreaElement) {
    return !el.readOnly && !el.disabled ? el : null;
  }
  const ce = el.closest('[contenteditable="true"], [contenteditable=""]');
  return ce instanceof HTMLElement ? ce : null;
}

function insertIntoTarget(target: Editable, text: string): void {
  if (!target.isConnected) return;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    const before = target.value.slice(0, start);
    const needsSpace = before.length > 0 && !/\s$/.test(before);
    const inserted = (needsSpace ? ' ' : '') + text;
    const proto = target instanceof HTMLInputElement
      ? window.HTMLInputElement.prototype
      : window.HTMLTextAreaElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    setter?.call(target, before + inserted + target.value.slice(end));
    const caret = start + inserted.length;
    try { target.setSelectionRange(caret, caret); } catch { /* type=email etc. */ }
    target.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  // contenteditable: let the editor's own input pipeline handle it
  target.focus();
  document.execCommand('insertText', false, ' ' + text);
}

export default function GlobalDictation() {
  const [supported] = useState(isSpeechRecognitionSupported);
  const [hasTarget, setHasTarget] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const targetRef = useRef<Editable | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const listeningRef = useRef(false);

  // follow focus: any text-editable element becomes the dictation target
  useEffect(() => {
    if (!supported) return;
    const onFocusIn = (e: FocusEvent) => {
      const editable = findEditable(e.target);
      if (editable) {
        targetRef.current = editable;
        setHasTarget(true);
      }
    };
    const onFocusOut = () => {
      // keep the pill (and an active session) alive briefly-focused UIs;
      // hide only when the target left the document and we're not recording
      setTimeout(() => {
        if (!listeningRef.current && !findEditable(document.activeElement)) {
          if (!targetRef.current?.isConnected) targetRef.current = null;
          setHasTarget(!!findEditable(document.activeElement));
        }
      }, 150);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, [supported]);

  const stop = useCallback(() => {
    listeningRef.current = false;
    setListening(false);
    setInterim('');
    try { recRef.current?.stop(); } catch { /* already stopped */ }
    recRef.current = null;
  }, []);

  const start = useCallback(() => {
    const rec = createRecognition();
    if (!rec) return;
    recRef.current = rec;
    listeningRef.current = true;
    setListening(true);
    setInterim('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text && targetRef.current) insertIntoTarget(targetRef.current, text);
        } else {
          interimText += result[0].transcript;
        }
      }
      setInterim(interimText.trim());
    };
    rec.onend = () => { if (listeningRef.current) stop(); };
    rec.onerror = () => { if (listeningRef.current) stop(); };
    try { rec.start(); } catch { stop(); }
  }, [stop]);

  // Escape ends a session from anywhere
  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') stop(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [listening, stop]);

  if (!supported || (!hasTarget && !listening)) return null;

  return (
    <div className="fixed bottom-24 right-4 z-[60] flex items-center gap-2 md:bottom-6">
      {listening && interim && (
        <div className="max-w-56 truncate rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-md" aria-live="polite">
          {interim}
        </div>
      )}
      <button
        type="button"
        // never steal focus from the field being dictated into
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (listening ? stop() : start())}
        aria-label={listening ? 'Stop dictation' : 'Dictate into the focused field'}
        aria-pressed={listening}
        className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-lg transition-colors ${
          listening
            ? 'border-destructive bg-destructive text-destructive-foreground'
            : 'border-border bg-card text-foreground hover:bg-accent'
        }`}
      >
        {listening
          ? <Square className="h-4 w-4" aria-hidden />
          : <Mic className="h-5 w-5" aria-hidden />}
        {listening && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-destructive ring-2 ring-background" aria-hidden />
        )}
      </button>
    </div>
  );
}
