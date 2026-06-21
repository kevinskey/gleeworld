// Speech-to-text button for editable fields.
//
// Wraps the browser's webkitSpeechRecognition (Chromium / WebKit incl.
// iOS Safari ≥ 14.5 and Capacitor WKWebView) in a small mic button.
// Tap → start listening; tap again or stop talking → callback with the
// transcript. The host field decides whether to APPEND the transcript
// (textareas) or REPLACE it (one-line inputs).
//
// We deliberately don't auto-start or hold the recognition session
// long-running — short bursts give better accuracy and avoid the
// "still listening?" prompts iOS surfaces after 30s.

import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { toast } from 'sonner';

// webkitSpeechRecognition is a vendor-prefixed global on Chromium + WebKit.
// We type it just enough to drive the parts we use.
interface RecognitionResult {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
  resultIndex: number;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionResult) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface SpeechInputButtonProps {
  /** Called with the final transcript text when the user stops talking. */
  onTranscript: (text: string) => void;
  /** Optional override — default is en-US. */
  lang?: string;
  /** Tooltip / aria-label. */
  label?: string;
  className?: string;
}

export function SpeechInputButton({
  onTranscript,
  lang = 'en-US',
  label = 'Dictate',
  className = '',
}: SpeechInputButtonProps) {
  const Ctor = getRecognitionCtor();
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Tear down on unmount so the page doesn't keep an open mic session.
  useEffect(() => () => {
    try { recognitionRef.current?.abort(); } catch { /* ignore */ }
  }, []);

  if (!Ctor) {
    // Browser doesn't ship recognition — render nothing so we don't
    // promise a feature the device can't deliver.
    return null;
  }

  const start = () => {
    try {
      const r = new Ctor();
      r.lang = lang;
      r.continuous = false;
      r.interimResults = false;
      r.onresult = (e) => {
        // Collect the final transcript from any results above the
        // current resultIndex (typically just one).
        let final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const result = e.results[i];
          if (result.isFinal) final += (result[0]?.transcript ?? '');
        }
        if (final.trim()) onTranscript(final.trim());
      };
      r.onerror = (e) => {
        const msg = e.error === 'not-allowed'
          ? 'Microphone access blocked. Allow it in Settings → GleeWorld.'
          : e.error === 'no-speech'
            ? "Didn't catch that — try again."
            : `Speech error: ${e.error}`;
        toast.message(msg);
        setListening(false);
      };
      r.onend = () => setListening(false);
      r.start();
      recognitionRef.current = r;
      setListening(true);
    } catch (err: any) {
      toast.message(err?.message ?? 'Could not start dictation.');
    }
  };

  const stop = () => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  };

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      aria-label={listening ? 'Stop dictation' : label}
      title={listening ? 'Stop dictation' : label}
      className={`inline-flex items-center justify-center rounded-md border border-border bg-card hover:bg-muted transition-colors ${
        listening ? 'text-rose-600 animate-pulse' : 'text-muted-foreground hover:text-foreground'
      } ${className}`}
    >
      {listening ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-3.5 h-3.5" />}
    </button>
  );
}
