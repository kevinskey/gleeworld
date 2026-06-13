import { z } from 'zod';
import { LayoutPanelTop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  siteName: z.string().default(''),
  logoUrl: z.string().default(''),
  navLinks: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
});
type Config = z.infer<typeof schema>;

function Render({ config, ctx }: BlockRenderProps<Config>) {
  const name = config.siteName || ctx.orgName;
  const logo = config.logoUrl || ctx.logoUrl;
  return (
    <header
      className="sticky top-0 z-40 text-white"
      style={{ background: 'var(--site-primary)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
        <a href="#top" className="flex items-center gap-3 min-w-0">
          {logo && <img src={logo} alt={name} className="h-9 w-auto object-contain" />}
          <span className="font-bold text-base sm:text-lg tracking-tight truncate">{name}</span>
        </a>
        <nav className="flex items-center gap-4 text-sm">
          {config.navLinks.map((l, i) => (
            <a key={i} href={l.url} className="text-white/80 hover:text-white whitespace-nowrap">
              {l.label}
            </a>
          ))}
          {ctx.memberSignIn && (
            <a
              href="/login"
              className="border border-white/30 rounded-full px-3 py-1 text-white/90 hover:bg-white/10 whitespace-nowrap"
            >
              Sign in
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  const setLink = (i: number, patch: Partial<{ label: string; url: string }>) => {
    const navLinks = config.navLinks.map((l, j) => (j === i ? { ...l, ...patch } : l));
    set({ navLinks });
  };
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Site name</Label>
        <Input value={config.siteName} onChange={(e) => set({ siteName: e.target.value })} placeholder="Your organization" />
      </div>
      <div className="space-y-1.5">
        <Label>Logo URL</Label>
        <Input value={config.logoUrl} onChange={(e) => set({ logoUrl: e.target.value })} placeholder="https://…" />
      </div>
      <div className="space-y-2">
        <Label>Navigation links</Label>
        {config.navLinks.map((l, i) => (
          <div key={i} className="flex gap-2">
            <Input value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} placeholder="Label" className="flex-1" />
            <Input value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} placeholder="#events or https://…" className="flex-[2]" />
            <Button variant="ghost" size="icon" onClick={() => set({ navLinks: config.navLinks.filter((_, j) => j !== i) })}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => set({ navLinks: [...config.navLinks, { label: '', url: '' }] })}>
          <Plus className="w-4 h-4" /> Add link
        </Button>
      </div>
    </div>
  );
}

export const headerBlock: BlockModule<typeof schema> = {
  type: 'header',
  name: 'Header',
  description: 'Logo, site name, and navigation. Always at the top.',
  icon: LayoutPanelTop,
  tier: 'free',
  locked: true,
  configSchema: schema,
  defaultConfig: { siteName: '', logoUrl: '', navLinks: [] },
  EditorForm,
  Render,
};
