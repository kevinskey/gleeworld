import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { HandHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BlockModule, BlockRenderProps } from '../types';
import { fetchFundraiser, fmtMoney, pctOfGoal, daysLeft } from '@/lib/giving/api';

const schema = z.object({
  heading: z.string().default('Support our music'),
  blurb: z.string().default('Your gift keeps our program singing.'),
  /** Slug of a live fundraiser. Empty = a plain prompt with no live totals. */
  fundraiserSlug: z.string().default(''),
  buttonLabel: z.string().default('Donate'),
});
type Config = z.infer<typeof schema>;

// Live progress when the block is pointed at a campaign. A public page
// showing real momentum ("$3,500 raised, 9 days left") converts far better
// than a bare Donate button, and it costs one cached RPC call.
function Render({ config }: BlockRenderProps<Config>) {
  const slug = config.fundraiserSlug?.trim();
  const { data: fundraiser } = useQuery({
    queryKey: ['giving', 'fundraiser', slug],
    queryFn: () => fetchFundraiser(slug),
    enabled: !!slug,
    staleTime: 60_000,
  });

  const href = slug ? `/give/${slug}` : undefined;
  const left = fundraiser ? daysLeft(fundraiser.ends_at) : null;

  return (
    <section id="donate" className="gw-container py-5 text-center">
      <div className="max-w-3xl mx-auto">
        <HandHeart className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--site-accent)' }} />
        <h2 className="normal-case text-2xl sm:text-3xl font-bold mb-3">{config.heading}</h2>
        <p className="text-lg text-muted-foreground leading-relaxed mb-6">{config.blurb}</p>

        {fundraiser && fundraiser.goal_cents > 0 && (
          <div className="max-w-md mx-auto mb-6">
            <div className="flex items-baseline justify-between text-sm mb-1">
              <span className="font-semibold text-base">{fmtMoney(fundraiser.raised_cents)} raised</span>
              <span className="text-muted-foreground">of {fmtMoney(fundraiser.goal_cents)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{
                  width: `${Math.max(pctOfGoal(fundraiser.raised_cents, fundraiser.goal_cents), fundraiser.raised_cents > 0 ? 3 : 0)}%`,
                  background: 'var(--site-accent)',
                }}
              />
            </div>
            {left !== null && (
              <div className="text-xs text-muted-foreground mt-1.5">
                {left === 0 ? 'Final day' : `${left} day${left === 1 ? '' : 's'} left`}
              </div>
            )}
          </div>
        )}

        <Button
          size="lg"
          className="rounded-full px-8 text-white"
          style={{ background: 'var(--site-accent)' }}
          disabled={!href}
          asChild={!!href}
        >
          {href ? <a href={href}>{config.buttonLabel}</a> : <span>Donate (not configured)</span>}
        </Button>
      </div>
    </section>
  );
}

export const donationsBlock: BlockModule<typeof schema> = {
  type: 'donations',
  name: 'Donations',
  description: 'Accept gifts from supporters, with live progress from a Giving campaign.',
  icon: HandHeart,
  tier: 'addon',
  requiredAddon: 'giving',
  group: 'addon',
  poweredBy: 'Giving',
  configSchema: schema,
  defaultConfig: {
    heading: 'Support our music',
    blurb: 'Your gift keeps our program singing.',
    fundraiserSlug: '',
    buttonLabel: 'Donate',
  },
  Render,
};
