import { z } from 'zod';
import { Info } from 'lucide-react';
import type { BlockModule, BlockRenderProps } from '../types';

const schema = z.object({
  title: z.string().default('About us'),
  body: z.string().default(''),
  imageUrl: z.string().default(''),
  imageSide: z.enum(['left', 'right']).default('right'),
});
type Config = z.infer<typeof schema>;

function Render({ config }: BlockRenderProps<Config>) {
  if (!config.body && !config.imageUrl) return null;
  const img = config.imageUrl ? (
    <img src={config.imageUrl} alt="" className="w-full h-72 sm:h-96 object-cover rounded-2xl shadow-lg" />
  ) : null;
  const text = (
    <div>
      {config.title && (
        <h2 className="font-sans normal-case tracking-tight text-2xl sm:text-3xl font-bold mb-4">{config.title}</h2>
      )}
      <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">{config.body}</p>
    </div>
  );
  return (
    <section id="about" className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
      {img ? (
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {config.imageSide === 'left' ? (<>{img}{text}</>) : (<>{text}{img}</>)}
        </div>
      ) : (
        <div className="max-w-3xl mx-auto text-center">{text}</div>
      )}
    </section>
  );
}

export const aboutBlock: BlockModule<typeof schema> = {
  type: 'about',
  name: 'About',
  description: 'Tell your story with text and an optional photo.',
  icon: Info,
  tier: 'free',
  configSchema: schema,
  defaultConfig: { title: 'About us', body: '', imageUrl: '', imageSide: 'right' },
  Render,
};
