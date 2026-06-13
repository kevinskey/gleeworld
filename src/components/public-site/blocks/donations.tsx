import { z } from 'zod';
import { HandHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BlockModule, BlockRenderProps } from '../types';

const schema = z.object({
  heading: z.string().default('Support our music'),
  blurb: z.string().default('Your gift keeps our program singing.'),
});
type Config = z.infer<typeof schema>;

// Stub: checkout wiring lands with the payments addon work.
function Render({ config }: BlockRenderProps<Config>) {
  return (
    <section id="donate" className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
      <HandHeart className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--site-accent)' }} />
      <h2 className="normal-case text-2xl sm:text-3xl font-bold mb-3">{config.heading}</h2>
      <p className="text-lg text-muted-foreground leading-relaxed mb-6">{config.blurb}</p>
      <Button size="lg" className="rounded-full px-8 text-white" style={{ background: 'var(--site-accent)' }} disabled>
        Donate (coming soon)
      </Button>
    </section>
  );
}

export const donationsBlock: BlockModule<typeof schema> = {
  type: 'donations',
  name: 'Donations',
  description: 'Accept gifts from supporters with a customizable donation prompt.',
  icon: HandHeart,
  tier: 'addon',
  requiredAddon: 'finance',
  group: 'addon',
  poweredBy: 'Give Back & Finance',
  configSchema: schema,
  defaultConfig: { heading: 'Support our music', blurb: 'Your gift keeps our program singing.' },
  Render,
};
