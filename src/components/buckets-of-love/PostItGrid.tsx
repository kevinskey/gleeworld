import React, { useEffect, useMemo, useState } from 'react';
import { useBucketsOfLove } from '@/hooks/useBucketsOfLove';
import SendBucketOfLove from '@/components/buckets-of-love/SendBucketOfLove';
import { Heart, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}> = ({ message, sender, isPlaceholder }) => {
  const content = (
    <div
      className={cn(
        'relative aspect-square rounded-md shadow-sm transition-all',
        'bg-secondary text-foreground/90 border border-border',
        'hover:shadow-md hover:scale-[1.02]',
        isPlaceholder && 'border-dashed bg-secondary/40'
      )}
    >
      {/* tape strip */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-3 w-10 rounded-sm bg-primary/50 shadow" />

      <div className="p-2 h-full flex flex-col">
        {isPlaceholder ? (
          <div className="flex-1 grid place-content-center text-center text-sm text-muted-foreground">
            <div className="flex flex-col items-center gap-1">
              <Plus className="h-5 w-5 text-primary" />
              <span>Add</span>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm leading-snug line-clamp-6">
              {message}
            </p>
            <div className="mt-auto pt-2 text-[10px] text-muted-foreground flex items-center gap-1">
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
            {content}
          </button>
        }
      />
    );
  }

  return content;
};

export const PostItGrid: React.FC = () => {
  const { buckets, loading } = useBucketsOfLove();
  const slots = useGridSlots();

  const items = useMemo(() => {
    const visible = buckets.slice(0, slots);
    const placeholders = Math.max(0, slots - visible.length);
    return { visible, placeholders };
  }, [buckets, slots]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Sticky notes view — tap a blank to add</p>
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
        'grid gap-3',
        'grid-cols-2',
        'md:grid-cols-4',
        'lg:grid-cols-6',
        'xl:grid-cols-8'
      )}>
        {loading ? (
          Array.from({ length: slots }).map((_, i) => (
            <div key={`skeleton-${i}`} className="aspect-square rounded-md bg-muted animate-pulse" />
          ))
        ) : (
          <>
            {items.visible.map((b) => (
              <NoteCard key={b.id} message={b.message} sender={b.is_anonymous ? 'Anonymous' : b.sender_name || null} />
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
