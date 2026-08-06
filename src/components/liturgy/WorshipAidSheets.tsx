import { useEffect, useRef } from 'react';
import { applyPanelEdits, type AidEditsByPanel, type RenderedBlock } from '@/lib/liturgy/aidEdits';
import { flowBlocks, type FlowResult } from '@/lib/liturgy/flow';
import {
  coverImageScale, coverTitleSize, panelSpacing,
  type AidEntry, type WorshipAid, type PanelId, type WorshipAidSettings,
} from '@/lib/liturgy/worshipAid';

/**
 * Brand colour, taken from the tenant's theme rather than hardcoded.
 *
 * --primary is what TenantThemeRoot writes from the tenant's accent, so a
 * parish's aid prints in its own colour. It resolves in print too: the
 * variable lives on <html> and print does not re-cascade.
 */
const BRAND = 'hsl(var(--primary))';

/**
 * The two printed sheets of a bifold worship aid.
 *
 * Sizing is in INCHES throughout, not pixels or rem. This is a physical
 * object — 11×8.5 landscape, folded once into two 5.5×8.5 panels — and inches
 * are the only units that survive the trip through a print dialog unchanged.
 * A rem-based layout would resize with the browser's font setting and quietly
 * reflow the program between the screen and the paper.
 *
 * The type is a serif stack on purpose: worship aids are read at arm's length
 * in low light by people who are not looking for a modern UI, and the parish
 * originals this was built from are set in Times. It deliberately does NOT
 * use the tenant's brand font, which can be anything up to a script face.
 */

const PANEL_W = 5.5;
const SHEET_H = 8.5;

function Notice({ text, spacing = 1 }: { text: string; spacing?: number }) {
  return (
    <div style={{
      border: `1px solid ${BRAND}`, padding: '0.09in 0.11in',
      margin: `${(0.10 * spacing).toFixed(3)}in 0`,
      fontStyle: 'italic', fontSize: '7.6pt', lineHeight: 1.35, textAlign: 'center',
    }}>
      {text}
    </div>
  );
}

function Divider({ label, spacing = 1 }: { label: string; spacing?: number }) {
  return (
    <div className="worship-aid-brand-text" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.10in',
      margin: `${(0.16 * spacing).toFixed(3)}in 0 ${(0.10 * spacing).toFixed(3)}in`,
      fontWeight: 700, fontSize: '11pt', letterSpacing: '0.02em', color: BRAND,
    }}>
      <span aria-hidden>✠</span>
      <span>{label}</span>
      <span aria-hidden>✠</span>
    </div>
  );
}

function Entry({ entry, spacing = 1 }: { entry: AidEntry; spacing?: number }) {
  if (entry.notice) return <Notice text={entry.notice} spacing={spacing} />;
  if (entry.divider) return <Divider label={entry.label} spacing={spacing} />;

  return (
    <div style={{ margin: `0 0 ${(0.11 * spacing).toFixed(3)}in` }}>
      {entry.label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.12in' }}>
          <span style={{ fontWeight: 700, fontSize: '8.6pt', letterSpacing: '0.01em' }}>
            {entry.label}
          </span>
          {(entry.citation || (!entry.title && entry.credit)) && (
            <span style={{ fontStyle: 'italic', fontSize: '8.6pt', whiteSpace: 'nowrap' }}>
              {entry.citation ?? entry.credit}
            </span>
          )}
        </div>
      )}
      {entry.title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.12in' }}>
          <span style={{ fontStyle: 'italic', fontSize: '8.6pt' }}>{entry.title}</span>
          {entry.credit && (
            <span style={{ fontStyle: 'italic', fontSize: '8.6pt', whiteSpace: 'nowrap' }}>
              {entry.credit}
            </span>
          )}
        </div>
      )}
      {entry.summary && (
        <p style={{ fontStyle: 'italic', fontSize: '8pt', lineHeight: 1.35, margin: '0.04in 0 0' }}>
          {entry.summary}
        </p>
      )}
      {entry.imageUrl && (
        // An engraved setting is a block of its own, not a picture beside
        // text: centred, with clear air above and below so it never reads as
        // part of the entry above it or collides with the one below.
        //
        // maxWidth rather than width, and a height cap, so it REDUCES to fit
        // (Kevin) — a wide engraving shrinks to the panel instead of running
        // over the fold, and a tall one cannot push the rest of the panel off
        // the page. Aspect ratio is preserved either way.
        <div style={{
          margin: `${(0.16 * spacing).toFixed(3)}in 0`,
          textAlign: 'center',
        }}>
          <img
            src={entry.imageUrl}
            alt=""
            style={{
              display: 'inline-block',
              maxWidth: '100%', maxHeight: '2.6in',
              width: 'auto', height: 'auto',
              objectFit: 'contain',
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * One printed page of the folded aid.
 *
 * It no longer measures itself. Pagination is decided by the line budget in
 * lib/liturgy/flow before anything renders — two competing measurements would
 * disagree the moment an image loaded late, and the one that decided the
 * print would not be the one that warned the user.
 */
function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      width: `${PANEL_W}in`, height: `${SHEET_H}in`, padding: '0.42in 0.40in',
      boxSizing: 'border-box', overflow: 'hidden', position: 'relative', ...style,
    }}>
      {children}
    </div>
  );
}

