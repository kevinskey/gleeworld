// Donation form → Stripe Checkout on the tenant's own connected account.
//
// Deliberate product decisions encoded here:
//   • There is NO tip line. The industry-standard 10% donor tip defaulted-on
//     is the single most-complained-about element of these platforms and it
//     poisons a school-parent audience. We offer an honest, clearly-labelled
//     "cover the processing fee" checkbox instead, and it is opt-OUT only
//     because the amount is small and stated in dollars before you click.
//   • The amount buttons come from the campaign, not from this component —
//     a $25 default reads very differently on a $500 personal goal than on a
//     $42,000 program goal.
//   • The message field is prominent. Donor messages on the public wall are
//     what makes the next person give.

import { useMemo, useState } from 'react';
import { Loader2, Heart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { startDonation, fmtMoney, type PublicFundraiser } from '@/lib/giving/api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fundraiser: PublicFundraiser;
  participantSlug?: string | null;
  participantName?: string | null;
}

export function DonateDialog({ open, onOpenChange, fundraiser, participantSlug, participantName }: Props) {
  const [amountCents, setAmountCents] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [hideAmount, setHideAmount] = useState(false);
  const [coverFee, setCoverFee] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const suggestions = fundraiser.suggested_amounts_cents?.length
    ? fundraiser.suggested_amounts_cents
    : [2500, 5000, 10000, 25000];

  const effectiveCents = useMemo(() => {
    if (amountCents !== null) return amountCents;
    const parsed = Number.parseFloat(customAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.round(parsed * 100);
  }, [amountCents, customAmount]);

  const feeCents = fundraiser.fee_cover_enabled && coverFee
    ? Math.round(effectiveCents * (fundraiser.fee_cover_bps / 10000))
    : 0;

  async function submit() {
    if (effectiveCents < fundraiser.min_gift_cents) {
      toast.error(`Minimum gift is ${fmtMoney(fundraiser.min_gift_cents)}.`);
      return;
    }
    if (effectiveCents > fundraiser.max_gift_cents) {
      toast.error(`Maximum online gift is ${fmtMoney(fundraiser.max_gift_cents)}.`);
      return;
    }
    if (!email.includes('@')) {
      toast.error('Please enter an email address for your receipt.');
      return;
    }
    setSubmitting(true);
    try {
      const url = await startDonation({
        fundraiser_slug: fundraiser.slug,
        participant_slug: participantSlug ?? null,
        amount_cents: effectiveCents,
        cover_fee: coverFee,
        donor_name: name.trim(),
        donor_email: email.trim(),
        message: message.trim(),
        is_anonymous: anonymous,
        hide_amount: hideAmount,
      });
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start your donation.');
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{participantName ? `Donate to ${participantName}` : 'Make a donation'}</DialogTitle>
          <DialogDescription>{fundraiser.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Amount</Label>
            <div className="grid grid-cols-4 gap-2">
              {suggestions.map(c => (
                <Button
                  key={c}
                  type="button"
                  variant={amountCents === c ? 'default' : 'outline'}
                  onClick={() => { setAmountCents(c); setCustomAmount(''); }}
                >
                  {fmtMoney(c)}
                </Button>
              ))}
            </div>
            <div className="mt-2 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                inputMode="decimal"
                placeholder="Other amount"
                className="pl-7"
                value={customAmount}
                onChange={e => { setCustomAmount(e.target.value); setAmountCents(null); }}
              />
            </div>
          </div>

          <div className="grid gap-3">
            <div>
              <Label htmlFor="donor-name">Your name</Label>
              <Input id="donor-name" value={name} onChange={e => setName(e.target.value)} placeholder="Shown on the donor wall" />
            </div>
            <div>
              <Label htmlFor="donor-email">Email <span className="text-muted-foreground font-normal">(for your receipt)</span></Label>
              <Input id="donor-email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="donor-message">Message {participantName ? `to ${participantName}` : ''}</Label>
              <Textarea
                id="donor-message"
                rows={2}
                maxLength={280}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="We are so proud of you!"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            {fundraiser.fee_cover_enabled && (
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <Checkbox checked={coverFee} onCheckedChange={v => setCoverFee(v === true)} className="mt-0.5" />
                <span>
                  Add {fmtMoney(feeCents)} to cover card processing
                  <span className="block text-xs text-muted-foreground">
                    Optional. 100% of your {fmtMoney(effectiveCents || 0)} gift goes to {fundraiser.tenant_name} either way.
                  </span>
                </span>
              </label>
            )}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={anonymous} onCheckedChange={v => setAnonymous(v === true)} />
              Don't show my name publicly
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={hideAmount} onCheckedChange={v => setHideAmount(v === true)} />
              Don't show my donation amount publicly
            </label>
          </div>

          <Button
            onClick={submit}
            disabled={submitting || effectiveCents <= 0}
            className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting to secure checkout…</>
              : <><Heart className="w-4 h-4 mr-2" /> Donate {effectiveCents > 0 ? fmtMoney(effectiveCents + feeCents) : ''}</>}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Payment is processed securely by Stripe and goes directly to {fundraiser.tenant_name}.
            {fundraiser.tax_deductible
              ? ' Your gift is tax-deductible; a receipt will be emailed to you.'
              : ' This gift is not tax-deductible. A receipt will be emailed to you.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
