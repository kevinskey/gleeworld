import { X, Car, Utensils, Globe, Sparkles, MapPin, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConciergeResult } from '@/lib/assistant/conciergeTypes';

interface Props {
  result: ConciergeResult;
  onClose: () => void;
  className?: string;
}

// Concierge side-panel. Mounted from AssistantSheet next to the chat on
// desktop and stacked above it on phone. Its only external contract is the
// two anchors per result variant — the chat drives everything else.
export function AssistantResultsPanel({ result, onClose, className }: Props) {
  return (
    <div className={cn('flex flex-col h-full bg-card border-l border-border', className)}>
      <header className="flex items-center justify-between px-4 py-2.5 border-b">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {result.kind === 'ride'   && <Car className="w-4 h-4 text-amber-600" />}
          {result.kind === 'food'   && <Utensils className="w-4 h-4 text-sky-600" />}
          {result.kind === 'web'    && <Globe className="w-4 h-4 text-violet-600" />}
          {result.kind === 'places' && <MapPin className="w-4 h-4 text-rose-600" />}
          {result.kind === 'ride'   && 'Ride ready'}
          {result.kind === 'food'   && 'Order ready'}
          {result.kind === 'web'    && 'Search results'}
          {result.kind === 'places' && 'Nearby'}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close results"
          className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {result.kind === 'ride'   && <RideCard result={result} />}
        {result.kind === 'food'   && <FoodCard result={result} />}
        {result.kind === 'web'    && <WebCard result={result} />}
        {result.kind === 'places' && <PlacesCard result={result} />}
      </div>
    </div>
  );
}

function RideCard({ result }: { result: Extract<ConciergeResult, { kind: 'ride' }> }) {
  const uberPrimary = result.preferred !== 'lyft';
  const lyftPrimary = result.preferred === 'lyft';
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Destination</p>
      <p className="text-sm font-medium">{result.resolvedAddress}</p>
      <div className="flex flex-wrap gap-2 pt-2">
        <a
          href={result.uberUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold transition-colors',
            uberPrimary ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'border border-border text-foreground hover:bg-accent',
          )}
        >
          Ride with Uber
        </a>
        <a
          href={result.lyftUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold transition-colors',
            lyftPrimary ? 'bg-pink-500 text-white hover:bg-pink-600'
                        : 'border border-border text-foreground hover:bg-accent',
          )}
        >
          Ride with Lyft
        </a>
      </div>
    </div>
  );
}

function FoodCard({ result }: { result: Extract<ConciergeResult, { kind: 'food' }> }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Searching for</p>
      <p className="text-sm font-medium">{result.query || 'anything'}</p>
      <div className="flex flex-wrap gap-2 pt-2">
        {result.services.map((svc) => (
          <a
            key={svc.name}
            href={svc.deepLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold transition-colors',
              result.preferred && svcMatches(svc.name, result.preferred)
                ? 'bg-sky-500 text-white hover:bg-sky-600'
                : 'border border-border text-foreground hover:bg-accent',
            )}
          >
            {svc.name}
          </a>
        ))}
      </div>
    </div>
  );
}

function svcMatches(name: 'DoorDash' | 'Uber Eats' | 'Grubhub', preferred: string) {
  if (preferred === 'doordash') return name === 'DoorDash';
  if (preferred === 'ubereats') return name === 'Uber Eats';
  if (preferred === 'grubhub')  return name === 'Grubhub';
  return false;
}

function WebCard({ result }: { result: Extract<ConciergeResult, { kind: 'web' }> }) {
  return (
    <div className="space-y-4">
      {result.answer && (
        <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-violet-600">
            <Sparkles className="w-4 h-4" />
            AI answer
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.answer}</p>
        </div>
      )}
      <div className="space-y-3">
        {result.results.length === 0 && (
          <p className="text-sm text-muted-foreground">No results found.</p>
        )}
        {result.results.map((r) => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md border border-border p-3 hover:bg-accent transition-colors"
          >
            <p className="text-sm font-medium">{r.title}</p>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{r.snippet}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

function PlacesCard({ result }: { result: Extract<ConciergeResult, { kind: 'places' }> }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {result.query}
        {result.near ? ` · near ${result.near}` : ''}
      </p>
      {result.places.length === 0 && (
        <p className="text-sm text-muted-foreground">No places found.</p>
      )}
      {result.places.map((p, i) => (
        <div
          key={`${p.name}-${p.address}-${i}`}
          className="rounded-md border border-border p-3 space-y-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{p.address}</p>
            </div>
            {p.isOpen != null && (
              <span
                className={cn(
                  'shrink-0 text-xs px-2 py-0.5 rounded-full font-medium',
                  p.isOpen
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {p.isOpen ? 'Open' : 'Closed'}
              </span>
            )}
          </div>
          {p.rating != null && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{p.rating.toFixed(1)}</span>
              {p.ratingCount ? <span>· {p.ratingCount.toLocaleString()} reviews</span> : null}
            </div>
          )}
          {p.mapsUrl && (
            <a
              href={p.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium border border-border hover:bg-accent transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Open in Maps
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
