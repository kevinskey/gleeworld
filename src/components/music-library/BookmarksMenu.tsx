import { useState } from 'react';
import { Bookmark, BookmarkPlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSheetMusicBookmarks } from '@/hooks/useSheetMusicBookmarks';
import { toast } from 'sonner';

interface BookmarksMenuProps {
  sheetMusicId: string;
  currentPage: number;
  onJumpToPage: (page: number) => void;
}

// "Letter B", "Coda", "Sopranos enter" — forScore-style page bookmarks
// inside the open score. Per-user; persists via gw_sheet_music_bookmarks.
export function BookmarksMenu({ sheetMusicId, currentPage, onJumpToPage }: BookmarksMenuProps) {
  const { bookmarks, addBookmark, deleteBookmark } = useSheetMusicBookmarks(sheetMusicId);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');

  const handleAdd = async () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    try {
      await addBookmark.mutateAsync({ page_number: currentPage, label: trimmed });
      setLabel('');
      toast.success(`Bookmarked p.${currentPage}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to add bookmark');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Bookmarks"
          title="Bookmarks"
          className="h-8 w-8 p-0 touch-manipulation rounded-full"
        >
          <Bookmark className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="space-y-3">
          <div className="text-sm font-medium">Bookmarks</div>

          <div className="flex gap-2">
            <Input
              autoFocus
              placeholder={`Bookmark p.${currentPage} as…`}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              className="h-8 text-sm"
            />
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!label.trim() || addBookmark.isPending}
              className="h-8 px-2"
              aria-label="Add bookmark"
              title="Add bookmark"
            >
              <BookmarkPlus className="h-4 w-4" />
            </Button>
          </div>

          {bookmarks.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No bookmarks yet. Add one for the current page above.
            </p>
          ) : (
            <ul className="space-y-1 max-h-72 overflow-y-auto">
              {bookmarks.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center gap-2 group rounded hover:bg-accent/40 px-2 py-1"
                >
                  <button
                    type="button"
                    onClick={() => { onJumpToPage(b.page_number); setOpen(false); }}
                    className="flex-1 text-left flex items-center gap-2 min-w-0"
                  >
                    <span className="text-xs text-muted-foreground tabular-nums w-8">
                      p.{b.page_number}
                    </span>
                    <span className="text-sm truncate">{b.label}</span>
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteBookmark.mutate(b.id)}
                    aria-label={`Delete bookmark ${b.label}`}
                    title="Delete"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
