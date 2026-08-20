// The money rail: raised / goal / progress / days-left / Donate.
//
// Layout is a deliberate copy of what actually converts on 99Pledges-style
// pages, with the two things they get wrong fixed:
//   • on mobile this collapses to a sticky bottom bar rather than scrolling
//     off the top, because the overwhelming majority of these pages are
//     opened from a shared text message;
//   • colors come from the tenant's own --site-accent, so a shared link looks
//     like the ensemble rather than like a generic fundraising vendor.

import { Share2, Timer, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fmtMoney, pctOfGoal, daysLeft } from '@/lib/giving/api';

interface Props {
  raisedCents: number;
  goalCents: number;
  endsAt: string | null;
  donateLabel: string;
  onDonate: () => void;
  onShare: () => void;
  closed?: boolean;
}

export function GivingHero({ raisedCents, goalCents, endsAt, donateLabel, onDonate, onShare, closed }: Props) {
  const pct = pctOfGoal(raisedCents, goalCents);
  const left = daysLeft(endsAt);

  return (
    <>
      <div className="rounded-xl overflow-hidden shadow-sm border bg-card">
        <div className="p-5 text-white" style={{ background: 'var(--site-accent, #2f6fed)' }}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide opacity-80">Raised</div>
              <div className="text-3xl sm:text-4xl font-bold leading-tight">{fmtMoney(raisedCents)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide opacity-80">Goal</div>
              <div className="text-3xl sm:text-4xl font-bold leading-tight">{fmtMoney(goalCents)}</div>
            </div>
          </div>

          <div
            className="mt-4 h-8 rounded-md bg-white/95 p-1"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${pct}% of goal raised`}
          >
            <div
              className="h-full rounded bg-amber-400 transition-[width] duration-700 ease-out"
              style={{ width: `${Math.max(pct, raisedCents > 0 ? 4 : 0)}%` }}
            />
          </div>

          {left !== null && (
            <div className="mt-2 flex items-center justify-center gap-1.5 text-sm opacity-90">
              <Timer className="w-4 h-4" />
              {left === 0 ? 'Final day' : `${left} day${left === 1 ? '' : 's'} left`}
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          <Button
            size="lg"
            onClick={onDonate}
            disabled={closed}
            className="w-full h-14 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Heart className="w-5 h-5 mr-2" />
            {closed ? 'This fundraiser has closed' : donateLabel}
          </Button>
          <button
            type="button"
            onClick={onShare}
            className="w-full text-sm text-primary hover:underline flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-4 h-4" /> Share fundraiser
          </button>
        </div>
      </div>

      {/* Mobile sticky bar. The desktop rail scrolls away; this never does. */}
      {!closed && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">
              {fmtMoney(raisedCents)} <span className="text-muted-foreground font-normal">of {fmtMoney(goalCents)}</span>
            </div>
            <div className="h-1.5 mt-1 rounded bg-muted overflow-hidden">
              <div className="h-full bg-amber-400" style={{ width: `${Math.max(pct, raisedCents > 0 ? 4 : 0)}%` }} />
            </div>
          </div>
          <Button onClick={onDonate} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
            Donate
          </Button>
        </div>
      )}
    </>
  );
}
