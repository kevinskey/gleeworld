import { z } from 'zod';
import { Mail, Phone, Facebook, Instagram, Youtube, Twitter, Music, AtSign } from 'lucide-react';
import type { BlockModule, BlockRenderProps, SiteRenderContext } from '../types';

const schema = z.object({
  email: z.string().default(''),
  phone: z.string().default(''),
  facebook: z.string().default(''),
  instagram: z.string().default(''),
  youtube: z.string().default(''),
  twitter: z.string().default(''),
  spotify: z.string().default(''),
});
type Config = z.infer<typeof schema>;

function Render({ config, ctx }: BlockRenderProps<Config>) {
  const socials: Array<[string, typeof Facebook]> = [
    [config.facebook, Facebook],
    [config.instagram, Instagram],
    [config.youtube, Youtube],
    [config.twitter, Twitter],
    [config.spotify, Music],
  ];
  return (
    <footer id="contact" className="text-white mt-10" style={{ background: 'var(--site-primary)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 text-center space-y-4">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-white/85">
          {config.email && (
            <a href={`mailto:${config.email}`} className="inline-flex items-center gap-1.5 hover:text-white">
              <Mail className="w-4 h-4" /> {config.email}
            </a>
          )}
          {config.phone && (
            <a href={`tel:${config.phone}`} className="inline-flex items-center gap-1.5 hover:text-white">
              <Phone className="w-4 h-4" /> {config.phone}
            </a>
          )}
        </div>
        <div className="flex justify-center gap-4">
          {socials.map(([url, Icon], i) =>
            url ? (
              <a key={i} href={url} target="_blank" rel="noreferrer" className="text-white/70 hover:text-white">
                <Icon className="w-5 h-5" />
              </a>
            ) : null,
          )}
        </div>
        <p className="text-xs text-white/60">
          © {new Date().getFullYear()} {ctx.orgName}. Powered by{' '}
          <a href="https://gleeworld.org" target="_blank" rel="noreferrer" className="underline">GleeWorld</a>.
        </p>
      </div>
    </footer>
  );
}

export const contactBlock: BlockModule<typeof schema> = {
  type: 'contact',
  name: 'Contact & footer',
  description: 'Email, phone, and social links rendered as the page footer.',
  icon: AtSign,
  tier: 'free',
  configSchema: schema,
  defaultConfig: { email: '', phone: '', facebook: '', instagram: '', youtube: '', twitter: '', spotify: '' },
  Render,
};
