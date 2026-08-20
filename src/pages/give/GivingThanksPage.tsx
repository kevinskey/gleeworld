// Post-donation page — /give/:slug/thanks.
//
// The most valuable moment in the whole flow and the one 99Pledges wastes.
// A donor who just gave is at peak willingness to do one more thing, so this
// page asks for exactly one: share it. Everything else (follow, merch,
// tickets) sits below as a soft cross-sell into the rest of GleeWorld.
//
// Note: this page never claims the payment succeeded on its own authority —
// Stripe redirects here immediately, while the webhook is what actually marks
// the gift paid. The copy is written to be true either way.

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Share2, Store, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { ShareSheet } from '@/components/giving/ShareSheet';
import { fetchFundraiser, fmtMoney, pctOfGoal } from '@/lib/giving/api';

export default function GivingThanksPage() {
  const { slug = '' } = useParams();
  const [shareOpen, setShareOpen] = useState(false);

  const { data: fundraiser } = useQuery({
    queryKey: ['giving', 'fundraiser', slug],
    queryFn: () => fetchFundraiser(slug),
    enabled: !!slug,
  });

  const shareUrl = `${window.location.origin}/give/${slug}`;

  return (
    <UniversalLayout>
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <CheckCircle2 className="w-14 h-14 mx-auto mb-4 text-emerald-600" />
        <h1 className="text-2xl font-bold mb-2">Thank you!</h1>
        <p className="text-muted-foreground mb-6">
          Your receipt is on its way to your email.
          {fundraiser ? ` Your gift goes directly to ${fundraiser.tenant_name}.` : ''}
        </p>

        {fundraiser && (
          <div className="rounded-xl border bg-card p-5 mb-6">
            <div className="text-sm text-muted-foreground">{fundraiser.title}</div>
            <div className="text-2xl font-bold mt-1">
              {fmtMoney(fundraiser.raised_cents)}
              <span className="text-base font-normal text-muted-foreground"> of {fmtMoney(fundraiser.goal_cents)}</span>
            </div>
            <div className="h-2 mt-3 rounded bg-muted overflow-hidden">
              <div
                className="h-full bg-amber-400"
                style={{ width: `${pctOfGoal(fundraiser.raised_cents, fundraiser.goal_cents)}%` }}
              />
            </div>
          </div>
        )}

        <Button size="lg" className="w-full h-12 mb-3" onClick={() => setShareOpen(true)}>
          <Share2 className="w-4 h-4 mr-2" /> Share this fundraiser
        </Button>
        <p className="text-sm text-muted-foreground mb-8">
          Sharing with three people typically does more than doubling your gift would.
        </p>

        <div className="grid sm:grid-cols-2 gap-3 text-left">
          <Link to="/store" className="rounded-lg border p-4 hover:bg-muted/50 flex items-center gap-3">
            <Store className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="font-medium text-sm">Shop the merch store</div>
              <div className="text-xs text-muted-foreground">Wear it and keep supporting</div>
            </div>
          </Link>
          <Link to="/box-office" className="rounded-lg border p-4 hover:bg-muted/50 flex items-center gap-3">
            <Ticket className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="font-medium text-sm">Come to a concert</div>
              <div className="text-xs text-muted-foreground">See what you supported</div>
            </div>
          </Link>
        </div>

        <Link to={`/give/${slug}`} className="inline-block mt-8 text-sm text-primary hover:underline">
          ← Back to the fundraiser
        </Link>
      </div>

      <ShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={shareUrl}
        title={fundraiser?.title ?? 'Support us'}
        pitch={`I just donated to ${fundraiser?.tenant_name ?? 'this fundraiser'} — would you join me?`}
      />
    </UniversalLayout>
  );
}
