// Default card for every tenant: today's date, nothing else. Religiously and
// organizationally neutral — this is what a tenant sees before configuring.
import { z } from 'zod';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import type { DateCardModule } from '../types';
import { CardFrame } from './CardFrame';

const schema = z.object({});

export const plainCard: DateCardModule<typeof schema> = {
  type: 'plain',
  name: 'Date',
  description: "Today's day and date.",
  icon: CalendarDays,
  configSchema: schema,
  defaultConfig: {},
  Render: ({ ctx }) => (
    <CardFrame
      icon={CalendarDays}
      eyebrow={format(ctx.now, 'MMM d, yyyy')}
      title={format(ctx.now, 'EEEE')}
    />
  ),
};
