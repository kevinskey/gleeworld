// Donor wall. The messages are the point — "We are proud of you Laila" is
// what convinces the next visitor to give, far more than the amount is.
// A donor who hid their amount still appears, message intact.

import { fmtMoney, type PublicDonation } from '@/lib/giving/api';

interface Props {
  donations: PublicDonation[];
  showParticipant?: boolean;
  onShowMore?: () => void;
  canShowMore?: boolean;
}

export function TopDonations({ donations, showParticipant, onShowMore, canShowMore }: Props) {
  if (!donations.length) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold mb-1">Top donations</h3>
        <p className="text-sm text-muted-foreground">Be the first to give.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="font-semibold mb-3">Top donations</h3>
      <ul className="divide-y">
        {donations.map((d, i) => (
          <li key={`${d.created_at}-${i}`} className="py-3 flex gap-4">
            <div className="w-20 shrink-0 text-xl font-semibold tabular-nums">
              {d.amount_cents === null
                ? <span className="text-sm text-muted-foreground font-normal">Gift</span>
                : fmtMoney(d.amount_cents)}
            </div>
            <div className="min-w-0">
              <div className="font-medium truncate">{d.donor_label}</div>
              {d.message && <div className="text-sm text-muted-foreground italic break-words">{d.message}</div>}
              {showParticipant && d.participant_name && (
                <div className="text-xs text-muted-foreground mt-0.5">for {d.participant_name}</div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {canShowMore && (
        <button type="button" onClick={onShowMore} className="mt-3 w-full text-sm text-primary hover:underline">
          Show more +
        </button>
      )}
    </div>
  );
}
