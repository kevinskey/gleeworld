import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * A spinning-dial picker — the iOS wheel, built on native scrolling.
 *
 * Why native scroll rather than a drag-and-transform wheel: momentum, rubber
 * banding, trackpad, mouse wheel and Apple Pencil scrolling all come free and
 * feel right on every device. A hand-rolled drag handler has to reimplement
 * each of those and still gets the physics subtly wrong.
 *
 * CSS scroll-snap does the snapping. Selection is read back from scrollTop
 * after scrolling settles, which is the one piece browsers don't give us —
 * there is no cross-browser scrollend event yet, so it's debounced.
 *
 * Accessibility: this is a real listbox. Arrow keys, Home and End move the
 * selection, and each option carries aria-selected, so it is operable without
 * ever spinning anything.
 */

const ITEM_H = 40; // px — must match the item class height below
const VISIBLE = 5; // odd, so there is a true centre row

export interface DialOption {
  value: string;
  label: string;
  /** Optional group heading rendered above this option. */
  groupLabel?: string;
}

export interface DialPickerProps {
  options: DialOption[];
  value: string | null;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}

export function DialPicker({ options, value, onChange, label, className }: DialPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<number | null>(null);
  // Guards the scroll handler while we scroll programmatically, so setting the
  // value from outside doesn't immediately fire onChange back.
  const programmatic = useRef(false);

  const index = Math.max(0, options.findIndex((o) => o.value === value));

  const scrollToIndex = useCallback((i: number, behavior: ScrollBehavior) => {
    const el = ref.current;
    if (!el) return;
    programmatic.current = true;
    el.scrollTo({ top: i * ITEM_H, behavior });
    // Release the guard after the smooth scroll has had time to finish.
    window.setTimeout(() => { programmatic.current = false; }, behavior === 'smooth' ? 400 : 60);
  }, []);

  // Keep the wheel parked on the selected row when the value changes elsewhere
  // (chapter reset on book change, prev/next arrows, a search result).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (Math.round(el.scrollTop / ITEM_H) !== index) scrollToIndex(index, 'auto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, options.length]);

  const handleScroll = () => {
    if (programmatic.current) return;
    if (settle.current) window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM_H)));
      const next = options[i];
      if (next && next.value !== value) onChange(next.value);
    }, 90);
  };

  const move = (delta: number) => {
    const i = Math.min(options.length - 1, Math.max(0, index + delta));
    if (options[i] && options[i].value !== value) onChange(options[i].value);
    scrollToIndex(i, 'smooth');
  };

  const pad = ((VISIBLE - 1) / 2) * ITEM_H;

  return (
    <div className={cn('space-y-1', className)}>
      <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>

      <div className="relative" style={{ height: VISIBLE * ITEM_H }}>
        {/* Selection band. Purely decorative — pointer-events off so it never
            eats a scroll or a tap. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 z-10 border-y-2 border-primary/70 bg-primary/5"
          style={{ top: pad, height: ITEM_H }}
        />
        {/* Fade the rows away from centre so the wheel reads as a wheel. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              'linear-gradient(hsl(var(--card)) 0%, hsl(var(--card) / 0) 38%, hsl(var(--card) / 0) 62%, hsl(var(--card)) 100%)',
          }}
        />

        <div
          ref={ref}
          role="listbox"
          aria-label={label}
          tabIndex={0}
          onScroll={handleScroll}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
            else if (e.key === 'Home') { e.preventDefault(); move(-index); }
            else if (e.key === 'End') { e.preventDefault(); move(options.length - 1 - index); }
          }}
          className="h-full overflow-y-auto overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: 'y mandatory' }}
        >
          <div style={{ height: pad }} aria-hidden />
          {options.map((o, i) => (
            <div
              key={o.value}
              role="option"
              aria-selected={i === index}
              onClick={() => { onChange(o.value); scrollToIndex(i, 'smooth'); }}
              className={cn(
                'flex items-center justify-center px-3 cursor-pointer select-none text-center',
                i === index
                  ? 'text-base font-semibold text-foreground'
                  : 'text-sm text-muted-foreground',
              )}
              style={{ height: ITEM_H, scrollSnapAlign: 'center' }}
            >
              <span className="truncate">
                {o.label}
                {o.groupLabel && i === index && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {o.groupLabel}
                  </span>
                )}
              </span>
            </div>
          ))}
          <div style={{ height: pad }} aria-hidden />
        </div>
      </div>
    </div>
  );
}
