// Small inline badge for a score's rights status. Mounts on score cards
// in the Music Library + the Viewer + the Librarian list so a librarian
// or instructor can see at a glance which works are public-domain,
// which are licensed (and within / over seat limit), and which are
// "all rights reserved" (private use only — should not be in the
// shared library).
//
// Tooltips paraphrase the relevant rule from the Copyright & Content
// Policy so the policy lives where the decisions get made, not buried
// in a separate page.

import { ShieldCheck, ShieldAlert, Lock, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RightsStatus = 'public_domain' | 'licensed' | 'all_rights_reserved' | 'unknown';

interface RightsBadgeProps {
  status: RightsStatus | null | undefined;
  /** Optional license warning from gw_sheet_music_rights_status_v
   *  ('over_seat_limit' | 'expired' | null). */
  warning?: 'over_seat_limit' | 'expired' | null;
  /** Optional seat count to display next to the licensed badge. */
  seatCount?: number | null;
  /** Compact = icon + short label only; otherwise label + short hint. */
  compact?: boolean;
  className?: string;
}

const CONFIG: Record<RightsStatus, {
  Icon: typeof ShieldCheck;
  label: string;
  shortLabel: string;
  tone: string;
  tooltip: string;
}> = {
  public_domain: {
    Icon: ShieldCheck,
    label: 'Public Domain',
    shortLabel: 'PD',
    tone: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    tooltip: 'Public domain — distribute freely to your tenant, no seat-count limit applies. (Modern editions of public-domain works may still be copyrighted; verify the edition.)',
  },
  licensed: {
    Icon: ShieldCheck,
    label: 'Licensed',
    shortLabel: 'Lic',
    tone: 'bg-sky-50 text-sky-800 border-sky-200',
    tooltip: 'Licensed — distribute only within the seat count your license covers. Active member count = one seat per copy.',
  },
  all_rights_reserved: {
    Icon: Lock,
    label: 'All Rights Reserved',
    shortLabel: 'ARR',
    tone: 'bg-rose-50 text-rose-800 border-rose-200',
    tooltip: 'All rights reserved — private use only. Do not share with members, do not move to the shared library, do not distribute via fan or graduate pages.',
  },
  unknown: {
    Icon: HelpCircle,
    label: 'Rights: not tagged',
    shortLabel: 'Tag',
    tone: 'bg-amber-50 text-amber-800 border-amber-200',
    tooltip: 'This work has no rights category yet. Open the edit panel and tag it as Public Domain, Licensed, or All Rights Reserved.',
  },
};

const WARNING_CONFIG: Record<NonNullable<RightsBadgeProps['warning']>, { Icon: typeof ShieldAlert; tone: string; tooltip: string }> = {
  over_seat_limit: {
    Icon: ShieldAlert,
    tone: 'bg-rose-100 text-rose-900 border-rose-300',
    tooltip: 'Active member count exceeds this work\'s licensed seat count. Reduce roster access or purchase additional copies.',
  },
  expired: {
    Icon: ShieldAlert,
    tone: 'bg-rose-100 text-rose-900 border-rose-300',
    tooltip: 'This work\'s license has expired. Renew it or remove the work from the shared library.',
  },
};

export function RightsBadge({ status, warning, seatCount, compact = false, className }: RightsBadgeProps) {
  const cfg = CONFIG[status ?? 'unknown'];
  const Icon = cfg.Icon;
  const showSeats = status === 'licensed' && typeof seatCount === 'number' && seatCount > 0;
  const warnCfg = warning ? WARNING_CONFIG[warning] : null;
  return (
    <span className="inline-flex items-center gap-1">
      <span
        title={cfg.tooltip}
        className={cn(
          'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-none',
          cfg.tone,
          className,
        )}
      >
        <Icon className="w-3 h-3" />
        {compact ? cfg.shortLabel : cfg.label}
        {showSeats && (
          <span className="opacity-70">· {seatCount} seat{seatCount === 1 ? '' : 's'}</span>
        )}
      </span>
      {warnCfg && (
        <span
          title={warnCfg.tooltip}
          className={cn(
            'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-none',
            warnCfg.tone,
          )}
        >
          <warnCfg.Icon className="w-3 h-3" />
          {warning === 'over_seat_limit' ? 'Over seats' : 'Expired'}
        </span>
      )}
    </span>
  );
}
