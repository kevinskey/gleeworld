// Resolves the tenant's chosen card and renders it. Any resolution failure —
// unknown type, revoked add-on, malformed config — degrades to the plain card
// rather than leaving an empty slot.
import { useDateCardConfig } from '@/hooks/useDateCardConfig';
import { getDateCardModule, isDateCardAvailable, safeDateCardConfig, DEFAULT_DATE_CARD_TYPE } from './registry';
import type { DateCardContext } from './types';

interface Props {
  ctx: DateCardContext;
  activeAddons: string[];
}

export function DateCardSlot({ ctx, activeAddons }: Props) {
  const { setting } = useDateCardConfig();

  const chosen = getDateCardModule(setting.type);
  const mod = chosen && isDateCardAvailable(chosen, activeAddons)
    ? chosen
    : getDateCardModule(DEFAULT_DATE_CARD_TYPE);
  if (!mod) return null;

  const config = mod === chosen
    ? safeDateCardConfig(mod, setting.config)
    : mod.defaultConfig;

  const Render = mod.Render as React.ComponentType<{ config: unknown; ctx: DateCardContext }>;
  return <Render config={config} ctx={ctx} />;
}
