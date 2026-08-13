// Footer — social links, contact info, and a small-print line. The page's
// closing chord: ink band matching the header, gold accents, one content
// column. Tenant-neutral; every field is config and empty fields hide.
import { z } from 'zod';
import { Facebook, Instagram, Mail, Music2, Phone, Youtube } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  // Per-footer logo override — the branding logo is dark for internal
  // chrome, and disappears on this ink band (same trap as the header).
  logoUrl: z.string().default('').optional(),
  email: z.string().default(''),
  phone: z.string().default(''),
  instagram: z.string().default(''),
  facebook: z.string().default(''),
  youtube: z.string().default(''),
  tiktok: z.string().default(''),
  patreon: z.string().default(''),
  smallPrint: z.string().default(''),
});
type Config = z.infer<typeof schema>;

const SOCIALS: Array<{ key: keyof Config; label: string; Icon: typeof Instagram }> = [
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  { key: 'facebook', label: 'Facebook', Icon: Facebook },
  { key: 'youtube', label: 'YouTube', Icon: Youtube },
  { key: 'tiktok', label: 'TikTok', Icon: Music2 },
  { key: 'patreon', label: 'Patreon', Icon: Music2 },
];

function Render({ config, ctx }: BlockRenderProps<Config>) {
  const socials = SOCIALS.filter((s) => config[s.key]);
  const year = new Date().getFullYear();
  const logo = config.logoUrl || ctx.logoUrl;
  return (
    <footer className="w-full" style={{ background: 'var(--site-primary, #131722)', color: '#fff' }}>
      <div className="gw-container py-6">
        {/* Everything on one line: identity + contact left, socials right. */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="flex items-center gap-3">
            {logo && <img src={logo} alt="" className="h-8 w-auto object-contain" />}
            <span className="font-bold text-base">{ctx.orgName}</span>
          </div>
          {config.email && (
            <a href={`mailto:${config.email}`} className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white">
              <Mail className="w-4 h-4" style={{ color: 'var(--site-accent)' }} /> {config.email}
            </a>
          )}
          {config.phone && (
            <a href={`tel:${config.phone.replace(/[^+\d]/g, '')}`} className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white">
              <Phone className="w-4 h-4" style={{ color: 'var(--site-accent)' }} /> {config.phone}
            </a>
          )}
          {socials.length > 0 && (
            <div className="ml-auto flex items-center gap-4">
              {socials.map(({ key, label, Icon }) => (
                <a
                  key={key}
                  href={String(config[key])}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="opacity-80 hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--site-accent)' }}
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          )}
        </div>
        <div
          className="mt-5 pt-4 text-sm text-white/60 border-t text-center"
          style={{ borderColor: 'color-mix(in oklab, var(--site-accent) 30%, transparent)' }}
        >
          {config.smallPrint || `© ${year} ${ctx.orgName}. All rights reserved.`}
        </div>
      </div>
    </footer>
  );
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  const field = (label: string, key: keyof Config, ph = '') => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={String(config[key] ?? '')} placeholder={ph} onChange={(e) => set({ [key]: e.target.value } as Partial<Config>)} />
    </div>
  );
  return (
    <div className="space-y-4">
      {field('Logo URL (empty = branding logo; use a light version on dark bands)', 'logoUrl')}
      {field('Email', 'email', 'you@example.org')}
      {field('Phone', 'phone', '(555) 555-5555')}
      {field('Instagram URL', 'instagram')}
      {field('Facebook URL', 'facebook')}
      {field('YouTube URL', 'youtube')}
      {field('TikTok URL', 'tiktok')}
      {field('Patreon URL', 'patreon')}
      {field('Small print (empty = © year + name)', 'smallPrint')}
    </div>
  );
}

export const footerBlock: BlockModule<typeof schema> = {
  type: 'footer',
  name: 'Footer',
  description: 'Site footer: social links, contact info, small print. Matches the header bar.',
  icon: Mail,
  tier: 'free',
  group: 'core',
  configSchema: schema,
  defaultConfig: schema.parse({}),
  EditorForm,
  Render,
};
