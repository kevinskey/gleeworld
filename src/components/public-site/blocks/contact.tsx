import { z } from 'zod';
import { Mail, Phone, Facebook, Instagram, Youtube, Twitter, Music, AtSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EditableText } from '../EditableText';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

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

// Turn a stored social value into a full URL. Users tend to enter handles
// like "@awesomechoir" or "awesomechoir" instead of a real link, so we
// recognize that and prefix the platform's base URL.
const SOCIAL_BASE: Record<keyof Omit<Config, 'email' | 'phone'>, string> = {
  facebook: 'https://facebook.com/',
  instagram: 'https://instagram.com/',
  youtube: 'https://youtube.com/',
  twitter: 'https://x.com/',
  spotify: 'https://open.spotify.com/artist/',
};

function socialHref(platform: keyof typeof SOCIAL_BASE, value: string): string {
  const v = value.trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  // YouTube channel handles begin with @; for everyone else, strip a leading @.
  if (platform === 'youtube') {
    return `${SOCIAL_BASE.youtube}${v.startsWith('@') ? v : `@${v}`}`;
  }
  return `${SOCIAL_BASE[platform]}${v.replace(/^@/, '')}`;
}

function cleanEmail(raw: string): string {
  // Strip spaces so users who type "name @domain.com" still get a working link.
  return raw.replace(/\s+/g, '').trim();
}

// YIQ-based readable foreground for a hex color. Returns near-black on light
// backgrounds, near-white on dark — so the footer stays legible no matter
// what primary color the tenant picked.
function readableOn(hex: string): { fg: string; subFg: string; mutedFg: string } {
  const h = (hex || '').replace('#', '').trim();
  if (h.length !== 6) return { fg: '#ffffff', subFg: 'rgba(255,255,255,0.85)', mutedFg: 'rgba(255,255,255,0.6)' };
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150
    ? { fg: '#1a1a1a', subFg: 'rgba(15,23,42,0.78)', mutedFg: 'rgba(15,23,42,0.55)' }
    : { fg: '#ffffff', subFg: 'rgba(255,255,255,0.85)', mutedFg: 'rgba(255,255,255,0.6)' };
}

function Render({ config, ctx, onConfigChange }: BlockRenderProps<Config>) {
  const editable = !!onConfigChange;
  const email = cleanEmail(config.email);
  const phone = config.phone.trim();
  const socials: Array<{ key: keyof typeof SOCIAL_BASE; href: string; Icon: typeof Facebook; label: string }> = [
    { key: 'facebook', href: socialHref('facebook', config.facebook), Icon: Facebook, label: 'Facebook' },
    { key: 'instagram', href: socialHref('instagram', config.instagram), Icon: Instagram, label: 'Instagram' },
    { key: 'youtube', href: socialHref('youtube', config.youtube), Icon: Youtube, label: 'YouTube' },
    { key: 'twitter', href: socialHref('twitter', config.twitter), Icon: Twitter, label: 'X / Twitter' },
    { key: 'spotify', href: socialHref('spotify', config.spotify), Icon: Music, label: 'Spotify' },
  ].filter((s) => s.href);
  const { fg, subFg, mutedFg } = readableOn(ctx.theme?.primaryColor || '#0f172a');
  return (
    <footer id="contact" className="mt-10 max-w-6xl mx-auto w-full" style={{ background: 'var(--site-primary)', color: fg }}>
      <div className="px-4 sm:px-6 py-5 text-center space-y-4">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm" style={{ color: subFg }}>
          {/* In edit mode, drop the mailto/tel anchors so clicking a field
              places a caret instead of prompting the browser to open a mail
              client. Both fields also always render (even when empty) so
              tenants have a place to click. */}
          {editable ? (
            <span className="inline-flex items-center gap-1.5 break-all">
              <Mail className="w-4 h-4" />
              <EditableText
                as="span"
                editable
                value={config.email}
                onChange={(v) => onConfigChange?.({ email: v } as Partial<Config>)}
                placeholder="hello@yourchoir.org"
                ariaLabel="Contact email"
              />
            </span>
          ) : (email && (
            <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 break-all hover:opacity-100 transition-opacity" style={{ color: 'inherit' }}>
              <Mail className="w-4 h-4" /> {email}
            </a>
          ))}
          {editable ? (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="w-4 h-4" />
              <EditableText
                as="span"
                editable
                value={config.phone}
                onChange={(v) => onConfigChange?.({ phone: v } as Partial<Config>)}
                placeholder="(555) 555-5555"
                ariaLabel="Contact phone"
              />
            </span>
          ) : (phone && (
            <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 hover:opacity-100 transition-opacity" style={{ color: 'inherit' }}>
              <Phone className="w-4 h-4" /> {phone}
            </a>
          ))}
        </div>
        {socials.length > 0 && (
          <div className="flex justify-center gap-6">
            {socials.map(({ key, href, Icon, label }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="hover:opacity-100 transition-opacity"
                style={{ color: subFg }}
                aria-label={label}
                title={label}
              >
                <Icon className="w-10 h-10" />
              </a>
            ))}
          </div>
        )}
        <p className="text-xs" style={{ color: mutedFg }}>
          © {new Date().getFullYear()} {ctx.orgName}. Powered by{' '}
          <a href="https://gleeworld.org" target="_blank" rel="noreferrer" className="underline" style={{ color: 'inherit' }}>GleeWorld</a>.
        </p>
      </div>
    </footer>
  );
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</Label>
          <Input
            value={config.email}
            onChange={(e) => set({ email: e.target.value })}
            placeholder="hello@yourchoir.org"
            type="email"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone</Label>
          <Input
            value={config.phone}
            onChange={(e) => set({ phone: e.target.value })}
            placeholder="(555) 555-5555"
            type="tel"
            className="h-9"
          />
        </div>
      </div>
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
        <div className="text-xs uppercase tracking-wide font-semibold text-slate-500">Social media</div>
        <p className="text-xs text-slate-500">
          Paste a full URL <em>or</em> just the username — we&apos;ll link it to the right place.
        </p>
        <div className="space-y-2">
          {[
            { key: 'facebook', Icon: Facebook, label: 'Facebook', placeholder: 'awesomechoir or https://facebook.com/awesomechoir' },
            { key: 'instagram', Icon: Instagram, label: 'Instagram', placeholder: '@awesomechoir' },
            { key: 'youtube', Icon: Youtube, label: 'YouTube', placeholder: '@awesomechoir' },
            { key: 'twitter', Icon: Twitter, label: 'X / Twitter', placeholder: '@awesomechoir' },
            { key: 'spotify', Icon: Music, label: 'Spotify', placeholder: 'Full Spotify artist URL' },
          ].map(({ key, Icon, label, placeholder }) => (
            <div key={key} className="grid grid-cols-[auto_1fr] items-center gap-2">
              <Icon className="w-4 h-4 text-slate-500" />
              <Input
                value={config[key as keyof Config] as string}
                onChange={(e) => set({ [key]: e.target.value } as Partial<Config>)}
                placeholder={placeholder}
                aria-label={label}
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const contactBlock: BlockModule<typeof schema> = {
  type: 'contact',
  name: 'Contact & Footer',
  description: 'Email, phone, and social links rendered as the page footer.',
  icon: AtSign,
  tier: 'free',
  group: 'core',
  configSchema: schema,
  defaultConfig: { email: '', phone: '', facebook: '', instagram: '', youtube: '', twitter: '', spotify: '' },
  EditorForm,
  Render,
};
