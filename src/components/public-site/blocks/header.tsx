import { z } from 'zod';
import { LayoutPanelTop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { ImageUploadField } from '../ImageUploadField';
import { FONT_OPTIONS, type BlockModule, type BlockEditorFormProps, type BlockRenderProps, type SiteTheme } from '../types';

// Friendly names for the on-page anchor targets that ship as built-in blocks.
// Choosing one of these hops to the matching section on the same page.
const ON_PAGE_TARGETS: { value: string; label: string }[] = [
  { value: '#top', label: 'Top of page' },
  { value: '#events', label: 'Events section' },
  { value: '#about', label: 'About section' },
  { value: '#contact', label: 'Contact section' },
  { value: '#donations', label: 'Donate section' },
  { value: '#merch', label: 'Shop section' },
];
const CUSTOM_URL = '__custom__';

const schema = z.object({
  siteName: z.string().default(''),
  logoUrl: z.string().default(''),
  navLinks: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
  navLinkColor: z.string().default('#ffffff'),
  // Logo height in pixels; width auto-scales to maintain aspect.
  logoHeight: z.number().int().min(20).max(120).default(36),
});
type Config = z.infer<typeof schema>;

function Render({ config, ctx }: BlockRenderProps<Config>) {
  const name = config.siteName || ctx.orgName;
  const logo = config.logoUrl || ctx.logoUrl;
  const linkColor = config.navLinkColor || '#ffffff';
  const logoHeight = config.logoHeight || 36;
  // Header bar height = logo + 16px breathing room each side, with a sensible floor.
  const barHeight = Math.max(56, logoHeight + 16);
  return (
    <header
      className="sticky top-0 z-40"
      style={{ background: 'var(--site-primary)', paddingTop: 'env(safe-area-inset-top)', color: linkColor }}
    >
      <div
        className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4"
        style={{ height: barHeight }}
      >
        <a href="#top" className="flex items-center gap-3 min-w-0">
          {logo && (
            <img
              src={logo}
              alt=""
              className="w-auto object-contain"
              style={{ height: logoHeight }}
              onError={(e) => { (e.currentTarget.style.display = 'none'); }}
            />
          )}
          <span className="font-bold text-base sm:text-lg truncate">{name}</span>
        </a>
        <nav className="flex items-center gap-4 text-sm">
          {config.navLinks.map((l, i) => (
            <a
              key={i}
              href={l.url}
              className="whitespace-nowrap opacity-80 hover:opacity-100 transition-opacity"
              style={{ color: linkColor }}
            >
              {l.label}
            </a>
          ))}
          {ctx.memberSignIn && (
            <a
              href="/auth"
              className="rounded-full px-3 py-1 whitespace-nowrap border opacity-90 hover:opacity-100 hover:bg-white/10 transition-opacity"
              style={{ color: linkColor, borderColor: linkColor + '4d' }}
            >
              Sign in
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}

function EditorForm({ config, onChange, theme, onThemeChange }: BlockEditorFormProps<Config>) {
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
      <ImageUploadField
        label="Logo"
        prefix="logo"
        thumbClass="w-16 h-16"
        value={config.logoUrl}
        onChange={(url) => set({ logoUrl: url })}
        buttonColor={theme?.primaryColor}
      />
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Logo size</Label>
          <span className="text-xs text-slate-500 tabular-nums">{config.logoHeight || 36}px tall</span>
        </div>
        <input
          type="range"
          min={20}
          max={120}
          step={2}
          value={config.logoHeight || 36}
          onChange={(e) => set({ logoHeight: Number(e.target.value) })}
          className="w-full accent-sky-600"
        />
      </div>
      {theme && onThemeChange && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Brand colors</div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Primary color</Label>
            <input
              type="color"
              value={theme.primaryColor}
              onChange={(e) => onThemeChange({ primaryColor: e.target.value })}
              className="h-8 w-12 rounded border cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Accent color</Label>
            <input
              type="color"
              value={theme.accentColor}
              onChange={(e) => onThemeChange({ accentColor: e.target.value })}
              className="h-8 w-12 rounded border cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label className="text-sm">Font</Label>
            <Select
              value={theme.fontFamily}
              onValueChange={(v) => onThemeChange({ fontFamily: v as SiteTheme['fontFamily'] })}
            >
              <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span style={{ fontFamily: opt.css }}>{opt.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Letter spacing</Label>
              <span className="text-xs text-slate-500 tabular-nums">
                {(theme.letterSpacing ?? 0).toFixed(2)}em
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={-0.05}
                max={0.3}
                step="any"
                value={theme.letterSpacing ?? 0}
                onChange={(e) => onThemeChange({ letterSpacing: Number(e.target.value) })}
                className="flex-1 accent-sky-600 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => onThemeChange({ letterSpacing: 0 })}
                className="text-xs text-sky-600 hover:underline"
                title="Reset to normal"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Menu links</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Color</span>
            <input
              type="color"
              value={config.navLinkColor || '#ffffff'}
              onChange={(e) => set({ navLinkColor: e.target.value })}
              className="h-7 w-10 rounded border cursor-pointer"
              title="Menu link text color"
            />
          </div>
        </div>
        {config.navLinks.length > 0 && (
          <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5 text-[10px] uppercase tracking-wide text-slate-500 px-1">
            <span>Text</span>
            <span>Goes to</span>
            <span />
          </div>
        )}
        {config.navLinks.map((l, i) => {
          const isOnPage = ON_PAGE_TARGETS.some((t) => t.value === l.url);
          const selectValue = isOnPage ? l.url : (l.url ? CUSTOM_URL : '');
          return (
            <div key={i} className="space-y-1">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5 items-center">
                <Input
                  value={l.label}
                  onChange={(e) => setLink(i, { label: e.target.value })}
                  placeholder="Events"
                  className="h-9"
                />
                <Select
                  value={selectValue}
                  onValueChange={(v) => setLink(i, { url: v === CUSTOM_URL ? '' : v })}
                >
                  <SelectTrigger className="h-9"><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent>
                    {ON_PAGE_TARGETS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_URL}>Other website…</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-400 hover:text-slate-700"
                  onClick={() => set({ navLinks: config.navLinks.filter((_, j) => j !== i) })}
                  title="Remove link"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              {selectValue === CUSTOM_URL && (
                <Input
                  value={l.url}
                  onChange={(e) => setLink(i, { url: e.target.value })}
                  placeholder="https://example.com"
                  className="h-8 text-xs ml-0"
                />
              )}
            </div>
          );
        })}
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
  group: 'core',
  locked: true,
  configSchema: schema,
  defaultConfig: { siteName: '', logoUrl: '', navLinks: [], navLinkColor: '#ffffff', logoHeight: 36 },
  EditorForm,
  Render,
};