function FrontPanel({ aid, titleSize, imageScale }: {
  aid: WorshipAid; titleSize: number; imageScale: number;
}) {
  /**
   * A column, so the picture gets everything left over.
   *
   * It used to be a fixed maxHeight of 4.6in with the season word and QR
   * absolutely positioned over the bottom of the panel. That capped the
   * artwork at roughly half the page however large the slider went — the
   * slider only ever controlled WIDTH, and a tall portrait mark hit the
   * height limit long before it ran out of width. Laying the panel out as a
   * column means the image takes the real remaining space, and the slider
   * now trims it back from full size rather than being the only thing
   * holding it up.
   */
  return (
    <Panel style={{ textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: `${titleSize}pt`, lineHeight: 1.15, marginBottom: '0.16in', flexShrink: 0 }}>
        {aid.front.title}
      </div>

      {aid.front.imageUrl && (
        // min-height:0 is what actually lets a flex child shrink to its
        // container instead of forcing the column taller than the panel.
        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={aid.front.imageUrl}
            alt=""
            style={{
              display: 'block',
              maxWidth: `${Math.round(imageScale * 100)}%`,
              maxHeight: '100%',
              width: 'auto', height: 'auto',
              objectFit: 'contain',
            }}
          />
        </div>
      )}

    </Panel>
  );
}

function BackPanel({ aid, spacing, qrDataUrl, blocks }: {
  aid: WorshipAid; spacing: number; qrDataUrl?: string | null; blocks: RenderedBlock[];
}) {
  return (
    <Panel>
      {aid.spineText && (
        // Up the outer edge of the back cover, as on the parish original.
        <div style={{
          position: 'absolute', left: '0.12in', top: 0, bottom: 0,
          display: 'flex', alignItems: 'center',
        }}>
          <span style={{
            writingMode: 'vertical-rl', transform: 'rotate(180deg)',
            fontSize: '7.5pt', letterSpacing: '0.04em',
          }}>
            {aid.spineText}
          </span>
        </div>
      )}
      <div style={{ marginLeft: aid.spineText ? '0.22in' : 0 }}>
        {blocks.map((b) => (
          <div key={b.key} style={b.gapAfter ? { marginBottom: `${b.gapAfter}in` } : undefined}>
            <Entry entry={b.entry} spacing={spacing} />
          </div>
        ))}
        {/* The phone code belongs on the BACK, not the cover: it is what you
            look for as you leave, and the cover is the parish's face. */}
        {qrDataUrl && (
          <div style={{ marginTop: '0.18in', textAlign: 'center' }}>
            <img src={qrDataUrl} alt="" style={{ width: '0.72in', height: '0.72in' }} />
            <div style={{ fontSize: '6.6pt', marginTop: '0.03in' }}>Follow along on your phone</div>
          </div>
        )}
      </div>
    </Panel>
  );
}

function SideBand({ day, date }: { day: string; date: string }) {
  if (!day && !date) return null;
  return (
    <div className="worship-aid-band" style={{
      position: 'absolute', right: 0, top: 0, bottom: 0, width: '0.62in',
      background: BRAND, color: 'hsl(var(--primary-foreground))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{
        writingMode: 'vertical-rl', fontSize: '13pt', letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
      }}>
        {day}{day && date ? '   ·   ' : ''}{date}
      </span>
    </div>
  );
}

export interface WorshipAidSheetsProps {
  aid: WorshipAid;
  qrDataUrl?: string | null;
  /** Read for its per-panel spacing multipliers. */
  settings: WorshipAidSettings;
  /** The user's edits, merged over the generated panels. */
  edits?: AidEditsByPanel;
  /** Lines of content that will not fit in the four pages at all. The
   *  document cannot grow, so this is what the editor must surface. */
  onFlow?: (result: FlowResult) => void;
}

/**
 * Both sheets, imposed for folding.
 *
 * Sheet 1 is [back | front] — NOT [front | back]. Fold the sheet and the
 * front cover lands on the outside with the back wrapping around. Reversing
 * them prints a program that reads back-to-front once folded, which looks
 * fine on screen and is only discovered after the copies are made.
 */
