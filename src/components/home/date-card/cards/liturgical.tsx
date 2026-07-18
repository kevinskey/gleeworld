// Liturgical day, gated on the Liturgy Planner add-on. Wraps the existing
// LiturgicalDayCard so the fetch + readings sheet stay in one place.
import { z } from 'zod';
import { Church } from 'lucide-react';
import { LiturgicalDayCard } from '@/components/liturgy/LiturgicalDayCard';
import type { DateCardModule } from '../types';

const schema = z.object({});

export const liturgicalCard: DateCardModule<typeof schema> = {
  type: 'liturgical',
  name: 'Liturgical day',
  description: "Today's liturgical title. Tap for the readings.",
  icon: Church,
  requiredAddon: 'liturgy_planner',
  configSchema: schema,
  defaultConfig: {},
  Render: () => <LiturgicalDayCard />,
};
