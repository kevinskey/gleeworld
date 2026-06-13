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
    <section id="merch" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 text-center">
      <ShoppingBag className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--site-accent)' }} />
      <h2 className="font-sans normal-case tracking-tight text-2xl sm:text-3xl font-bold mb-3">{config.heading}</h2>
      <p className="text-muted-foreground">Our store is coming soon.</p>
    </section>
  );
}

export const merchBlock: BlockModule<typeof schema> = {
  type: 'merch',
  name: 'Merch store',
  description: 'Sell apparel and more. Requires the Merch Store add-on.',
  icon: ShoppingBag,
  tier: 'addon',
  requiredAddon: 'merch',
  configSchema: schema,
  defaultConfig: { heading: 'Merch' },
  Render,
};
