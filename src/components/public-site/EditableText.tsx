// Wix-style inline text editing primitive. When `editable=false` (public
// site, or preview but not in edit mode), it renders a plain element with
// the value. When `editable=true`, the same element becomes contentEditable
// so tenants can click and type directly on the canvas — no separate form
// field, no round-trip to a side panel.
//
// Why contentEditable and not TipTap / Slate / Lexical: these fields are
// plain strings (headline, subheading, section title) — no formatting,
// links, or embedded media. A rich-text framework would add ~35KB gz + peer
// deps for zero user-visible value. When a block needs real rich text
// (footnotes, links, colored spans), we'll graduate that specific block to
// TipTap without dragging everything else along.
import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';

export interface EditableTextProps {
  value: string;
  onChange: (next: string) => void;
  editable: boolean;
  /** Allow newlines. Enter inserts a break instead of committing. */
  multiline?: boolean;
  /** Placeholder shown when the value is empty. Only visible in edit mode. */
  placeholder?: string;
  /** Element tag to render. h1/h2/p/span etc. */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

export const EditableText = forwardRef<HTMLElement, EditableTextProps>(function EditableText(
  {
    value,
    onChange,
    editable,
    multiline = false,
    placeholder,
    as = 'span',
    className,
    style,
    ariaLabel,
  },
  outerRef,
) {
  const ref = useRef<HTMLElement | null>(null);
  useImperativeHandle(outerRef, () => ref.current as HTMLElement);
  const [isFocused, setIsFocused] = useState(false);

  // Sync `value` → DOM only when the field is not focused. React can't
  // manage the text inside a contentEditable node (its virtual DOM would
  // fight the browser's own edits), so we imperatively set textContent on
  // mount and when the value changes externally — but never while the user
  // is typing, or the caret would jump to the start of the field on every
  // keystroke.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isFocused) return;
    if ((el.textContent ?? '') === value) return;
    el.textContent = value;
  }, [value, isFocused]);

  if (!editable) {
    // Non-preview or non-edit render: identical DOM to old inline text.
    // Keeps the public-site render byte-identical when editing is off.
    return createElement(as, { className, style }, value);
  }

  const handleBlur = (e: FocusEvent<HTMLElement>) => {
    setIsFocused(false);
    const raw = e.currentTarget.textContent ?? '';
    // Normalize whitespace lightly. For single-line fields collapse runs of
    // whitespace (browsers emit an nbsp when the field goes empty then
    // gets typed into again). For multiline keep newlines but drop trailing
    // spaces.
    const trimmed = multiline
      ? raw.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
      : raw.replace(/\s+/g, ' ').trim();
    if (trimmed !== value) onChange(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      // Escape reverts the field to its saved value and blurs — matches
      // the muscle memory from every other text field in the app.
      e.preventDefault();
      if (ref.current) ref.current.textContent = value;
      (e.currentTarget as HTMLElement).blur();
      return;
    }
    if (e.key === 'Enter' && !multiline && !e.shiftKey) {
      // Enter commits + blurs on single-line fields. Shift+Enter still
      // inserts a break (browsers do it natively) in case the field is
      // relabelled to multiline later.
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    }
  };

  const isEmpty = !value;
  return createElement(
    as,
    {
      ref: (el: HTMLElement | null) => {
        ref.current = el;
      },
      contentEditable: true,
      suppressContentEditableWarning: true,
      // The empty-state placeholder is drawn via a global CSS rule
      // (see src/index.css `[data-editable-text]:empty::before`) that reads
      // this data attribute. Rendering the placeholder as text inside the
      // node would break editing — the browser would treat it as content.
      'data-editable-text': true,
      'data-placeholder': placeholder ?? '',
      className: `focus:outline-none focus:ring-2 focus:ring-primary/60 rounded-sm min-w-[1ch] ${
        isEmpty ? 'gw-editable-empty' : ''
      } ${className ?? ''}`,
      style,
      role: 'textbox',
      spellCheck: true,
      'aria-multiline': multiline,
      'aria-label': ariaLabel,
      onFocus: () => setIsFocused(true),
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      // Stop the click from bubbling to the block frame's onClick so the
      // caret stays where the user placed it. Selection is already established
      // — the frame's mouseenter fires first for hover, and selection happens
      // via the frame's own onClick handler on outside-of-text clicks.
      onClick: (e: React.MouseEvent) => e.stopPropagation(),
      // Same for pointer events — prevents Hero's drag-to-reposition from
      // hijacking a caret placement inside the headline.
      onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    },
  );
});
