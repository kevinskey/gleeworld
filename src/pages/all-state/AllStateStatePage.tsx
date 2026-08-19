// Public per-state All-State page. /all-state/georgia
//
// The product test for this page: a director opens it and can answer "what do
// I need to know about All-State today?" without leaving. So it leads with
// what's DUE, not with a description of the program.
//
// Every externally-sourced fact renders a SourceBadge. That is the whole
// credibility model — if we can't say where a date came from and when we last
// checked it, a director is right not to trust us over the handbook.

import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import {
  CalendarClock, FileText, DollarSign, ListChecks, Music2, Users2,
  ExternalLink, ArrowLeft, Info,
} from 'lucide-react';
import { SourceBadge } from '@/features/all-state/SourceBadge';
import { useStatePrograms, useProgramDetail } from '@/features/all-state/useAllState';
import { formatMoney, formatDateRange } from '@/features/all-state/types';

export default function AllStateStatePage() {
  const { stateSlug } = useParams<{ stateSlug: string }>();
  const { data, isLoading, error, refetch } = useStatePrograms(stateSlug);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const programs = data?.programs ?? [];
  const activeProgramId = selectedId ?? programs[0]?.id;
  const { data: detail, isLoading: detailLoading } = useProgramDetail(activeProgramId);

  // Deadlines that haven't passed, soonest first — the answer to "what's next".
  const upcoming = useMemo(() => {
    const now = Date.now();
    return (detail?.dates ?? [])
      .filter((d) => d.start_at && new Date(d.start_at).getTime() >= now)
      .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime());
  }, [detail]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-3 h-5 w-96" />
        <div className="mt-8 space-y-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <ErrorState
          title="Couldn't load this state"
          message={error instanceof Error ? error.message : 'Unknown error'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!data?.state) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <EmptyState
          icon={<Info className="h-8 w-8" />}
          title="State not found"
          description="We don't have a page for that state yet."
          actionLabel="Back to all states"
          onAction={() => { window.location.href = '/all-state'; }}
        />
      </div>
    );
  }

  const state = data.state;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link
        to="/all-state"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> All states
      </Link>

      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{state.name} All-State</h1>
        {detail?.organization && (
          <p className="mt-2 text-muted-foreground">
            Administered by{' '}
            {detail.organization.website_url ? (
              <a
                href={detail.organization.website_url}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
              >
                {detail.organization.name}
                {detail.organization.acronym ? ` (${detail.organization.acronym})` : ''}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ) : (
              <>{detail.organization.name}</>
            )}
          </p>
        )}
      </header>

      {programs.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<CalendarClock className="h-8 w-8" />}
            title="Nothing published yet"
            description={`We haven't finished verifying ${state.name}'s All-State information. Rather than show you something we can't source, we're showing you nothing.`}
          />
        </div>
      ) : (
        <>
          {programs.length > 1 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {programs.map((p) => (
                <Button
                  key={p.id}
                  size="sm"
                  variant={p.id === activeProgramId ? 'default' : 'outline'}
                  onClick={() => setSelectedId(p.id)}
                >
                  {p.name}
                  <span className="ml-1.5 text-xs opacity-70">{p.season}</span>
                </Button>
              ))}
            </div>
          )}

          {detailLoading && (
            <div className="mt-8 space-y-4">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          )}

          {detail && (
            <div className="mt-8 space-y-6">
              {/* What's next — the reason a director opens this page. */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarClock className="h-4 w-4" aria-hidden /> What&rsquo;s next
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcoming.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No upcoming dates published for {detail.program.season}.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {upcoming.map((d) => (
                        <li key={d.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                          <div className="min-w-0">
                            <p className="font-medium">{d.title}</p>
                            {d.description && (
                              <p className="text-sm text-muted-foreground">{d.description}</p>
                            )}
                            <SourceBadge
                              className="mt-1"
                              confidence={d.confidence}
                              sourceUrl={d.source_url}
                              retrievedAt={d.retrieved_at}
                            />
                          </div>
                          <time className="shrink-0 text-sm tabular-nums text-muted-foreground">
                            {formatDateRange(d.start_at, d.end_at, d.timezone, d.all_day)}
                          </time>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {detail.requirements.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ListChecks className="h-4 w-4" aria-hidden /> Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="divide-y">
                      {detail.requirements.map((r) => (
                        <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex items-baseline gap-2">
                            <Badge variant="secondary" className="font-normal capitalize">
                              {r.category.replace(/_/g, ' ')}
                            </Badge>
                            <p className="font-medium">{r.title}</p>
                          </div>
                          {r.description && (
                            <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                          )}
                          <SourceBadge
                            className="mt-1"
                            confidence={r.confidence}
                            sourceUrl={r.source_url}
                            retrievedAt={r.retrieved_at}
                          />
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {detail.fees.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <DollarSign className="h-4 w-4" aria-hidden /> Fees
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="divide-y">
                      {detail.fees.map((f) => (
                        <li key={f.id} className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0">
                          <div>
                            <p className="font-medium capitalize">{f.fee_type.replace(/_/g, ' ')}</p>
                            {f.description && (
                              <p className="text-sm text-muted-foreground">{f.description}</p>
                            )}
                            {/* Never imply a checkout GleeWorld doesn't own. */}
                            {f.payable_to === 'state_association' && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Paid to the state association, not through GleeWorld.
                              </p>
                            )}
                            <SourceBadge
                              className="mt-1"
                              confidence={f.confidence}
                              sourceUrl={f.source_url}
                              retrievedAt={f.retrieved_at}
                            />
                          </div>
                          <span className="shrink-0 tabular-nums font-medium">
                            {formatMoney(f.amount_cents, f.currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {detail.voiceParts.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users2 className="h-4 w-4" aria-hidden /> Voice parts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {detail.voiceParts.map((v) => (
                      <Badge key={v.id} variant="outline" className="font-normal">
                        <span className="font-medium">{v.code}</span>
                        <span className="ml-1.5 text-muted-foreground">{v.label}</span>
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              )}

              {detail.repertoire.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Music2 className="h-4 w-4" aria-hidden /> Repertoire
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Bibliographic metadata only — never scores or excerpts. */}
                    <div className="overflow-x-auto">
                      <ul className="min-w-[28rem] divide-y">
                        {detail.repertoire.map((r) => (
                          <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                            <p className="font-medium">{r.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {[r.composer, r.arranger && `arr. ${r.arranger}`, r.voicing, r.publisher, r.catalog_number]
                                .filter(Boolean).join(' · ')}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}

              {detail.documents.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" aria-hidden /> Official documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {detail.documents.map((d) => (
                        <li key={d.id}>
                          <a
                            href={d.url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 underline underline-offset-2 hover:text-foreground"
                          >
                            {d.title} <ExternalLink className="h-3 w-3" aria-hidden />
                          </a>
                          {d.retrieved_at && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              Checked {new Date(d.retrieved_at).toLocaleDateString()}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      <footer className="mt-12 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        GleeWorld is not affiliated with {detail?.organization?.name ?? 'the state association'}.
        Always confirm against the official materials linked above before acting on a deadline.
      </footer>
    </div>
  );
}
