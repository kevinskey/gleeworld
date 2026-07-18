// Date card registry. Adding a card type = one new file in ./cards + one
// entry here. Card modules are registered in Tasks 3-5.
import type { z } from 'zod';
import type { DateCardModule } from './types';
import { plainCard } from './cards/plain';
import { customCard } from './cards/custom';

export const DEFAULT_DATE_CARD_TYPE = 'plain';

export const DATE_CARD_REGISTRY: Record<string, DateCardModule> = {
  [plainCard.type]: plainCard,
  [customCard.type]: customCard,
};

export const DATE_CARD_LIST: DateCardModule[] = Array.from(new Set(Object.values(DATE_CARD_REGISTRY)));

export function getDateCardModule(type: string): DateCardModule | undefined {
  return DATE_CARD_REGISTRY[type];
}

/**
 * Parse stored config, falling back to defaults when it does not match the
 * schema. Keeps an older build from white-screening on config written by a
 * newer one.
 */
export function safeDateCardConfig<S extends z.ZodTypeAny>(
  mod: DateCardModule<S>,
  raw: unknown,
): z.infer<S> {
  const parsed = mod.configSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return mod.configSchema.parse(mod.defaultConfig);
}

export function isDateCardAvailable(mod: DateCardModule, activeAddons: string[]): boolean {
  if (!mod.requiredAddon) return true;
  return activeAddons.includes(mod.requiredAddon);
}
