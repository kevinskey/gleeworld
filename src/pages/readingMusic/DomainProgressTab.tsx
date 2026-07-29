import { DOMAINS, type DomainId } from '@/lib/readingMusic/domains';
import { useDomainSummary } from '@/lib/readingMusic/api';
import { MasteryRing } from './MasteryRing';

export function DomainProgressTab() {
  const { data, isLoading } = useDomainSummary();

  const rowFor = (id: DomainId) => data?.find((r) => r.domain === id);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Mastery rings track your accuracy in each domain. Rhythm, Dictation, Harmony, and Scales open in later phases.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {DOMAINS.map((d) => {
          const row = rowFor(d.id);
          const percent = row?.accuracy_pct ?? 0;
          const attempts = row?.attempts ?? 0;
          return (
            <div key={d.id} className="rounded-2xl bg-white p-4 shadow-sm text-center">
              <MasteryRing percent={percent} label={`${percent}%`} />
              <p className="text-sm font-medium text-slate-900 mt-2">{d.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {attempts === 0 ? 'No attempts yet' : `${attempts} attempts`}
              </p>
            </div>
          );
        })}
      </div>
      {isLoading && <p className="text-xs text-slate-500">Loading…</p>}
    </div>
  );
}
