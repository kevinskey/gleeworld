// YouTube search results, shown in place of the library grid while a search
// is active. Add is admin-only (youtube_videos writes are admin-gated by
// RLS); preview is for everyone.
import React from 'react';
import { Loader2, Play, Plus, Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { YouTubeHit } from '@/hooks/useYouTubeSearch';

interface YouTubeResultsPanelProps {
  hits: YouTubeHit[];
  searching: boolean;
  error: string | null;
  term: string;
  canAdd: boolean;
  existingVideoIds: Set<string>;
  // videoId of the row mid-insert, so only that button shows a spinner.
  addingId: string | null;
  onAdd: (hit: YouTubeHit) => void;
  onPreview: (hit: YouTubeHit) => void;
  onBack: () => void;
}

const formatDate = (value: string): string => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const YouTubeResultsPanel: React.FC<YouTubeResultsPanelProps> = ({
  hits, searching, error, term, canAdd, existingVideoIds, addingId, onAdd, onPreview, onBack,
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <h2 className="!text-sm font-semibold text-foreground">
        YouTube results for “{term}”
      </h2>
      <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={onBack}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to library
      </Button>
    </div>

    {searching && (
      <div className="flex items-center gap-2 py-16 justify-center text-sm text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" /> Searching YouTube…
      </div>
    )}

    {!searching && error && (
      <div className="py-16 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )}

    {!searching && !error && hits.length === 0 && (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">No YouTube results for “{term}”.</p>
      </div>
    )}

    {!searching && !error && hits.length > 0 && (
      <ul className="space-y-2">
        {hits.map((hit) => {
          const inLibrary = existingVideoIds.has(hit.videoId);
          const adding = addingId === hit.videoId;
          return (
            <li key={hit.videoId} className="flex gap-3 p-3 rounded-xl border border-border bg-card">
              <button
                type="button"
                onClick={() => onPreview(hit)}
                aria-label={`Play ${hit.title}`}
                className="shrink-0 aspect-video w-40 rounded overflow-hidden bg-muted relative group"
              >
                {hit.thumbnail ? (
                  <img src={hit.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                )}
              </button>
              <div className="flex-1 min-w-0">
                {/* Explicit text-sm: the global h3 rule is 22px/700, which would
                    let the metadata outweigh the thumbnail. */}
                <h3 className="!text-sm font-medium text-foreground line-clamp-2">{hit.title}</h3>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {hit.channelTitle}
                  {formatDate(hit.publishedAt) && ` · ${formatDate(hit.publishedAt)}`}
                </div>
                <div className="flex items-center gap-1 pt-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => onPreview(hit)}>
                    <Play className="w-3.5 h-3.5 mr-1" /> Preview
                  </Button>
                  {canAdd && !inLibrary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => onAdd(hit)}
                      disabled={adding}
                    >
                      {adding
                        ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Adding…</>
                        : <><Plus className="w-3.5 h-3.5 mr-1" /> Add</>}
                    </Button>
                  )}
                  {inLibrary && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground px-2">
                      <Check className="w-3.5 h-3.5" /> In library
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </div>
);
