// Read-only "Works Cited" (MLA) / "References" (APA) list rendered from
// buildWorksCited, with the MLA/APA hanging-indent convention. Renders
// nothing when there are no sources yet.
import { buildWorksCited } from '@/lib/documents/citationFormat';
import type { CitationStyle, DocSource } from '@/lib/documents/types';

export interface WorksCitedPreviewProps {
  sources: DocSource[];
  style: CitationStyle;
}

export function WorksCitedPreview({ sources, style }: WorksCitedPreviewProps) {
  if (sources.length === 0) return null;

  const entries = buildWorksCited(sources, style);
  const heading = style === 'mla9' ? 'Works Cited' : 'References';

  return (
    <div className="font-serif text-[17px] leading-relaxed text-foreground">
      <h2 className="mb-4 text-center text-base font-semibold">{heading}</h2>
      <ul className="flex flex-col gap-3">
        {entries.map(({ source, segments }) => (
          <li key={source.id} className="pl-8 -indent-8">
            {segments.map((seg, i) => (seg.italic ? <i key={i}>{seg.text}</i> : <span key={i}>{seg.text}</span>))}
          </li>
        ))}
      </ul>
    </div>
  );
}
