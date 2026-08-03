// "My Music" — the user's personal library (uploads, CPDL saves, store
// purchases, and Repertoire saves). User-scoped, follows the person
// across tenants. Spec: docs/superpowers/specs/2026-07-12-personal-music-library-design.md
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Music, Plus, LayoutGrid, List as ListIcon, Search } from 'lucide-react';
import { toast } from 'sonner';
import { usePersonalScores, type PersonalScore } from '@/hooks/usePersonalScores';
import { getSignedUrl } from '@/utils/storage';
import { PERSONAL_SCORES_BUCKET } from '@/lib/personalLibrary';
import { SOFT_CARD, SOFT_CARD_STYLE } from '@/components/music-library/scores/types';
import { ScoreViewerDialog, type ViewingScore } from '@/components/music-library/ScoreViewerDialog';
import { MyMusicCard } from '@/components/music-library/my-music/MyMusicCard';
import { MyMusicListRow } from '@/components/music-library/my-music/MyMusicListRow';
import { MyMusicUploadDialog } from '@/components/music-library/my-music/MyMusicUploadDialog';
import { EditPersonalScoreDialog } from '@/components/music-library/my-music/EditPersonalScoreDialog';
import { isExternalOnly } from '@/components/music-library/my-music/personalScoreDisplay';

type SortKey = 'recent' | 'oldest' | 'title-asc' | 'title-desc' | 'composer-asc' | 'source';

export function MyMusicTab() {
  const { scores, isLoading, uploadScore, updateScore, removeScore } = usePersonalScores();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<PersonalScore | null>(null);
  // Personal PDFs open in the SAME contain-fit viewer as the Scores tab
  // (whole page visible, no scrolling — PR #321). No `id`: annotation
  // tables FK to gw_sheet_music, so the viewer's annotation/audio lookups
  // stay disabled for personal scores.
  const [viewing, setViewing] = useState<ViewingScore | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  // Cards/list layout, persisted like the Scores tab's toggle.
  const [view, setView] = useState<'cards' | 'list'>(() =>
    typeof window !== 'undefined' && localStorage.getItem('gw-my-music-view') === 'list'
      ? 'list'
      : 'cards',
  );
  const changeView = (v: 'cards' | 'list') => {
    setView(v);
    try { localStorage.setItem('gw-my-music-view', v); } catch { /* private mode */ }
  };

  // Filter + sort into a derived list. Case-insensitive match against title,
  // composer, and voicing so a user typing "SATB" or "brahms" both work.
  // Empty query short-circuits — no need to run toLowerCase on every row.
  const visibleScores = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? scores.filter((s) =>
          (s.title || '').toLowerCase().includes(q)
          || (s.composer || '').toLowerCase().includes(q)
          || (s.voicing || '').toLowerCase().includes(q))
      : scores;
    // Sort a shallow copy — the source array is a react-query cache, mutating
    // it would break equality checks downstream.
    const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
    const sorted = [...filtered];
    switch (sortKey) {
      case 'title-asc':
        sorted.sort((a, b) => collator.compare(a.title || '', b.title || ''));
        break;
      case 'title-desc':
        sorted.sort((a, b) => collator.compare(b.title || '', a.title || ''));
        break;
      case 'composer-asc':
        sorted.sort((a, b) => collator.compare(a.composer || '', b.composer || ''));
        break;
      case 'source':
        sorted.sort((a, b) => a.source.localeCompare(b.source) || collator.compare(a.title, b.title));
        break;
      case 'oldest':
        sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
        break;
      case 'recent':
      default:
        sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return sorted;
  }, [scores, query, sortKey]);

  const openScore = async (s: PersonalScore) => {
    if (openingId) return; // one at a time — stacking clicks stacked requests
    // Repertoire saves (IMSLP / external) have no PDF of their own — they
    // open at the source site in a new tab.
    if (isExternalOnly(s)) {
      window.open(s.external_url!, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!s.storage_path) {
      toast.error(`"${s.title}" has no file attached.`);
      return;
    }
    setOpeningId(s.id);
    try {
      // waitForReady=false: that retry loop exists to ride out the post-upload
      // flatten window. Here the object has existed for a while, so a failure
      // is a real failure — retrying just burned 30 silent seconds.
      const url = await getSignedUrl(PERSONAL_SCORES_BUCKET, s.storage_path, 3600, false);
      if (!url) {
        toast.error(`Could not open "${s.title}". The file may be missing.`);
        return;
      }
      setViewing({ title: s.title, pdfUrl: url });
    } finally {
      setOpeningId(null);
    }
  };

  const removeWithConfirm = async (s: PersonalScore) => {
    if (!confirm(`Remove "${s.title}" from My Music?`)) return;
    try { await removeScore(s); toast.success('Removed'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Remove failed'); }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-8">Loading your music…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Your personal library — it follows you across every group you sing with.
        </p>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add a PDF
        </Button>
      </div>

      {scores.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, composer, or voicing…"
              className="pl-9"
              aria-label="Search My Music"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="flex-1 sm:w-56" aria-label="Sort My Music">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="title-asc">Title A → Z</SelectItem>
                <SelectItem value="title-desc">Title Z → A</SelectItem>
                <SelectItem value="composer-asc">Composer A → Z</SelectItem>
                <SelectItem value="source">Source</SelectItem>
              </SelectContent>
            </Select>
            <div className="shrink-0 flex items-center gap-0.5 rounded-lg border border-border p-0.5" role="group" aria-label="Layout">
              <Button
                variant={view === 'cards' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-2.5"
                onClick={() => changeView('cards')}
                aria-label="Card view"
                aria-pressed={view === 'cards'}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={view === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-2.5"
                onClick={() => changeView('list')}
                aria-label="List view"
                aria-pressed={view === 'list'}
              >
                <ListIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {scores.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center bg-muted/30">
          <Music className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
          <p className="text-sm font-medium">No music yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add a PDF, save a public-domain score, or buy one from a publisher.
          </p>
        </div>
      ) : visibleScores.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center bg-muted/30">
          <Search className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
          <p className="text-sm font-medium">No matches for "{query}"</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try a shorter search, or clear it to see everything.
          </p>
        </div>
      ) : view === 'cards' ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleScores.map((s) => (
            <li key={s.id}>
              <MyMusicCard
                score={s}
                opening={openingId === s.id}
                onOpen={() => openScore(s)}
                onEdit={() => setEditing(s)}
                onRemove={() => removeWithConfirm(s)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <div className="divide-y divide-border">
            {visibleScores.map((s) => (
              <MyMusicListRow
                key={s.id}
                score={s}
                opening={openingId === s.id}
                onOpen={() => openScore(s)}
                onEdit={() => setEditing(s)}
                onRemove={() => removeWithConfirm(s)}
              />
            ))}
          </div>
        </Card>
      )}

      <MyMusicUploadDialog
        open={adding}
        onClose={() => setAdding(false)}
        onUpload={uploadScore}
      />

      <EditPersonalScoreDialog
        score={editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onSave={updateScore}
      />

      <ScoreViewerDialog viewing={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
