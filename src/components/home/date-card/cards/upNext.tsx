// Next scheduled event. Draws on the same feed rows the up-next plate below
// it uses — no extra query.
import { z } from 'zod';
import { CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import type { DateCardModule } from '../types';
import { CardFrame } from './CardFrame';

const schema = z.object({});

export const upNextCard: DateCardModule<typeof schema> = {
  type: 'up_next',
  name: 'Up next',
  description: 'The next event on the calendar.',
  icon: CalendarClock,
  configSchema: schema,
  defaultConfig: {},
  Render: ({ ctx }) => {
    if (!ctx.upNext) {
      return <CardFrame icon={CalendarClock} eyebrow={format(ctx.now, 'EEE · MMM d')} title="Nothing scheduled" />;
    }
    const at = new Date(ctx.upNext.event_at);
    return (
      <CardFrame
        icon={CalendarClock}
        eyebrow={`UP NEXT · ${format(at, 'EEE, MMM d · h:mm a')}`}
        title={ctx.upNext.title}
        subtitle={ctx.upNext.detail || undefined}
      />
    );
  },
};
