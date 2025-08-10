import React, { useEffect, useMemo, useState } from 'react';
import { useBucketsOfLove } from '@/hooks/useBucketsOfLove';
import SendBucketOfLove from '@/components/buckets-of-love/SendBucketOfLove';
import { Heart, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Responsive slots by breakpoint: sm=12, md=16, lg=24, xl+=32
const useGridSlots = () => {
  const [slots, setSlots] = useState(12);

  useEffect(() => {
    const mqMd = window.matchMedia('(min-width: 768px)');
    const mqLg = window.matchMedia('(min-width: 1024px)');
    const mqXl = window.matchMedia('(min-width: 1280px)');

    const compute = () => {
      if (mqXl.matches) return 32;
      if (mqLg.matches) return 24;
      if (mqMd.matches) return 16;
      return 12;
    };

    const update = () => setSlots(compute());

    update();
    mqMd.addEventListener('change', update);
    mqLg.addEventListener('change', update);
    mqXl.addEventListener('change', update);
    return () => {
      mqMd.removeEventListener('change', update);
      mqLg.removeEventListener('change', update);
      mqXl.removeEventListener('change', update);
    };
  }, []);

  return slots;
};

const NoteCard: React.FC<{
  message?: string;
  sender?: string | null;
  isPlaceholder?: boolean;
  isOwner?: boolean;
  onDelete?: () => void;
}> = ({ message, sender, isPlaceholder, isOwner, onDelete }) => {
  const card = (
    <div
      className={cn(
        'relative aspect-square rounded-md shadow-sm transition-all',
        'bg-secondary text-foreground/90 border border-border',
        'hover:shadow-md hover:scale-[1.01]',
        isPlaceholder && 'border-dashed bg-secondary/40'
      )}
      title={isOwner && !isPlaceholder ? 'Tap to delete your note' : undefined}
    >
      {/* tape strip */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2.5 w-8 rounded-sm bg-primary/50 shadow" />

      <div className="p-1.5 h-full flex flex-col">
        {isPlaceholder ? (
          <div className="flex-1 grid place-content-center text-center text-xs text-muted-foreground">
            <div className="flex flex-col items-center gap-1">
              <Plus className="h-4 w-4 text-primary" />
              <span>Add</span>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs leading-snug line-clamp-5">
              {message}
            </p>
            <div className="mt-auto pt-2 text-[9px] text-muted-foreground flex items-center gap-1">
              <Heart className="h-3 w-3 text-primary" />
              <span>{sender || 'Anonymous'}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (isPlaceholder) {
    return (
      <SendBucketOfLove
        trigger={
          <button type="button" aria-label="Add bucket of love" className="w-full">
            {card}
          </button>
        }
      />
    );
  }

  if (isOwner && onDelete) {
    return (
      <button type="button" onClick={onDelete} className="w-full" aria-label="Delete your note">
        {card}
      </button>
    );
  }

  return card;
};

export const PostItGrid: React.FC = () => {
  const { buckets, loading, deleteBucket } = useBucketsOfLove();
  const { user } = useAuth();
  const slots = useGridSlots();

  const items = useMemo(() => {
    const visible = buckets.slice(0, slots);
    const placeholders = Math.max(0, slots - visible.length);
    return { visible, placeholders };
  }, [buckets, slots]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Tap a blank to add — tap yours to delete it.</p>
        {/* Fallback add button when grid is full */}
        {items.placeholders === 0 && (
          <SendBucketOfLove
            trigger={
              <button className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                <Plus className="h-4 w-4" /> Add Bucket
              </button>
            }
          />
        )}
      </div>

      <div className={cn(
        'grid gap-4 md:gap-5',
        'grid-cols-2',
        'md:grid-cols-4',
        'lg:grid-cols-6',
        'xl:grid-cols-8'
      )} aria-label="Buckets of love post-it grid">
        {loading ? (
          Array.from({ length: slots }).map((_, i) => (
            <div key={`skeleton-${i}`} className="aspect-square rounded-md bg-muted animate-pulse" />
          ))
        ) : (
          <>
            {items.visible.map((b) => (
              <NoteCard
                key={b.id}
                message={b.message}
                sender={b.is_anonymous ? 'Anonymous' : b.sender_name || null}
                isOwner={b.user_id === user?.id}
                onDelete={async () => {
                  const ok = window.confirm('Delete this note?');
                  if (!ok) return;
                  const res = await deleteBucket(b.id);
                  if (res.success) {
                    toast({ title: 'Deleted', description: 'Your bucket of love was removed.' });
                  } else {
                    toast({ title: 'Error', description: res.error || 'Could not delete note.' });
                  }
                }}
              />
            ))}
            {Array.from({ length: items.placeholders }).map((_, i) => (
              <NoteCard key={`placeholder-${i}`} isPlaceholder />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default PostItGrid;
