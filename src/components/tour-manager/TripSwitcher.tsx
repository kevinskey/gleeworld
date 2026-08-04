// TripSwitcher — picks the active trip for the whole of Travel Manager.
//
// Lives beside the page title so the answer to "which trip am I editing?" is
// always on screen. Every section reads the same selection via useActiveTrip,
// which is the point: they used to each resolve the trip independently and
// could disagree once more than one existed.

import { Check, ChevronsUpDown, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useActiveTrip } from './ActiveTripContext';
import { CreateTripDialog } from './CreateTripDialog';

const dateRange = (start: string | null, end: string | null) => {
  if (!start) return null;
  const fmt = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return end && end !== start ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
};

export function TripSwitcher() {
  const { trips, trip, tripId, setTripId, isLoading } = useActiveTrip();

  // Nothing to switch between yet — offer the one action that helps.
  if (!isLoading && trips.length === 0) {
    return <CreateTripDialog />;
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 max-w-[16rem]">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {isLoading ? 'Loading trips…' : trip?.name ?? 'Select a trip'}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Trips</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {trips.map(t => (
            <DropdownMenuItem
              key={t.id}
              onSelect={() => setTripId(t.id)}
              className="gap-2 items-start"
            >
              <Check className={cn('h-4 w-4 mt-0.5 shrink-0', t.id === tripId ? 'opacity-100' : 'opacity-0')} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{t.name}</span>
                {dateRange(t.start_date, t.end_date) && (
                  <span className="block text-xs text-muted-foreground">
                    {dateRange(t.start_date, t.end_date)}
                  </span>
                )}
              </span>
              {t.status && t.status !== 'planning' && (
                <Badge variant="secondary" className="text-[10px] shrink-0 capitalize">{t.status}</Badge>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateTripDialog />
    </div>
  );
}
