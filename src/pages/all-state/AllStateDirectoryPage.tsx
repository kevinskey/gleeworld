// Public directory of All-State programs by state.
//
// Deliberately shows all 51 jurisdictions from day one, with the ones lacking
// data marked "Coming soon" rather than hidden. A Georgia director landing
// here should immediately see that Georgia is live; a Texas director should
// see that Texas is known-but-not-yet-covered rather than concluding the
// feature does not exist.

import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { MapPin } from 'lucide-react';
import { useAllStateStates } from '@/features/all-state/useAllState';
import type { AllStateState } from '@/features/all-state/types';

const REGION_ORDER = ['South', 'Northeast', 'Midwest', 'West'] as const;

export default function AllStateDirectoryPage() {
  const { data: states, isLoading, error, refetch } = useAllStateStates();

  const byRegion = useMemo(() => {
    const groups = new Map<string, AllStateState[]>();
    for (const s of states ?? []) {
      const key = s.region ?? 'Other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    return groups;
  }, [states]);

  const liveCount = (states ?? []).filter((s) => s.active).length;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">All-State</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Audition requirements, deadlines, repertoire, and fees for state
          All-State programs — sourced from each state association&rsquo;s own
          published materials, with the date we last checked.
        </p>
        {!isLoading && (
          <p className="mt-3 text-sm text-muted-foreground">
            {liveCount > 0
              ? `${liveCount} state${liveCount === 1 ? '' : 's'} covered so far.`
              : 'No states are populated yet.'}
          </p>
        )}
      </header>

      {error && (
        <ErrorState
          title="Couldn't load states"
          message={error instanceof Error ? error.message : 'Unknown error'}
          onRetry={() => refetch()}
        />
      )}

      {isLoading && (
        <div className="space-y-6">
          {[0, 1].map((i) => (
            <div key={i}>
              <Skeleton className="mb-3 h-5 w-24" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, j) => (
                  <Skeleton key={j} className="h-16 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-8">
          {[...REGION_ORDER, ...[...byRegion.keys()].filter((r) => !REGION_ORDER.includes(r as never))]
            .filter((region) => byRegion.has(region))
            .map((region) => (
              <section key={region}>
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  {region}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {byRegion.get(region)!.map((s) =>
                    s.active ? (
                      <Link key={s.id} to={`/all-state/${s.slug}`} className="group">
                        <Card className="h-full transition-colors group-hover:border-primary/50">
                          <CardContent className="flex h-full flex-col justify-between p-4">
                            <span className="font-medium">{s.name}</span>
                            <Badge variant="outline" className="mt-2 w-fit border-emerald-200 bg-emerald-50 font-normal text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                              Available
                            </Badge>
                          </CardContent>
                        </Card>
                      </Link>
                    ) : (
                      <Card key={s.id} className="h-full opacity-60">
                        <CardContent className="flex h-full flex-col justify-between p-4">
                          <span className="font-medium">{s.name}</span>
                          <span className="mt-2 text-xs text-muted-foreground">Coming soon</span>
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>
              </section>
            ))}
        </div>
      )}

      <footer className="mt-12 flex items-start gap-2 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          GleeWorld is not affiliated with any state music education
          association. Always confirm requirements and deadlines against your
          state association&rsquo;s official materials — every fact here links
          to its source.
        </p>
      </footer>
    </div>
  );
}
