// Service selection step of the public booking flow. Pure presentation —
// the page owns the services query (anon-readable gw_services) and passes
// the result down. Tile treatment mirrors the appointment-booking public-site
// block (accent stripe, icon pill) so the booking page feels like a
// continuation of the block the visitor just clicked, not a different app.

import { Clock, MapPin, Music2, Mic2, Piano, Sparkles } from 'lucide-react';
import type { Service } from '@/hooks/useServices';
import { cn } from '@/lib/utils';

const SERVICE_ICONS = [Music2, Mic2, Piano, Sparkles] as const;
const SITE_ACCENT = 'var(--site-accent, hsl(var(--primary)))';

export function BookingServicePicker({ services, selectedId, onSelect }: {
  services: Service[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (services.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No bookable services are available right now. Check back soon.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {services.map((s, i) => {
        const Icon = SERVICE_ICONS[i % SERVICE_ICONS.length];
        const active = s.id === selectedId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={cn(
              'group relative text-left overflow-hidden rounded-2xl border bg-card transition-all',
              active ? 'border-primary shadow-lg' : 'border-border hover:shadow-md hover:-translate-y-0.5',
            )}
          >
            <span
              className="absolute inset-y-0 left-0 w-1 group-hover:w-1.5 transition-[width]"
              style={{ background: SITE_ACCENT }}
              aria-hidden
            />
            <div className="pl-5 pr-4 py-4 flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl inline-flex items-center justify-center shrink-0"
                style={{
                  background: `color-mix(in oklab, ${SITE_ACCENT} 12%, transparent)`,
                  color: SITE_ACCENT,
                }}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">{s.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {s.duration_minutes} min
                  </span>
                  <span>•</span>
                  <span>{s.price_display || 'Free'}</span>
                  {s.location && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {s.location}
                      </span>
                    </>
                  )}
                </div>
                {s.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{s.description}</p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
