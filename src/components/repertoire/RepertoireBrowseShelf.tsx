import type { RepertoireItem } from '@/lib/repertoire/api';
import { RepertoireResultCard } from './RepertoireResultCard';

interface Props {
  title: string;
  items: RepertoireItem[];
  loading?: boolean;
  onAddToMyMusic?: (item: RepertoireItem) => void;
  onAddToTenant?: (item: RepertoireItem) => void;
}

export function RepertoireBrowseShelf({ title, items, loading, onAddToMyMusic, onAddToTenant }: Props) {
  if (!loading && items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((it) => (
            <RepertoireResultCard
              key={it.id}
              item={it}
              onAddToMyMusic={onAddToMyMusic}
              onAddToTenant={onAddToTenant}
            />
          ))}
        </div>
      )}
    </section>
  );
}
