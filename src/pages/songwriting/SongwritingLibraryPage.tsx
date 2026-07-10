// Songwriting Library — the songs a student owns, plus songs another
// student in the tenant has chosen to share. Click a card to open the
// editor; "New song" creates a blank two-section song and navigates
// straight into it.

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Plus, Music2, Trash2 } from 'lucide-react';
import { listMySongs, listSharedSongs, createSong, deleteSong } from '@/lib/songwriting/songsApi';
import type { SongSummary } from '@/lib/songwriting/types';

function songMeta(s: SongSummary) {
  return `${s.section_count} section${s.section_count !== 1 ? 's' : ''} · updated ${new Date(s.updated_at).toLocaleDateString()}`;
}

export default function SongwritingLibraryPage() {
  const [songs, setSongs] = useState<SongSummary[]>([]);
  const [shared, setShared] = useState<SongSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [mine, theirs] = await Promise.all([listMySongs(), listSharedSongs()]);
        if (cancelled) return;
        setSongs(mine);
        setShared(theirs);
      } catch {
        if (!cancelled) toast.error('Could not load songs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function newSong() {
    try {
      const song = await createSong({
        title: 'Untitled song',
        sections: [
          { id: crypto.randomUUID(), type: 'verse', label: 'Verse 1', lines: [''] },
          { id: crypto.randomUUID(), type: 'chorus', label: 'Chorus', lines: [''] },
        ],
      });
      navigate(`/songwriting/${song.id}`);
    } catch {
      toast.error('Could not create song');
    }
  }

  async function removeSong(id: string) {
    if (!window.confirm('Delete this song? This cannot be undone.')) return;
    try {
      await deleteSong(id);
      setSongs((s) => s.filter((x) => x.id !== id));
      toast.success('Song deleted');
    } catch {
      toast.error('Could not delete song');
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Your songs</h1>
        <Button onClick={newSong}>
          <Plus className="w-4 h-4 mr-1" /> New song
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : songs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center bg-muted/30">
          <Music2 className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No songs yet — start your first one.</p>
          <Button onClick={newSong}>
            <Plus className="w-4 h-4 mr-1" /> New song
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {songs.map((s) => (
            <li
              key={s.id}
              className="group flex items-center justify-between gap-3 rounded-xl border bg-card shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <Link to={`/songwriting/${s.id}`} className="flex-1 min-w-0">
                <div className="text-base font-semibold leading-tight truncate">{s.title || 'Untitled'}</div>
                <div className="text-xs text-muted-foreground mt-1">{songMeta(s)}</div>
              </Link>
              <button
                type="button"
                onClick={() => removeSong(s.id)}
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 shrink-0 p-2 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                aria-label="Delete song"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Shared with your ensemble</h2>
          {shared.length === 0 ? (
            <p className="text-sm text-muted-foreground">No songs shared yet.</p>
          ) : (
            <ul className="space-y-2">
              {shared.map((s) => (
                <li key={s.id} className="rounded-xl border bg-card shadow-sm p-4">
                  <Link to={`/songwriting/${s.id}`} className="block min-w-0">
                    <div className="text-base font-semibold leading-tight truncate">{s.title || 'Untitled'}</div>
                    <div className="text-xs text-muted-foreground mt-1">{songMeta(s)}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
