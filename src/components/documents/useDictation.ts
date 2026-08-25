// Dictation for the Documents editor: speech lands at the cursor as you talk.
//
// Reuses the assistant's SpeechInputSource (web SpeechRecognition in
// browsers, the native GWSpeech mic in the iOS app), which delivers a
// stream of interim transcripts and one final per utterance-window. A
// window closes after ~2.5s of silence — fine for the assistant's
// one-question turns, wrong for dictation — so while the toggle is on we
// immediately reopen the mic after every window and keep going until the
// user taps the mic off (or the component unmounts).
//
// Only FINAL transcripts are inserted; interims are surfaced for a live
// preview but never touch the document, so nothing ever has to be
// un-typed. Each utterance is inserted with a trailing space; simple
// spoken punctuation ("period", "comma", "new line") is folded in.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { toast } from 'sonner';
import { getSpeechInput } from '@/lib/assistant/speech';

/** Spoken-punctuation folding. Word-boundary matches only, so "the period
 *  of Baroque music" keeps its noun — this maps the trailing command form
 *  people actually dictate ("...and that was it period"). */
const PUNCT: Array<[RegExp, string]> = [
  [/\b(?:full stop|period)\b/gi, '.'],
  [/\bcomma\b/gi, ','],
  [/\bquestion mark\b/gi, '?'],
  [/\bexclamation (?:point|mark)\b/gi, '!'],
  [/\bsemicolon\b/gi, ';'],
  [/\bcolon\b/gi, ':'],
];

function foldPunctuation(raw: string): { text: string; newParagraph: boolean } {
  let text = raw.trim();
  // "new line" / "new paragraph" anywhere → break the utterance there.
  const newParagraph = /\bnew (?:line|paragraph)\b/i.test(text);
  text = text.replace(/\s*\bnew (?:line|paragraph)\b\s*/gi, '');
  for (const [re, mark] of PUNCT) text = text.replace(re, mark);
  // Tidy the space speech engines leave before folded punctuation.
  text = text.replace(/\s+([.,;:?!])/g, '$1').trim();
  return { text, newParagraph };
}

export interface Dictation {
  /** False when neither a web recognizer nor the native mic exists. */
  available: boolean;
  active: boolean;
  /** Live in-progress transcript for preview UI. Empty between utterances. */
  interim: string;
  toggle: () => void;
}

export function useDictation(getEditor: () => Editor | null): Dictation {
  const [active, setActive] = useState(false);
  const [interim, setInterim] = useState('');
  const activeRef = useRef(false);
  const speechRef = useRef(getSpeechInput());
  // Self-reference so a closed window can reopen the next one without
  // useCallback ordering fights.
  const openWindowRef = useRef<() => void>(() => {});

  const insertFinal = useCallback((raw: string) => {
    const editor = getEditor();
    if (!editor) return;
    const { text, newParagraph } = foldPunctuation(raw);
    if (!text && !newParagraph) return;
    const chain = editor.chain().focus();
    if (text) chain.insertContent(text + ' ');
    if (newParagraph) chain.splitBlock();
    chain.run();
  }, [getEditor]);

  // Consecutive windows that produced not even an interim result. A live
  // mic in a quiet room still emits interims from breaths and room tone;
  // sustained absolute silence means the browser is wired to a dead input
  // (Kevin's iMac: Chrome pointed at an audio interface with no live
  // channel — dictation sat at "Listening…" forever). Stop and say so.
  const emptyWindowsRef = useRef(0);

  openWindowRef.current = () => {
    let finalTranscript = '';
    let heardAnything = false;
    speechRef.current.start(
      (t, isFinal) => {
        heardAnything = true;
        setInterim(t);
        if (isFinal) finalTranscript = t;
      },
      () => {
        setInterim('');
        if (finalTranscript.trim()) insertFinal(finalTranscript);
        if (!activeRef.current) return;
        emptyWindowsRef.current = heardAnything ? 0 : emptyWindowsRef.current + 1;
        if (emptyWindowsRef.current >= 4) {
          activeRef.current = false;
          setActive(false);
          emptyWindowsRef.current = 0;
          toast.error("Dictation can't hear anything", {
            description:
              'The microphone your browser is using seems silent. Check the mic choice in your browser’s site settings (or your system input), then tap the mic again.',
          });
          return;
        }
        // Silence closed the window, not the user — keep listening.
        openWindowRef.current();
      },
    );
  };

  const toggle = useCallback(() => {
    if (activeRef.current) {
      activeRef.current = false;
      setActive(false);
      speechRef.current.stop();
      return;
    }
    activeRef.current = true;
    setActive(true);
    emptyWindowsRef.current = 0;
    openWindowRef.current();
  }, []);

  // Unmount = stop the mic; a hot mic outliving its document is creepy.
  useEffect(() => () => {
    activeRef.current = false;
    speechRef.current.stop();
  }, []);

  return { available: speechRef.current.available, active, interim, toggle };
}
