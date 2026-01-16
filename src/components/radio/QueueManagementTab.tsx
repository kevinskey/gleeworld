import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Trash2, Music, Clock, AlertCircle, ListX } from 'lucide-react';
import { azuraCastService } from '@/services/azuracast';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { AzuraCastQueueItem } from '@/services/azuracast/types';

interface QueueManagementTabProps {
  canManage: boolean;
}

export const QueueManagementTab: React.FC<QueueManagementTabProps> = ({ canManage }) => {
  const [queue, setQueue] = useState<AzuraCastQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await azuraCastService.getQueue();
      console.log('Queue fetched:', data);
      setQueue(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch queue:', err);
      setError(err instanceof Error ? err.message : 'Failed to load queue');
      setQueue([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleRemoveItem = async (item: AzuraCastQueueItem) => {
    if (!canManage) {
      toast({ title: 'Permission Denied', description: 'Admin/Exec permissions required.', variant: 'destructive' });
      return;
    }

    setRemovingIds(prev => new Set(prev).add(item.id));
    try {
      await azuraCastService.removeFromQueue(item.id);
      toast({ title: 'Removed', description: `"${item.song?.title || 'Track'}" removed from queue.` });
      fetchQueue();
    } catch (err) {
      console.error('Failed to remove queue item:', err);
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to remove item.', variant: 'destructive' });
    } finally {
      setRemovingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleClearQueue = async () => {
    if (!canManage) {
      toast({ title: 'Permission Denied', description: 'Admin/Exec permissions required.', variant: 'destructive' });
      return;
    }

    if (!confirm('Clear all items from the queue? This cannot be undone.')) return;

    setIsClearing(true);
    try {
      await azuraCastService.clearQueue();
      toast({ title: 'Queue Cleared', description: 'All items have been removed from the queue.' });
      fetchQueue();
    } catch (err) {
      console.error('Failed to clear queue:', err);
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to clear queue.', variant: 'destructive' });
    } finally {
      setIsClearing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp) return '—';
    return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
        <AlertCircle className="h-5 w-5" />
        <p className="text-xs text-center">{error}</p>
        <Button size="sm" variant="outline" onClick={fetchQueue} className="h-7 text-xs">
          <RefreshCw className="h-3 w-3 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{queue.length} item{queue.length !== 1 ? 's' : ''} in queue</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchQueue} disabled={isLoading} className="h-7 text-xs">
            <RefreshCw className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")} />
            Refresh
          </Button>
          {canManage && queue.length > 0 && (
            <Button size="sm" variant="destructive" onClick={handleClearQueue} disabled={isClearing} className="h-7 text-xs">
              <ListX className="h-3 w-3 mr-1" />
              {isClearing ? 'Clearing...' : 'Clear All'}
            </Button>
          )}
        </div>
      </div>

      {/* Queue List */}
      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
          <Music className="h-6 w-6 mb-2 opacity-50" />
          <p className="text-xs">Queue is empty</p>
        </div>
      ) : (
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-2">
            {queue.map((item, index) => (
              <div
                key={item.id || index}
                className={cn(
                  "flex items-center justify-between p-2 rounded border bg-card",
                  item.is_request && "border-primary/40 bg-primary/5"
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Album Art */}
                  {item.song?.art ? (
                    <img
                      src={item.song.art}
                      alt=""
                      className="w-8 h-8 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <Music className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}

                  {/* Track Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{item.song?.title || 'Unknown Track'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {item.song?.artist || 'Unknown Artist'}
                      {item.playlist && <span className="ml-1 opacity-70">• {item.playlist}</span>}
                    </p>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {item.is_request && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1">Request</Badge>
                    )}
                    <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDuration(item.duration || 0)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 ml-2 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveItem(item)}
                    disabled={removingIds.has(item.id)}
                  >
                    {removingIds.has(item.id) ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Info */}
      {!canManage && queue.length > 0 && (
        <p className="text-[10px] text-muted-foreground text-center">
          Admin or Exec Board permissions required to modify the queue.
        </p>
      )}
    </div>
  );
};
