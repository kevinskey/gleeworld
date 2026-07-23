// Songwriting Library — the songs a student owns, plus songs another
// student in the tenant has chosen to share. Click a card to open the
// editor; "New song" creates a blank two-section song and navigates
// straight into it.
//
// Editorial layout with a hero background photo — matches Studio home.
// Photo is served from /songwriting-bg.png (opacity-60 for legibility).

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';
import {
  Plus, Music2, Trash2, Pencil, Feather, Share2,
} from 'lucide-react';
import {
  listMySongs, listSharedSongs, createSong, deleteSong,
} from '@/lib/songwriting/songsApi';
import type { SongSummary } from '@/lib/songwriting/types';

function songMeta(s: SongSummary) {
  return `${s.section_count} section${s.section_count !== 1 ? 's' : ''} · updated ${new Date(s.updated_at).toLocaleDateString()}`;
}

export default function SongwritingLibraryPage() {
  const [songs, setSongs] = useState<SongSummary[]>([]);
  const [shared, setShared] = useState<SongSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Load the two lists independently so a shared-songs failure can never
      // blank the user's own list (and vice versa).
      const [mine, theirs] = await Promise.allSettled([listMySongs(), listSharedSongs()]);
      if (cancelled) return;
      if (mine.status === 'fulfilled') {
        setSongs(mine.value);
      } else {
        console.error(mine.reason);
        toast.error('Could not load songs');
      }
      if (theirs.status === 'fulfilled') {
        setShared(theirs.value);
      } else {
        // Shared list is secondary: log it and fall through to the empty
        // "No songs shared yet." state without a second toast.
        console.error(theirs.reason);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function newSong() {
    if (creating) return;
    setCreating(true);
    try {
      const song = await createSong({
        title: 'Untitled song',
        sections: [
          { id: crypto.randomUUID(), type: 'verse', label: 'Verse 1', lines: [''] },
          { id: crypto.randomUUID(), type: 'chorus', label: 'Chorus', lines: [''] },
        ],
      });
      navigate(`/songwriting/${song.id}`);
    } catch (e) {
      console.error(e);
      toast.error('Could not create song');
    } finally {
      setCreating(false);
    }
  }

  async function removeSong(id: string) {
    if (!window.confirm('Delete this song? This cannot be undone.')) return;
    try {
      await deleteSong(id);
      setSongs((s) => s.filter((x) => x.id !== id));
      toast.success('Song deleted');
    } catch (e) {
      console.error(e);
      toast.error('Could not delete song');
    }
  }

  return (
    <div className="relative min-h-full">
      {/* Songwriting hero background — served from /public/songwriting-bg.png.
       *
       * sticky top-0 h-screen keeps the photo pinned to the top of the
       * scroll container's viewport at all times — no matter how tall
       * the songs list gets, the chair stays visible.
       *
       * The negative margin (-mb-[100vh]) cancels the space this
       * element would otherwise push into flow, so content sits over
       * the bg instead of below it. */}
      <div
        aria-hidden
        className="pointer-events-none sticky top-0 -mb-[100vh] h-screen bg-cover bg-center bg-no-repeat opacity-60 z-0"
        style={{ backgroundImage: 'url(/songwriting-bg.png)' }}
      />
      <div className="relative px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto space-y-6">
        <header className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="!text-[1.4rem] sm:!text-[2rem] font-bold tracking-tight flex items-center gap-2 drop-shadow-sm">
              <Pencil className="w-7 h-7 text-primary" /> Your songs
            </h1>
            <p className="text-sm text-foreground/85 mt-1 drop-shadow-sm">
              Draft lyrics, arrange sections, share drafts with your ensemble.
            </p>
          </div>
          <Button onClick={newSong} disabled={creating}>
            <Plus className="w-4 h-4 mr-1" /> {creating ? 'Creating…' : 'New song'}
          </Button>
        </header>

        {loading ? (
          <div className="text-sm text-foreground drop-shadow-md">Loading…</div>
        ) : songs.length === 0 ? (
          <EmptySongwriting onStart={newSong} creating={creating} />
        ) : (
          <ul className="divide-y divide-foreground/30 border-y border-foreground/30">
            {songs.map((s, i) => (
              <li
                key={s.id}
                className="group flex items-center gap-4 py-3.5 px-2 -mx-2 rounded-lg hover:bg-background/40 hover:backdrop-blur-sm transition"
              >
                <span className="w-6 text-right text-xs font-mono tabular-nums text-foreground/90 shrink-0 drop-shadow-md">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Link to={`/songwriting/${s.id}`} className="flex-1 min-w-0">
                  <div className="text-base font-semibold leading-tight truncate drop-shadow-md">
                    {s.title || 'Untitled'}
                  </div>
                  <div className="text-xs text-foreground mt-0.5 drop-shadow-md">{songMeta(s)}</div>
                </Link>
                <button
                  type="button"
                  onClick={() => removeSong(s.id)}
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 shrink-0 p-2 rounded-md text-foreground/70 hover:text-rose-600 hover:bg-rose-500/15"
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
            <h2 className="text-lg font-semibold tracking-tight drop-shadow-md">Shared with your ensemble</h2>
            {shared.length === 0 ? (
              <p className="text-sm text-foreground drop-shadow-md">No songs shared yet.</p>
            ) : (
              <ul className="divide-y divide-foreground/30 border-y border-foreground/30">
                {shared.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-4 py-3.5 px-2 -mx-2 rounded-lg hover:bg-background/40 hover:backdrop-blur-sm transition">
                    <span className="w-6 text-right text-xs font-mono tabular-nums text-foreground/90 shrink-0 drop-shadow-md">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <Link to={`/songwriting/${s.id}`} className="flex-1 min-w-0">
                      <div className="text-base font-semibold leading-tight truncate drop-shadow-md">
                        {s.title || 'Untitled'}
                      </div>
                      <div className="text-xs text-foreground mt-0.5 drop-shadow-md">{songMeta(s)}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Empty-state hero — mirrors StudioHome's EmptyStudio. Glass badge, bold
// headline, pill CTA, three feature chips that describe the workflow
// (Draft → Arrange → Share).
function EmptySongwriting({ onStart, creating }: { onStart: () => void; creating: boolean }) {
  return (
    <div className="py-14 sm:py-24">
      <div className="max-w-md mx-auto text-center flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 backdrop-blur-md border border-primary/40 flex items-center justify-center shadow-lg">
          <Feather className="w-8 h-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight drop-shadow-md">
            Write something.
          </h2>
          <p className="text-sm sm:text-base text-foreground drop-shadow-md">
            Verses, choruses, bridges. Drafts save automatically and sync everywhere you sign in.
          </p>
        </div>

        <Button
          size="lg"
          onClick={onStart}
          disabled={creating}
          className="rounded-full px-6 shadow-lg"
        >
          <Plus className="w-4 h-4 mr-1.5" /> {creating ? 'Creating…' : 'Start your first song'}
        </Button>

        <div className="pt-4 grid grid-cols-3 gap-2 w-full max-w-sm">
          <FeatureChip icon={Pencil} label="Draft" />
          <FeatureChip icon={Music2} label="Arrange" />
          <FeatureChip icon={Share2} label="Share" />
        </div>
      </div>
    </div>
  );
}

function FeatureChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-2 px-2 rounded-lg bg-background/40 backdrop-blur-sm border border-border/60">
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-[11px] font-medium text-foreground drop-shadow-md">{label}</span>
    </div>
  );
}
