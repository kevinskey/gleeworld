// Contract for the dashboard date card. Mirrors the landing-page BlockModule
// (src/components/public-site/types.ts) so a new card type is one file plus
// one registry entry. Keep configSchema shapes FLAT — AutoForm renders flat
// Zod objects automatically; nested shapes need a bespoke EditorForm.
import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { z } from 'zod';

/** Minimal shape a card needs from a schedule feed row. */
export interface ScheduleItem {
  id: string;
  title: string;
  detail: string | null;
  event_at: string;
}

/** Everything a card may draw on, assembled once by HouseHome. */
export interface DateCardContext {
  now: Date;
  firstName: string;
  ensembleName: string;
  upNext: ScheduleItem | null;
  todayRows: ScheduleItem[];
}

export interface DateCardRenderProps<C> {
  config: C;
  ctx: DateCardContext;
}

export interface DateCardModule<S extends z.ZodTypeAny = z.ZodTypeAny> {
  /** Stable key persisted in gw_branding_settings.date_card.type. Never rename. */
  type: string;
  name: string;
  description: string;
  icon: LucideIcon;
  /** gw_billing_modules.id that must be active for this card to be selectable. */
  requiredAddon?: string;
  configSchema: S;
  defaultConfig: z.infer<S>;
  Render: ComponentType<DateCardRenderProps<z.infer<S>>>;
}

/** Persisted envelope. Versioned so a future shape change can migrate. */
export interface DateCardSetting {
  v: 1;
  type: string;
  config: Record<string, unknown>;
}
