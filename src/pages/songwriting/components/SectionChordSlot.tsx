// Ported from the standalone songwriter app's client/src/components/SectionChordSlot.tsx.
// Logic (attach new / paste linked / copy / detach, shared-chart ref-count
// notice) kept byte-identical to the source — only imports and Tailwind
// classes changed for this app's light theme + shadcn design tokens.

import type { ChordChart, Section } from '@/lib/songwriting/types';
import ChordChartEditor from './ChordChartEditor';

export default function SectionChordSlot({
  section,
  chart,
  bpm,
  refCount,
  clipboardChart,
  clipboardChartLabel,
  onChartChange,
  onTempoChange,
  onAttachNew,
  onAttachClipboard,
  onCopy,
  onDetach,
}: {
  section: Section;
  chart: ChordChart | undefined;
  bpm: number | null;
  refCount: number;
  clipboardChart: ChordChart | null;
  clipboardChartLabel: string | null;
  onChartChange: (next: ChordChart) => void;
  onTempoChange: (next: number) => void;
  onAttachNew: (sectionId: string) => void;
  onAttachClipboard: (sectionId: string) => void;
  onCopy: (chartId: string) => void;
  onDetach: (sectionId: string) => void;
}) {
  if (!chart) {
    return (
      <div className="mt-3 mb-2 text-xs flex items-center gap-2 text-muted-foreground">
        <button
          type="button"
          onClick={() => onAttachNew(section.id)}
          className="px-2.5 py-1 rounded-md border border-border hover:border-primary hover:text-primary"
        >
          + Add chord chart
        </button>
        {clipboardChart && (
          <button
            type="button"
            onClick={() => onAttachClipboard(section.id)}
            className="px-2.5 py-1 rounded-md border border-primary/40 text-primary hover:bg-primary/5"
            title={`Paste linked copy of "${clipboardChartLabel}"`}
          >
            Paste linked chart
          </button>
        )}
      </div>
    );
  }

  const isShared = refCount > 1;

  return (
    <div className="mt-3">
      <ChordChartEditor
        chart={chart}
        bpm={bpm}
        onChange={onChartChange}
        onTempoChange={onTempoChange}
        headerExtras={
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
            <button
              type="button"
              onClick={() => onCopy(chart.id)}
              title="Copy this chart so you can paste a linked copy into another section"
              className="text-xs px-2.5 py-1.5 rounded-md border border-border text-muted-foreground hover:border-primary hover:text-primary"
            >
              ⧉ Copy
            </button>
            <button
              type="button"
              onClick={() => onDetach(section.id)}
              title="Remove this chart from the section (other sections using it keep their copy)"
              className="text-xs px-2.5 py-1.5 rounded-md border border-border text-muted-foreground hover:border-rose-400 hover:text-rose-500"
            >
              Detach
            </button>
          </div>
        }
      />
      {isShared && (
        <div className="text-xs text-primary/80 mt-1 ml-1">
          Linked to {refCount} sections — edits propagate to all of them.
        </div>
      )}
    </div>
  );
}
