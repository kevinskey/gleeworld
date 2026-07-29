import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { useStoreScores } from '@/lib/store/api';

const ASSETS_BUCKET = 'partner-assets';

export default function StorePage() {
  const { data: scores, isLoading } = useStoreScores();
  const thumbUrl = (path: string | null) =>
    path ? supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path).data.publicUrl : null;

  return (
    <DashboardPageShell
      title="Composer Store"
      subtitle="Buy sheet music directly from independent composers and publishers."
      maxWidth="6xl"
    >
      {isLoading && <p className="text-sm text-slate-600">Loading…</p>}
      {scores && scores.length === 0 && (
        <p className="text-sm text-slate-600">No scores in the store yet. Composers publish scores from their portal.</p>
      )}
      {scores && scores.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {scores.map((s) => (
            <Link key={s.id} to={`/store/scores/${s.id}`} className="block">
              <Card className="hover:border-slate-400 transition-colors">
                <CardContent className="p-3">
                  <div className="aspect-[3/4] rounded bg-slate-50 border overflow-hidden mb-3 flex items-center justify-center">
                    {thumbUrl(s.thumbnail_storage_path) ? (
                      <img src={thumbUrl(s.thumbnail_storage_path)!} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-xs text-slate-400">No thumbnail</span>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-xs text-slate-600 truncate">{s.composer ?? '—'} · {s.partner?.display_name ?? 'Composer'}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-semibold text-slate-900">${(s.price_cents / 100).toFixed(2)}</span>
                    {s.voicing && <Badge variant="outline" className="text-xs">{s.voicing}</Badge>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </DashboardPageShell>
  );
}
