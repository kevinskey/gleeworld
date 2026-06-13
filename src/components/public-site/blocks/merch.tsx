import { z } from 'zod';
import { ShoppingBag } from 'lucide-react';
import type { BlockModule, BlockRenderProps } from '../types';

const schema = z.object({
  heading: z.string().default('Merch'),
});
type Config = z.infer<typeof schema>;

// Stub: storefront rendering lands with the merch addon work.
function Render({ config }: BlockRenderProps<Config>) {
  return (
    <section id="merch" className="max-w-6xl mx-auto px-4 sm:px-6 py-5 text-center">
      <ShoppingBag className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--site-accent)' }} />
      <h2 className="normal-case text-2xl sm:text-3xl font-bold mb-3">{config.heading}</h2>
      <p className="text-muted-foreground">Our store is coming soon.</p>
    </section>
  );
}

export const merchBlock: BlockModule<typeof schema> = {
  type: 'merch',
  name: 'Merch Store',
  description: 'Sell apparel, recordings, and gear straight from your landing page.',
  icon: ShoppingBag,
  tier: 'addon',
  requiredAddon: 'merch',
  group: 'addon',
  poweredBy: 'Merch Store',
  configSchema: schema,
  defaultConfig: { heading: 'Merch' },
  Render,
};
