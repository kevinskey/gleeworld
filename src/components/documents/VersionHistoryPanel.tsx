// Version history for one document: snapshots newest first, restore or
// delete. Restoring replaces the document body only — sources, footnotes and
// paper_meta are edited through their own panels, and silently reverting
// someone's bibliography along with their prose would be a nasty surprise.
import { useCallback, useEffect, useState } from 'react';
import { History, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  listVersions, getVersion, deleteVersion, describeVersion, type DocVersionListItem,
} from '@/lib/documents/versionsApi';

interface VersionHistoryPanelProps {
  docId: string;
  /** Bumped when a new snapshot is taken, so the list refetches. */
  refreshToken: number;
  /** Hands the restored body back to the page, which writes it to the editor. */
  onRestore: (content: unknown) => void;
}

export function VersionHistoryPanel({ docId, refreshToken, onRestore }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<DocVersionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setVersions(await listVersions(docId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load version history.');
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => { void load(); }, [load, refreshToken]);

  const restore = useCallback(async (id: string) => {
    setBusyId(id);
    try {
      const version = await getVersion(id);
      onRestore(version.content);
      toast.success('Restored. The previous text is still in history if you want it back.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not restore that version.');
    } finally {
      setBusyId(null);
    }
  }, [onRestore]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="px-1 py-8 text-center text-sm text-muted-foreground">
        <History className="mx-auto mb-2 h-5 w-5 opacity-50" />
        No snapshots yet. One is taken automatically as you work, or use
        “Save version” to name one now.
      </div>
    );
  }

  return (
    <div className="space-y-2 py-1">
      {versions.map((version) => (
        <div key={version.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{describeVersion(version)}</p>
            <p className="text-[11px] text-muted-foreground">
              {new Date(version.created_at).toLocaleString()} · {version.word_count} words
            </p>
          </div>
          <Button
            size="sm" variant="outline" className="h-7 shrink-0 text-xs"
            disabled={busyId === version.id}
            onClick={() => restore(version.id)}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restore
          </Button>
          <Button
            size="sm" variant="ghost" className="h-7 w-7 shrink-0 p-0 text-destructive"
            title="Delete snapshot"
            disabled={busyId === version.id}
            onClick={async () => {
              setBusyId(version.id);
              try {
                await deleteVersion(version.id);
                await load();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Could not delete that snapshot.');
              } finally {
                setBusyId(null);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
