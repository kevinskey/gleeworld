// A field you can type into directly on the page — the concert-program
// analogue of WorshipAidSheets.tsx's `Editable` (L96-135), copied as a
// pattern (not imported: that component is scoped to liturgy).
//
// contentEditable rather than an <input>: an input carries its own box,
// font and metrics, so the thing being edited would not be the thing that
// prints. Editing the rendered element means what's on screen IS the
// printed output. Commit is on BLUR, not per keystroke, so a burst of
// typing doesn't re-flow pagination out from under the caret.
import type { CSSProperties, KeyboardEvent } from 'react';

/** Read an editable element's text with its line breaks intact — textContent
 *  flattens <br> to nothing, which silently eats blank lines. */
function readText(el: HTMLElement): string {
  return el.innerHTML
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export interface EditableTextProps {
  value: string;
  placeholder?: string;
  /** Return `false` to reject the commit (e.g. a blank title) — EditableText
   *  then snaps the DOM back to `value`, mirroring the Escape path, so the
   *  on-page text never goes visually stale relative to the rejected edit. */
  onCommit: (v: string) => void | boolean;
  className?: string;
  /** Takes line breaks (Enter inserts one); a single-line field commits on Enter instead. */
  multiline?: boolean;
  inputRef?: (el: HTMLElement | null) => void;
  /** Fires before the field's own Enter/Escape handling — lets a caller
   *  (fast entry, Tab-to-composer) intercept the keypress first. */
  onKeyDownCapture?: (e: KeyboardEvent<HTMLElement>) => void;
  style?: CSSProperties;
}

export function EditableText({
  value, placeholder, onCommit, className, multiline, inputRef, onKeyDownCapture, style,
}: EditableTextProps) {
  return (
    <span
      ref={(el) => inputRef?.(el)}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-placeholder={placeholder}
      className={`cp-screen-editable${className ? ` ${className}` : ''}`}
      style={style}
      onKeyDownCapture={onKeyDownCapture}
      onBlur={(e) => {
        const next = readText(e.currentTarget);
        if (next !== value) {
          const accepted = onCommit(next);
          if (accepted === false) e.currentTarget.textContent = value;
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          // A heading/title is one line by definition — Enter commits.
          // Shift+Enter still forces a break if one is genuinely wanted.
          if (multiline || e.shiftKey) return;
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        } else if (e.key === 'Escape') {
          e.currentTarget.textContent = value;
          (e.currentTarget as HTMLElement).blur();
        }
      }}
    >
      {value}
    </span>
  );
}
