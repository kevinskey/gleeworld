// Playlist detail modal — opens when a user clicks a playlist row on
// /video's My Playlists tab. Shows the videos in display_order with
// reorder / remove / play controls, plus header actions for share and
// rename. Does not do server-side pagination — playlists rarely get
// long enough to need it.

import { useCallback, useEffect, useState } from 'react';
import {
  Loader2, Play, Trash2, ArrowUp, ArrowDown, Share2, Pencil, X,
  ListVideo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  loadPlaylistItems, removePlaylistItem, reorderPlaylist,
  type Playlist, type PlaylistItemWithVideo,
} from '@/hooks/useVideoLibrary';

interface Props {
  playlist: Playlist | null;
  open: boolean;
  onClose: () => void;
  onShare: (p: Playlist) => void;
  onRename: (p: Playlist) => void;
  onPlay: (video: { video_id: string; title: string; video_url: string }) => void;
  onChanged: () => void; // triggers refresh of playlist row (counts, updated_at)
}

export function PlaylistDetailDialog({
  playlist, open, onClose, onShare, onRename, onPlay, onChanged,
}: Props) {
  const [items, setItems] = useState<PlaylistItemWithVideo[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!playlist) return;
    setLoading(true);
    const rows = await loadPlaylistItems(playlist.id);
    setItems(rows);
    setLoading(false);
  }, [playlist]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const remove = async (itemId: string) => {
    await removePlaylistItem(itemId);
    setItems((prev) => prev.filter((i) => i.itemId !== itemId));
    onChanged();
  };

  const move = async (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    // Optimistic local swap so the UI feels instant.
    const swapped = [...items];
    [swapped[index], swapped[next]] = [swapped[next], swapped[index]];
    // Renumber display_order sequentially so future reorders are stable.
    const renumbered = swapped.map((it, i) => ({ ...it, displayOrder: i }));
    setItems(renumbered);
    await reorderPlaylist(renumbered.map(({ itemId, displayOrder }) => ({ itemId, displayOrder })));
    onChanged();
  };

  const playAll = () => {
    if (items.length === 0) return;
    // Simple play-first behavior for now — queue-and-autonext is a
    // follow-up (needs the modal to expose an "onEnded" hook).
    const first = items[0];
    onPlay({ video_id: first.video_id, title: first.title, video_url: first.video_url });
  };

  if (!playlist) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2">
            <ListVideo className="w-5 h-5 text-destructive" />
            {playlist.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap border-b border-border pb-3">
          <Button size="sm" onClick={playAll} disabled={items.length === 0}>
            <Play className="w-3.5 h-3.5 mr-1 fill-current" /> Play first
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onShare(playlist)}>
            <Share2 className="w-3.5 h-3.5 mr-1" /> Share
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onRename(playlist)}>
            <Pencil className="w-3.5 h-3.5 mr-1" /> Rename
          </Button>
          <div className="ml-auto text-xs text-muted-foreground">
            {items.length} video{items.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="overflow-y-auto -mx-1 px-1 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-destructive" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Empty. Add videos from the All tab — use the <span className="font-medium">Save</span> button on any card.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((it, index) => {
                const fallbackThumb = `https://img.youtube.com/vi/${it.video_id}/hqdefault.jpg`;
                return (
                  <li key={it.itemId} className="flex items-center gap-3 py-2">
                    <div className="text-xs text-muted-foreground w-6 text-right tabular-nums">
                      {index + 1}
                    </div>
                    <button
                      onClick={() => onPlay({ video_id: it.video_id, title: it.title, video_url: it.video_url })}
                      className="shrink-0 aspect-video w-28 rounded overflow-hidden bg-muted group relative"
                    >
                      <img
                        src={it.thumbnail_url || fallbackThumb}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                      {it.duration && (
                        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">
                          {it.duration}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => onPlay({ video_id: it.video_id, title: it.title, video_url: it.video_url })}
                      className="flex-1 text-left text-sm font-medium hover:text-destructive line-clamp-2"
                    >
                      {it.title}
                    </button>
                    <div className="flex items-center gap-0.5">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => move(index, -1)} disabled={index === 0}>
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => move(index, 1)} disabled={index === items.length - 1}>
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => remove(it.itemId)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4 mr-1" /> Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
