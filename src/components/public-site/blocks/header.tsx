import { useEffect, useState } from 'react';
import { z } from 'zod';
import { LayoutPanelTop, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { SignInDialog } from '@/components/auth/SignInDialog';
import { EditableText } from '../EditableText';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

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

// Site name, logo size, and menu links. Logo image + theme colors/font moved
// to Workspace Settings → Branding (single source of truth); a stale
// `logoUrl` is a per-header override for the branding logo (a dark header
// may need a white version); empty falls back to branding.
const schema = z.object({
  siteName: z.string().default(''),
  // Off = no name text in the bar at all (logo + nav only). The override
  // above still applies when on. Kevin, 2026-08-12: a page must be able to
  // drop the site name from its header entirely.
  showSiteName: z.boolean().default(true),
  // Nav link presence. Default matches the historical look; 'lg' +
  // 'semibold' is the bigger-and-bolder treatment (Kevin, 2026-08-12).
  navSize: z.enum(['sm', 'base', 'lg']).default('sm'),
  navWeight: z.enum(['normal', 'semibold']).default('normal'),
  // 'wide' opens up the gaps + adds tracking — pairs with small/semibold
  // for the compact-but-confident look (Kevin, 2026-08-12).
  navSpacing: z.enum(['normal', 'wide']).default('normal'),
  // Live countdown chip ("The Concert · 66d 12h 04m 09s"). Empty = off.
  // Hidden automatically once the moment passes.
  countdownTo: z.string().default(''),
  countdownLabel: z.string().default(''),
  countdownUrl: z.string().default(''),
  logoUrl: z.string().default('').optional(),
  navLinks: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
  navLinkColor: z.string().default('#ffffff'),
  // Optional manual override for the header text color (site name + nav).
  // Wins over the auto-derived black/white pick from readableForeground.
  // Absent = auto contrast against the current primary color.
  siteNameColor: z.string().optional(),
  // Logo height in pixels; width auto-scales to maintain aspect.
  logoHeight: z.number().int().min(20).max(120).default(36),
  // Optional manual header bar height. When set, wins over the auto-
  // derived Math.max(72, logoHeight + 16). Absent = auto so the bar
  // grows with the logo. Range keeps it usable but bounded.
  headerHeight: z.number().int().min(48).max(160).optional(),
});
type Config = z.infer<typeof schema>;

// Pick black or white based on the primary color's perceived luminance so the
// header text is always readable. We deliberately override any stored
// navLinkColor — letting users pick caused white-on-white headers before.
function readableForeground(hex: string): string {
  const h = (hex || '').replace('#', '').trim();
  if (h.length !== 6) return '#ffffff';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#0f172a' : '#ffffff';
}

/** Live countdown chip. Ticks every second; renders nothing once passed. */
function CountdownChip({ to, label, url, color }: { to: string; label: string; url: string; color: string }) {
  const target = Date.parse(to);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = target - now;
  if (!Number.isFinite(target) || diff <= 0) return null;
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const two = (n: number) => String(n).padStart(2, '0');
  const body = (
    <>
      {label && <span className="font-semibold">{label}</span>}
      <span className="tabular-nums font-medium" aria-label={`${d} days ${h} hours ${m} minutes ${s} seconds`}>
        {d}d {two(h)}h {two(m)}m {two(s)}s
      </span>
    </>
  );
  const cls = 'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs whitespace-nowrap';
  const style = { color, borderColor: 'currentcolor', opacity: 0.95 } as React.CSSProperties;
  return url
    ? <a href={url} className={`${cls} hover:opacity-100`} style={style}>{body}</a>
    : <span className={cls} style={style}>{body}</span>;
}

function Render({ config, ctx, onConfigChange }: BlockRenderProps<Config>) {
  const editable = !!onConfigChange;
  const name = config.showSiteName === false ? '' : (config.siteName || ctx.orgName);
  // Per-header logo override — branding stays the canonical mark (internal
  // chrome, favicon), but a dark public header may need e.g. a white
  // version (Kevin, 2026-08-12: the white logo set in Branding vanished on
  // the light internal header). Empty = branding logo, as before.
  const logo = config.logoUrl || ctx.logoUrl;
  // Auto-picks black or white for contrast against the primary; user can
  // override via config.siteNameColor if they want a specific brand shade.
  const linkColor = (config.siteNameColor && /^#[0-9a-fA-F]{6}$/.test(config.siteNameColor))
    ? config.siteNameColor
    : readableForeground(ctx.theme?.primaryColor || '#0f172a');
  const logoHeight = config.logoHeight || 36;
  // Manual override wins; otherwise auto-derive as logo + 32px breathing
  // room with a 72px floor (was 56 — that looked cramped on desktop).
  const barHeight = typeof config.headerHeight === 'number'
    ? Math.max(48, Math.min(160, config.headerHeight))
    : Math.max(72, logoHeight + 32);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  // Auto-close the mobile menu if the viewport grows past the sm breakpoint so
  // a re-resize doesn't leave a stale open panel.
  useEffect(() => {
    if (!menuOpen) return;
    const mql = window.matchMedia('(min-width: 640px)');
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setMenuOpen(false); };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [menuOpen]);

  const hasLinks = config.navLinks.length > 0 || ctx.memberSignIn;
  const countdownActive = !!config.countdownTo && !Number.isNaN(Date.parse(config.countdownTo));
  const navSizeClass = config.navSize === 'lg' ? 'text-lg' : config.navSize === 'base' ? 'text-base' : 'text-sm';
  const navWeightClass = config.navWeight === 'semibold' ? 'font-semibold' : '';
  const navSpacingClass = config.navSpacing === 'wide' ? 'gap-8 tracking-wide' : 'gap-4';
  const navInline = (
    <>
      {config.navLinks.map((l, i) => (
        <a
          key={i}
          href={l.url}
          onClick={() => setMenuOpen(false)}
          className="whitespace-nowrap opacity-80 hover:opacity-100 transition-opacity"
          style={{ color: linkColor }}
        >
          {l.label}
        </a>
      ))}
      {ctx.memberSignIn && (
        <a
          href="/auth"
          onClick={() => setMenuOpen(false)}
          className="rounded-full px-3 py-1 whitespace-nowrap border opacity-90 hover:opacity-100 hover:bg-white/10 transition-opacity text-sm inline-flex items-center"
          style={{ color: linkColor, borderColor: linkColor + '4d' }}
        >
          Sign in
        </a>
      )}
    </>
  );

  return (
    <header
      // Header fills its content-column bounds edge-to-edge, same footprint
      // as the hero and every other block. Colored bar IS the outer
      // <header>; nav content is padded from inside — hence the flush
      // variant, which takes the column width without the gutter. Below the
      // column width margin-inline:auto degrades to full-width so header,
      // hero, and sections all hit the viewport edges together — consistent
      // widths from mobile through desktop, per the sizing rule. Width comes
      // from --site-content-max (Site design panel), not a fixed 1152.
      // Full-bleed bar, contained content — the bar's background spans the
      // viewport like the section bands do, while logo/nav sit on the same
      // .gw-container column as every section (Kevin, 2026-08-13: a
      // content-width bar floated as a box aligned with nothing).
      className="sticky top-0 z-40 w-full"
      style={{ paddingTop: 'env(safe-area-inset-top)', color: linkColor, background: 'var(--site-primary)' }}
    >
      <div
        className="gw-container flex items-center justify-between gap-4"
        style={{ height: barHeight }}
      >
        {/* In the editor, unwrap the <a href="#top"> so clicking the site
            name places a caret instead of jump-scrolling. The placeholder is
            the tenant's Branding `orgName` — makes the "leave blank to use
            our org name" behavior visible. */}
        {editable ? (
          <div className="flex items-center gap-3 min-w-0">
            {logo && (
              <img
                src={logo}
                alt=""
                className="w-auto object-contain"
                style={{ height: logoHeight }}
                onError={(e) => { (e.currentTarget.style.display = 'none'); }}
              />
            )}
            {/* Toggle respected here too — "I turned off site name but it's
                still there" (Kevin, 2026-08-12) was this branch ignoring it.
                Re-enable from the settings sheet, not the canvas. */}
            {config.showSiteName !== false && (
              <EditableText
                as="span"
                editable
                value={config.siteName}
                onChange={(v) => onConfigChange?.({ siteName: v } as Partial<Config>)}
                placeholder={ctx.orgName}
                ariaLabel="Site name"
                className="font-bold text-base cq-sm:text-lg truncate"
                // Inline like the nav links: the global .bg-card/.bg-muted span
                // contrast guards match this span directly and beat the color
                // inherited from <header>.
                style={{ color: linkColor }}
              />
            )}
          </div>
        ) : (
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
            {name && (
              <span className="font-bold text-base cq-sm:text-lg truncate" style={{ color: linkColor }}>{name}</span>
            )}
          </a>
        )}
        {/* Desktop: inline links. Mobile: a hamburger that toggles the dropdown below. */}
        {countdownActive && (
          <span className="hidden cq-sm:flex flex-1 justify-center px-3">
            <CountdownChip to={config.countdownTo} label={config.countdownLabel} url={config.countdownUrl} color={linkColor} />
          </span>
        )}
        <nav className={`hidden cq-sm:flex items-center ${navSpacingClass} ${navSizeClass} ${navWeightClass}`}>{navInline}</nav>
        {hasLinks && (
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="cq-sm:hidden inline-flex items-center justify-center w-11 h-11 rounded-md hover:bg-white/10 transition-colors"
            style={{ color: linkColor }}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        )}
      </div>
      {/* Mobile dropdown: floats over the hero (no content pushed down) on a
          plain white background. Link color always dark-on-white here, since
          the dropdown's background is fixed regardless of the theme primary. */}
      {/* Phones: the bar has no room, so the chip gets its own strip. */}
      {countdownActive && (
        <div className="cq-sm:hidden flex justify-center pb-2">
          <CountdownChip to={config.countdownTo} label={config.countdownLabel} url={config.countdownUrl} color={linkColor} />
        </div>
      )}
      {hasLinks && menuOpen && (
        <div
          className="cq-sm:hidden absolute left-0 right-0 top-full bg-white shadow-lg border-t border-slate-200"
          style={{ color: '#0f172a' }}
        >
          <nav className="px-4 py-3 flex flex-col gap-1">
            {config.navLinks.map((l, i) => (
              <a
                key={i}
                href={l.url}
                onClick={() => setMenuOpen(false)}
                className={`py-2 px-2 rounded text-base text-slate-900 hover:bg-slate-100 transition-colors ${navWeightClass}`}
              >
                {l.label}
              </a>
            ))}
            {ctx.memberSignIn && (
              <a
                href="/auth"
                onClick={() => setMenuOpen(false)}
                className="py-2 px-2 rounded text-base text-slate-900 hover:bg-slate-100 transition-colors border-t border-slate-200 mt-1 pt-3 text-left"
              >
                Sign in
              </a>
            )}
          </nav>
        </div>
      )}
      <SignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        primaryColor={ctx.theme?.primaryColor}
        primaryForeground={linkColor}
      />
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
        <div className="flex items-center justify-between gap-3">
          <Label>Site name</Label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={config.showSiteName !== false}
              onChange={(e) => set({ showSiteName: e.target.checked })}
            />
            Show in header
          </label>
        </div>
        <Input
          value={config.siteName}
          onChange={(e) => set({ siteName: e.target.value })}
          placeholder="Your organization"
          disabled={config.showSiteName === false}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Logo override (optional)</Label>
        <Input
          value={config.logoUrl ?? ''}
          onChange={(e) => set({ logoUrl: e.target.value })}
          placeholder="Image URL — e.g. a white logo for a dark header"
        />
        <p className="text-xs text-muted-foreground">Empty uses your Branding logo. This only changes this header.</p>
      </div>
      <div className="space-y-1.5">
        <Label>Countdown (optional)</Label>
        <Input
          type="datetime-local"
          value={config.countdownTo ? config.countdownTo.slice(0, 16) : ''}
          onChange={(e) => set({ countdownTo: e.target.value ? new Date(e.target.value).toISOString() : '' })}
        />
        <Input
          value={config.countdownLabel}
          onChange={(e) => set({ countdownLabel: e.target.value })}
          placeholder="Label, e.g. The Concert"
        />
        <Input
          value={config.countdownUrl}
          onChange={(e) => set({ countdownUrl: e.target.value })}
          placeholder="Link, e.g. /retirement (optional)"
        />
        <p className="text-xs text-muted-foreground">Shows a live countdown in the header until the moment arrives, then disappears.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm">Nav size</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={config.navSize}
            onChange={(e) => set({ navSize: e.target.value as Config['navSize'] })}
          >
            <option value="sm">Small</option>
            <option value="base">Medium</option>
            <option value="lg">Large</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Nav weight</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={config.navWeight}
            onChange={(e) => set({ navWeight: e.target.value as Config['navWeight'] })}
          >
            <option value="normal">Normal</option>
            <option value="semibold">Bold</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Nav spacing</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={config.navSpacing}
            onChange={(e) => set({ navSpacing: e.target.value as Config['navSpacing'] })}
          >
            <option value="normal">Normal</option>
            <option value="wide">Wide</option>
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm">Text color (site name + nav)</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={config.siteNameColor || '#ffffff'}
              onChange={(e) => set({ siteNameColor: e.target.value })}
              className="h-8 w-10 rounded border cursor-pointer"
              title="Header text color"
            />
            <button
              type="button"
              onClick={() => set({ siteNameColor: undefined })}
              disabled={!config.siteNameColor}
              className="text-xs font-medium text-sky-600 hover:text-sky-700 disabled:text-slate-400"
              title="Clear override — auto black/white based on primary color"
            >
              Auto
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Leave on <strong>Auto</strong> for guaranteed contrast against your primary color, or pick a brand shade.
        </p>
      </div>
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
        <p className="text-xs text-slate-500">
          Logo image, brand colors, and font live in <strong>Workspace Settings → Branding</strong>.
        </p>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm">Header height</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 tabular-nums">
              {config.headerHeight ?? Math.max(72, (config.logoHeight || 36) + 32)}px
            </span>
            <button
              type="button"
              onClick={() => set({ headerHeight: undefined })}
              disabled={config.headerHeight === undefined}
              className="text-xs font-medium text-sky-600 hover:text-sky-700 disabled:text-slate-400"
              title="Clear override — auto-scale with logo"
            >
              Auto
            </button>
          </div>
        </div>
        <input
          type="range"
          min={48}
          max={160}
          step={2}
          value={config.headerHeight ?? Math.max(72, (config.logoHeight || 36) + 32)}
          onChange={(e) => set({ headerHeight: Number(e.target.value) })}
          className="w-full accent-sky-600"
        />
        <p className="text-xs text-slate-500">
          Bar height in pixels. <strong>Auto</strong> derives it from the logo size (~logo + 32px), with a 72px floor.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Menu links</Label>
        <p className="text-sm text-slate-500">
          Text color is picked automatically (black or white) to stay readable on your primary color.
        </p>
        {config.navLinks.length > 0 && (
          <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5 text-xs uppercase tracking-wide text-slate-500 px-1">
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
  defaultConfig: { siteName: '', navLinks: [], navLinkColor: '#ffffff', logoHeight: 36 },
  EditorForm,
  Render,
};
