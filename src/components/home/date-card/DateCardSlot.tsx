// Resolves the tenant's chosen card and renders it. Any resolution failure —
// unknown type, revoked add-on, malformed config — degrades to the plain card
// rather than leaving an empty slot.
//
// With `canManage`, a dropdown at the end of the eyebrow row (threaded to
// the card frame via DateCardSwitcherContext) switches the card type in place
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
import { DateCardSwitcherContext } from './switcherContext';
import type { DateCardContext } from './types';

interface Props {
  ctx: DateCardContext;
  activeAddons: string[];
  /** Admins only: show the eyebrow-row dropdown that switches the card type. */
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

  // The trigger renders INSIDE the card frames (via DateCardSwitcherContext),
  // some of which are themselves <button>s (liturgical, any CardFrame with
  // onClick) — so it must be a span[role=button], never a nested <button>,
  // and it stops pointerdown/click propagation so opening the menu doesn't
  // also fire the card's own tap action. No preventDefault on pointerdown:
  // Radix's composed open handler bails on defaultPrevented events.
  const switcher = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label="Change date card"
          title="Change date card"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="inline-flex w-5 h-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </span>
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
  );

  return (
    <DateCardSwitcherContext.Provider value={switcher}>
      {card}
    </DateCardSwitcherContext.Provider>
  );
}
