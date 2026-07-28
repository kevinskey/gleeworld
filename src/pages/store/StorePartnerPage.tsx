import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { useStorePartner, useStoreScores } from '@/lib/store/api';

const ASSETS_BUCKET = 'partner-assets';

export default function StorePartnerPage() {
  const { id } = useParams<{ id: string }>();
  const { data: partner } = useStorePartner(id);
  const { data: scores } = useStoreScores({ partnerId: id });

  const logo = partner?.logo_storage_path
    ? supabase.storage.from(ASSETS_BUCKET).getPublicUrl(partner.logo_storage_path).data.publicUrl
    : null;

  return (
    <DashboardPageShell title={partner?.display_name ?? 'Composer'}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm flex items-start gap-4">
          {logo ? (
            <img src={logo} alt="" className="w-20 h-20 rounded border object-cover" />
          ) : (
            <div className="w-20 h-20 rounded border bg-muted" />
          )}
          <div className="min-w-0">
            <p className="text-lg font-semibold">{partner?.display_name ?? '—'}</p>
            {partner?.bio && <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{partner.bio}</p>}
            {partner?.website_url && (
              <a href={partner.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
                {partner.website_url}
              </a>
            )}
          </div>
        </div>

        <p className="text-xs uppercase tracking-widest text-slate-500">Scores</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(scores ?? []).map((s) => (
            <Link key={s.id} to={`/store/scores/${s.id}`}>
              <Card className="hover:border-slate-400">
                <CardContent className="p-3">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-xs text-slate-600 truncate">{s.voicing ?? '—'}</p>
                  <p className="text-sm font-semibold mt-1">${(s.price_cents / 100).toFixed(2)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
          {scores && scores.length === 0 && (
            <p className="text-sm text-slate-600 col-span-full">No published scores yet.</p>
          )}
        </div>
      </div>
    </DashboardPageShell>
  );
}
