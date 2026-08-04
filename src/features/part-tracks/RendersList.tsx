// Interim listen/download surface for finished renders (full practice
// player lands in Plan 2). Signed URLs resolve lazily on first play.
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getSignedUrl } from '@/utils/storage';
import type { PartTrackRender } from './types';

const PRESET_LABELS: Record<string, string> = {
  strong: 'strong',
  plus_piano: '+ piano',
  alone: 'alone',
  full: 'Full choir',
  piano_only: 'Piano only',
};

function humanize(r: PartTrackRender): string {
  const role = r.part_role ? r.part_role.replace('_', ' ') : '';
  const cased = role.replace(/\b\w/g, (c) => c.toUpperCase());
  if (r.kind === 'stem') return `${cased} (stem)`;
  if (!r.part_role) return PRESET_LABELS[r.mix_preset ?? ''] ?? r.mix_preset ?? 'Mix';
  return `${cased} — ${PRESET_LABELS[r.mix_preset ?? ''] ?? r.mix_preset}`;
}

function fmtDuration(ms: number | null): string {
  if (!ms) return '';
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function RenderRow({ render, onDownload }: { render: PartTrackRender; onDownload?: (r: PartTrackRender) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resolve = async () => {
    if (url || loading) return;
    setLoading(true);
    try {
      setUrl(await getSignedUrl('parttrack', render.audio_path, 3600));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border/50 last:border-0">
      <div className="min-w-0">
        <p className="text-sm truncate">{humanize(render)}</p>
        <p className="text-xs text-muted-foreground">{fmtDuration(render.duration_ms)}</p>
      </div>
      {url ? (
        <div className="flex items-center gap-2">
          <audio controls preload="none" src={url} className="h-8 max-w-56" />
          <Button asChild size="sm" variant="outline" className="text-xs">
            <a href={url} download onClick={() => onDownload?.(render)}>Download</a>
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="text-xs" disabled={loading} onClick={() => void resolve()}>
          {loading ? 'Loading…' : 'Play'}
        </Button>
      )}
    </div>
  );
}

export function RendersList({ renders, onDownload }: { renders: PartTrackRender[]; onDownload?: (r: PartTrackRender) => void }) {
  const stems = renders.filter((r) => r.kind === 'stem');
  const mixes = renders.filter((r) => r.kind === 'mix');
  return (
    <div className="space-y-4">
      {mixes.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-1">Practice mixes</p>
          {mixes.map((r) => <RenderRow key={r.id} render={r} onDownload={onDownload} />)}
        </div>
      )}
      {stems.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-1">Stems</p>
          {stems.map((r) => <RenderRow key={r.id} render={r} onDownload={onDownload} />)}
        </div>
      )}
    </div>
  );
}