export function WorshipAidSheets({
  aid, qrDataUrl, settings, edits, onFlow,
}: WorshipAidSheetsProps) {
  const gap = (p: PanelId) => panelSpacing(settings, p);

  /**
   * One stream, then paginated — not three independent panels.
   *
   * The aid reads 1 → 4 like any document, so the content is merged with the
   * user's edits, joined end to end in reading order, and flowed across the
   * three content pages. When a page fills the remainder moves to the next
   * one instead of being cut off at the fold.
   *
   * Which panel an entry was generated for still decides its ORDER — that is
   * the order of the Mass — but no longer decides which page it prints on.
   */
  const stream: RenderedBlock[] = [
    ...applyPanelEdits(aid.insideLeft, edits?.insideLeft),
    ...applyPanelEdits(aid.insideRight, edits?.insideRight),
    ...applyPanelEdits(aid.back, edits?.back),
  ];
  const flowed: FlowResult = flowBlocks(stream);
  // Reported after render, not during: calling a parent's setState while
  // rendering re-renders this component and loops.
  const flowRef = useRef(onFlow); flowRef.current = onFlow;
  useEffect(() => { flowRef.current?.(flowed); });
  const page = (p: 'insideLeft' | 'insideRight' | 'back') => flowed.pages[p];
  return (
    <div className="worship-aid-sheets">
      <style>{`
        @page { size: 11in 8.5in; margin: 0; }
        .worship-aid-sheets { font-family: 'Times New Roman', Times, serif; color: #000; }
        .worship-aid-sheet {
          width: 11in; height: 8.5in; display: flex; background: #fff;
          position: relative; page-break-after: always; break-after: page;
        }
        .worship-aid-sheet:last-child { page-break-after: auto; break-after: auto; }
        /* The fold, shown on screen only — a printed guide line would be
           visible on every copy. */
        .worship-aid-fold {
          position: absolute; top: 0; bottom: 0; left: 5.5in; width: 0;
          border-left: 1px dashed #bbb;
        }
        @media print {
          .worship-aid-fold { display: none; }
          .worship-aid-sheet { box-shadow: none; margin: 0; }

          /* Print ONLY the sheets.
             This page renders inside the dashboard shell, so without this the
             sidebar and header print alongside the program and push it off
             the paper. Hiding by visibility rather than display keeps the
             sheets' own absolute positioning intact, and works without this
             component having to know the shell's class names. */
          body * { visibility: hidden !important; }
          .worship-aid-sheets, .worship-aid-sheets * { visibility: visible !important; }
          .worship-aid-sheets {
            position: absolute !important; left: 0 !important; top: 0 !important;
            margin: 0 !important; padding: 0 !important; width: auto !important;
          }
          html, body {
            margin: 0 !important; padding: 0 !important; background: #fff !important;
          }

          /* The app's global print reset flattens every colour to black on
             white, which is right for a document and wrong for a design
             element: it turned the day/date band into black text on white and
             lost the band entirely. print-color-adjust tells the browser to
             render it as specified rather than "optimising" it away. */
          .worship-aid-band {
            background: hsl(var(--primary)) !important;
            color: hsl(var(--primary-foreground)) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Section headings and notice rules are brand-coloured too — the
             same global reset would flatten them to black. */
          .worship-aid-brand-text { color: hsl(var(--primary)) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important; }

          /* That same global block prints every link's href in parentheses
             after it. Useful in an article, ruinous in a program. */
          .worship-aid-sheets a[href]::after { content: none !important; }
        }
        @media screen {
          .worship-aid-sheet {
            box-shadow: 0 1px 12px rgba(0,0,0,0.18); margin: 0 auto 1rem;
          }
        }
      `}</style>

      <div className="worship-aid-sheet">
        <BackPanel
          aid={aid}
          spacing={gap('back')}
          qrDataUrl={qrDataUrl}
          blocks={page('back')}
        />
        <FrontPanel
          aid={aid}
          titleSize={coverTitleSize(settings)}
          imageScale={coverImageScale(settings)}
        />
        <div className="worship-aid-fold" aria-hidden />
      </div>

      <div className="worship-aid-sheet">
        <Panel>
          {page('insideLeft').map((b) => (
            <div key={b.key} style={b.gapAfter ? { marginBottom: `${b.gapAfter}in` } : undefined}>
              <Entry entry={b.entry} spacing={gap('insideLeft')} />
            </div>
          ))}
        </Panel>
        <Panel style={{ paddingRight: '0.80in' }}>
          {page('insideRight').map((b) => (
            <div key={b.key} style={b.gapAfter ? { marginBottom: `${b.gapAfter}in` } : undefined}>
              <Entry entry={b.entry} spacing={gap('insideRight')} />
            </div>
          ))}
          <SideBand day={aid.sideBand.day} date={aid.sideBand.date} />
        </Panel>
        <div className="worship-aid-fold" aria-hidden />
      </div>
    </div>
  );
}
