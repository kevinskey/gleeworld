import { useRef } from 'react';
import { cn } from '@/lib/utils';
import type { BibleAnnotation, BibleVerse, AnnotationColor } from '@/hooks/useBible';

/**
 * One verse, with its marks.
 *
 * Apple Pencil handling lives here. A pointerdown carries `pointerType`, which
 * is 'pen' for the Pencil, 'touch' for a finger and 'mouse' otherwise. We read
 * it on the way in and default a Pencil to UNDERLINE and everything else to
 * HIGHLIGHT — matching how people actually use a physical Bible, and giving the
 * Pencil a distinct job rather than making it a second finger.
 *
 * Marks are rendered from stored character ranges, not from ink, so they hold
 * their place when the text reflows at a different width or font size.
 */

const HIGHLIGHT_CLASS: Record<AnnotationColor, string> = {
  yellow: 'bg-yellow-200/70',
  green: 'bg-green-200/70',
  blue: 'bg-blue-200/70',
  pink: 'bg-pink-200/70',
  orange: 'bg-orange-200/70',
  purple: 'bg-purple-200/70',
};

const UNDERLINE_CLASS: Record<AnnotationColor, string> = {
  yellow: 'decoration-yellow-500',
  green: 'decoration-green-600',
  blue: 'decoration-blue-600',
  pink: 'decoration-pink-500',
  orange: 'decoration-orange-500',
  purple: 'decoration-purple-600',
};

export interface VerseRowProps {
  verse: BibleVerse;
  /** Size classes for the verse text. The reader passes its own so the text
   *  sizer works — a hardcoded text-sm here silently overrode it. */
  textClassName?: string;
  annotations: BibleAnnotation[];
  hasNote: boolean;
  onMark: (verse: number, pointerType: string) => void;
  onOpenNote: (verse: number) => void;
}

export function VerseRow({
  verse, annotations, hasNote, onMark, onOpenNote,
  textClassName = 'text-sm sm:text-base',
}: VerseRowProps) {
  // pointerType is only available on the pointer event, not on click, so it is
  // captured here and read again when the click fires.
  const pointerType = useRef<string>('mouse');

  const whole = annotations.filter((a) => a.start_offset === null);
  const highlight = whole.find((a) => a.style === 'highlight');
  const underline = whole.find((a) => a.style === 'underline');

  return (
    <p
      className="group flex gap-2 sm:gap-3 py-1 leading-relaxed"
      data-verse={verse.verse}
    >
      <button
        type="button"
        onClick={() => onOpenNote(verse.verse)}
        className={cn(
          'shrink-0 w-8 text-right text-xs pt-1 tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          hasNote ? 'text-primary font-semibold' : 'text-muted-foreground',
        )}
        aria-label={`Note on verse ${verse.verse}`}
        title={hasNote ? 'Open note' : 'Add a note'}
      >
        {verse.verse}
        {hasNote && <span aria-hidden className="ml-0.5">•</span>}
      </button>

      <span
        role="button"
        tabIndex={0}
        onPointerDown={(e) => {
          pointerType.current = e.pointerType || 'mouse';
        }}
        onClick={() => onMark(verse.verse, pointerType.current)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onMark(verse.verse, 'keyboard');
          }
        }}
        className={cn(
          'cursor-pointer rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          textClassName,
          highlight && HIGHLIGHT_CLASS[highlight.color],
          underline && `underline decoration-2 underline-offset-4 ${UNDERLINE_CLASS[underline.color]}`,
        )}
      >
        {verse.text}
      </span>
    </p>
  );
}
