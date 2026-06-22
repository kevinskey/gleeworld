// Tiny indicator showing whether the device is online and synced. The
// underlying Supabase Realtime channel + auth session both need the
// network up; if it goes away we surface a red dot so the user knows
// new annotations/bookmarks aren't reaching the cloud right now.

import { useEffect, useState } from 'react';
import { Cloud, CloudOff, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncStatusBadgeProps {
  cueRole?: 'leader' | 'follower' | null;
}

export function SyncStatusBadge({ cueRole }: SyncStatusBadgeProps) {
  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const onUp = () => setOnline(true);
    const onDown = () => setOnline(false);
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
    };
  }, []);

  if (cueRole) {
    return (
      <span
        className={cn('inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded',
          cueRole === 'leader' ? 'bg-primary/15 text-primary' : 'bg-amber-100 text-amber-700')}
        title={cueRole === 'leader' ? 'Broadcasting cue' : 'Following cue'}
      >
        <Radio className="w-2.5 h-2.5 animate-pulse" />
      </span>
    );
  }

  return online ? (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] text-green-600/80"
      title="Synced — changes save to the cloud immediately"
    >
      <Cloud className="w-3 h-3" />
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] text-destructive"
      title="Offline — annotations save locally and sync when you reconnect"
    >
      <CloudOff className="w-3 h-3" />
    </span>
  );
}
