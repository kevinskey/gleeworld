// Resolves the tenant's chosen card and renders it. Any resolution failure —
// unknown type, revoked add-on, malformed config — degrades to the plain card
// rather than leaving an empty slot.
//
// With `canManage`, a corner dropdown switches the card type in place
// (tenant-wide — the same gw_branding_settings.date_card the Workspace
// Settings panel writes). The stored config is deliberately carried over
// unchanged on a switch: each card safeParses it and falls back to its own
// defaults, so flipping away from Custom and back keeps the custom text.
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronDown, Settings2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDateCardConfig } from '@/hooks/useDateCardConfig';
import {
  DATE_CARD_LIST,
  getDateCardModule,
  isDateCardAvailable,
  safeDateCardConfig,
  DEFAULT_DATE_CARD_TYPE,
} from './registry';
import type { DateCardContext } from './types';

interface Props {
  ctx: DateCardContext;
  activeAddons: string[];
  /** Admins only: show the corner dropdown that switches the card type. */
  canManage?: boolean;
}

export function DateCardSlot({ ctx, activeAddons, canManage = false }: Props) {
  const { setting, save } = useDateCardConfig();
  const navigate = useNavigate();

  const chosen = getDateCardModule(setting.type);
  const mod = chosen && isDateCardAvailable(chosen, activeAddons)
    ? chosen
    : getDateCardModule(DEFAULT_DATE_CARD_TYPE);
  if (!mod) return null;

  const config = mod === chosen
    ? safeDateCardConfig(mod, setting.config)
    : mod.defaultConfig;

  const Render = mod.Render as React.ComponentType<{ config: unknown; ctx: DateCardContext }>;
  const card = <Render config={config} ctx={ctx} />;
  if (!canManage) return card;

  const onPickType = async (type: string) => {
    if (type === setting.type) return;
    try {
      await save({ v: 1, type, config: setting.config });
      toast.success('Date card updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the date card.');
    }
  };

  return (
    <div className="relative">
      {card}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Change date card"
            title="Change date card"
            className="absolute top-2 right-2 w-7 h-7 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuRadioGroup value={setting.type} onValueChange={(v) => void onPickType(v)}>
            {DATE_CARD_LIST.map((m) => {
              const available = isDateCardAvailable(m, activeAddons);
              return (
                <DropdownMenuRadioItem key={m.type} value={m.type} disabled={!available}>
                  <m.icon className="w-4 h-4 mr-2 text-primary shrink-0" />
                  <span className="flex-1 text-sm">{m.name}</span>
                  {!available && (
                    <span className="text-[11px] text-muted-foreground ml-2">Add-on required</span>
                  )}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate('/dashboard/workspace?tab=datecard')}>
            <Settings2 className="w-4 h-4 mr-2 shrink-0" />
            <span className="text-sm">Customize…</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
