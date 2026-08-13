// Footer — social links, contact info, and a small-print line. The page's
// closing chord: ink band matching the header, gold accents, one content
// column. Tenant-neutral; every field is config and empty fields hide.
import { z } from 'zod';
import { Facebook, Instagram, Mail, Music2, Phone, Youtube } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
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
  return (
    <footer className="w-full" style={{ background: 'var(--site-primary, #131722)', color: '#fff' }}>
      <div className="gw-container py-10">
        <div className="flex flex-col cq-sm:flex-row cq-sm:items-center cq-sm:justify-between gap-6">
          <div className="flex items-center gap-3">
            {ctx.logoUrl && <img src={ctx.logoUrl} alt="" className="h-9 w-auto object-contain" />}
            <span className="font-bold text-lg">{ctx.orgName}</span>
          </div>
          {socials.length > 0 && (
            <div className="flex items-center gap-4">
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
                  <Icon className="w-6 h-6" />
                </a>
              ))}
            </div>
          )}
        </div>
        {(config.email || config.phone) && (
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-base text-white/80">
            {config.email && (
              <a href={`mailto:${config.email}`} className="inline-flex items-center gap-2 hover:text-white">
                <Mail className="w-4 h-4" style={{ color: 'var(--site-accent)' }} /> {config.email}
              </a>
            )}
            {config.phone && (
              <a href={`tel:${config.phone.replace(/[^+\d]/g, '')}`} className="inline-flex items-center gap-2 hover:text-white">
                <Phone className="w-4 h-4" style={{ color: 'var(--site-accent)' }} /> {config.phone}
              </a>
            )}
          </div>
        )}
        <div
          className="mt-8 pt-5 text-sm text-white/60 border-t"
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
