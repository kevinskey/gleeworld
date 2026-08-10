import { useEffect, useMemo, useRef, useState } from 'react';
import { NotationView } from '@/pages/notation/NotationView';
import { musicXmlToEditorScore } from '@/lib/notation/musicxmlRead';
import { svgToJpegBlob } from '@/lib/notation/exportImage';
import {
  psalmBarsPerLine, PSALM_WIDTH_PX, PSALM_ENGRAVING_SCALE, PSALM_MIN_ENGRAVING_SCALE,
} from '@/lib/liturgy/psalmComposer';

/**
 * Engrave a stored psalm setting AT THE MOMENT the worship aid is built.
 *
 * The aid used to print a JPEG that was engraved and uploaded when the psalm
 * was saved — months earlier, by whatever the engraving code looked like
 * then. Three fixes to that code (the staff height, the card's width, the
 * lyric size) all landed on a page that could not show any of them, because a
 * PNG on a CDN is not re-rendered by shipping a renderer. Every psalm ever
 * saved was frozen at its save-time engraving, and every future improvement
 * would have looked like it had not worked.
 *
 * So the MusicXML is the source of truth and this is where it becomes a
 * picture:
 *
 *     xml_content → EditorScore → NotationView → svgToJpegBlob → object URL
 *
 * Note where that chain stops. It stops at an `<img>`, deliberately — the
 * live SVG is NOT handed to the page. The archive PDF composites the rendered
 * sheets with html2canvas, which handles `<img>` reliably and is unpredictable
 * with inline SVG (it re-implements layout to paint a DOM tree, and misplaces
 * SVG glyphs often enough to matter for notation — the same reason
 * exportImage exists at all). Keeping the rasterisation step and moving only
 * WHEN it happens means the PDF path sees exactly the element it has always
 * seen, produced by today's code instead of last month's.
 *
 * The staff is drawn into a host that is in the document but off-screen. It
 * has to be really laid out, not `display: none`: VexFlow measures text to
 * decide spacing, and an unlaid-out subtree measures as zero.
 */

/** Far enough left to be off any viewport, without `display:none` (which
 *  would stop the browser laying the staff out at all) and without
 *  `visibility:hidden` (which stops canvas text metrics on some engines). */
const OFFSCREEN: React.CSSProperties = {
  position: 'fixed',
  left: '-20000px',
  top: 0,
  width: PSALM_WIDTH_PX,
  pointerEvents: 'none',
  opacity: 0,
};

export interface PsalmEngravingProps {
  /** The stored MusicXML. Null when this Mass has no composed setting. */
  xml: string | null;
  /**
   * Called with an object URL for the freshly engraved JPEG, or null when
   * there is nothing to engrave or the engraving failed.
   *
   * A URL handed over here is owned by this component and revoked when it is
   * superseded or when the component unmounts — the caller must not revoke
   * it, and must not hold it past unmount.
   */
  onImage: (url: string | null) => void;
}

export function PsalmEngraving({ xml, onImage }: PsalmEngravingProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  /** The URL currently handed out, so it can be revoked exactly once. */
  const urlRef = useRef<string | null>(null);
  // Held in a ref so a caller passing an inline arrow does not re-run the
  // engraving on every render of its parent.
  const onImageRef = useRef(onImage);
  onImageRef.current = onImage;

  /**
   * Parsed once per document, not once per render.
   *
   * This is the memoisation that matters: the effect below is keyed on this
   * object's identity, so a parent re-rendering for any other reason (a
   * spacing slider, a notice being typed) does not re-parse, re-engrave or
   * re-rasterise anything.
   */
  const score = useMemo(() => {
    if (!xml) return null;
    try {
      return musicXmlToEditorScore(xml);
    } catch {
      // A score that will not parse is not an error the person printing a
      // program can act on. Fall back — the caller's chain still has the
      // stored image and then the prose psalm behind this.
      return null;
    }
  }, [xml]);

  useEffect(() => {
    if (!score) { onImageRef.current(null); return; }
    // NotationView draws in its own effect, and child effects flush before
    // this one, so the SVG is already in the host by the time we look.
    const svg = hostRef.current?.querySelector('svg');
    if (!svg) { onImageRef.current(null); return; }

    let live = true;
    (async () => {
      try {
        const blob = await svgToJpegBlob(svg as SVGSVGElement);
        if (!live) return;
        const url = URL.createObjectURL(blob);
        const previous = urlRef.current;
        urlRef.current = url;
        onImageRef.current(url);
        // Safe to revoke immediately: an <img> that already loaded the old
        // URL keeps its decoded bitmap, and the caller has just been given
        // the new one.
        if (previous) URL.revokeObjectURL(previous);
      } catch {
        // Most often the music font failed to load, which would have
        // rasterised every notehead as an empty box. Reporting nothing lets
        // the caller fall back rather than print tofu.
        if (live) onImageRef.current(null);
      }
    })();
    return () => { live = false; };
  }, [score]);

  // One blob per document, released with the page. Separate from the effect
  // above so a re-engraving does not run this and an unmount always does.
  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }, []);

  if (!score) return null;

  return (
    <div ref={hostRef} style={OFFSCREEN} aria-hidden data-testid="psalm-engraving-host">
      <NotationView
        score={score}
        // Every one of these is the composer's own value, imported rather than
        // repeated: the aid must engrave the card the composer showed, and two
        // copies of a print spec drift the first time one of them is tuned.
        width={PSALM_WIDTH_PX}
        targetPerRow={psalmBarsPerLine(score)}
        scale={PSALM_ENGRAVING_SCALE}
        fitScaleFloor={PSALM_MIN_ENGRAVING_SCALE}
        lyricOffset={score.lyricOffset ?? 0}
      />
    </div>
  );
}
