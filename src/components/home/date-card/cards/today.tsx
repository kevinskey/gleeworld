// Today at a glance: the date plus how much is on the schedule.
import { z } from 'zod';
import { Sun } from 'lucide-react';
import { format } from 'date-fns';
import type { DateCardModule } from '../types';
import { CardFrame } from './CardFrame';

const schema = z.object({});

export const todayCard: DateCardModule<typeof schema> = {
  type: 'today',
  name: 'Today at a glance',
  description: "Today's date and what is on the schedule.",
  icon: Sun,
  configSchema: schema,
  defaultConfig: {},
  Render: ({ ctx }) => {
    const n = ctx.todayRows.length;
    const summary = n === 0 ? 'Clear day' : `${n} event${n === 1 ? '' : 's'} today`;
    const first = ctx.todayRows[0];
    return (
      <CardFrame
        icon={Sun}
        eyebrow={format(ctx.now, 'EEEE · MMM d')}
        title={summary}
        subtitle={first ? `First: ${first.title} at ${format(new Date(first.event_at), 'h:mm a')}` : undefined}
      />
    );
  },
};
