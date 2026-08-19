import { z } from 'zod';
import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';

export const themeSchema = z.object({
  primaryColor: z.string().default('#0f172a'),
  accentColor: z.string().default('#9333ea'),
  // Free-form string keyed against FONT_OPTIONS below. Legacy values 'sans'
  // and 'serif' are still honored. This is the BODY font; headings can opt
  // to a different family via headingFontFamily.
  fontFamily: z.string().default('sans'),
  /** Optional heading font. When unset, headings inherit fontFamily. */
  headingFontFamily: z.string().optional(),
  // Letter-spacing in em units. Applied to the root site wrapper; individual
  // block text inherits unless it explicitly overrides.
  letterSpacing: z.number().min(-0.05).max(0.3).default(0),
  /**
   * Which template package this site was seeded from. Purely informational
   * for the editor's "You're using the {X} look" state; the actual visual
   * behavior comes from the token values below. `custom` = user tweaked
   * theme after seeding.
   */
  package: z.enum(['modern', 'institutional', 'minimalist', 'elegant', 'bold', 'custom']).default('custom'),
  /**
   * Corner radius scale for cards, images, buttons. Maps to CSS via
   * --site-radius. Modern = round, Institutional = sharp, Minimalist = sharp.
   */
  radiusScale: z.enum(['sharp', 'soft', 'round']).default('soft'),
  /**
   * Vertical padding scale for content sections. Maps to CSS via
   * --site-section-py. Institutional = tight, Modern = generous,
   * Minimalist = spacious.
   */
  sectionPaddingScale: z.enum(['tight', 'normal', 'generous', 'spacious']).default('normal'),
  /**
   * Divider treatment between sections. Institutional draws a hairline
   * rule; Modern/Minimalist rely on whitespace alone.
   */
  dividerStyle: z.enum(['none', 'rule']).default('none'),
  /**
   * Max width of the centered content column, via --site-content-max. Every
   * block's wrapper reads it, so header through footer stay aligned — that
   * uniformity is the whole point and is why this is a site token rather
   * than a per-block setting. `normal` (72rem) reproduces the max-w-6xl that
   * was hardcoded in all 22 blocks before this existed.
   */
  contentWidth: z.enum(['narrow', 'normal', 'wide', 'full']).default('normal'),
  /**
   * Horizontal gutter between the content column and the viewport edge, via
   * --site-gutter. Kept separate from contentWidth because a full-width site
   * still needs breathing room at the edges.
   */
  sideGutter: z.enum(['none', 'snug', 'normal', 'roomy']).default('normal'),
  /**
   * Multiplier on body text size, via --site-font-scale. 1 = the sizes the
   * blocks were authored at.
   */
  fontScale: z.number().min(0.85).max(1.4).default(1),
});
export type SiteTheme = z.infer<typeof themeSchema>;

/** CSS variable values keyed by theme token, emitted on the site root. */
export const RADIUS_PX: Record<SiteTheme['radiusScale'], string> = {
  sharp: '0px',
  soft: '12px',
  round: '20px',
};
export const SECTION_PY_REM: Record<SiteTheme['sectionPaddingScale'], string> = {
  tight: '1.25rem',
  normal: '1.5rem',
  generous: '3rem',
  spacious: '4.5rem',
};
/** Content column max-width. `normal` = 72rem = the old hardcoded max-w-6xl. */
export const CONTENT_MAX: Record<SiteTheme['contentWidth'], string> = {
  narrow: '60rem',
  normal: '72rem',
  wide: '87.5rem',
  full: '100%',
};
/** Gutter between the content column and the viewport edge. `normal` = the
 *  old hardcoded px-4 (sm:px-6 came along with it; the clamp keeps that
 *  same "a bit wider once there's room" behavior without a media query). */
export const SIDE_GUTTER: Record<SiteTheme['sideGutter'], string> = {
  none: '0rem',
  snug: '0.75rem',
  normal: 'clamp(1rem, 4vw, 1.5rem)',
  roomy: 'clamp(1.5rem, 6vw, 3rem)',
};

/**
 * Pick black or white text for a background, by YIQ luminance. Same threshold
 * as TenantThemeRoot's derivation for the app tokens, so a block sitting on
 * --site-accent and a button sitting on --accent agree with each other.
 *
 * This matters because the accent is tenant-chosen: a dark navy needs white
 * text and a pale gold needs near-black, and only one of those can be
 * hardcoded correctly.
 */
export function yiqForeground(hex: string): string {
  const h = (hex || '').replace('#', '').trim();
  if (h.length !== 6) return '#ffffff';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return '#ffffff';
  return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? '#0f172a' : '#ffffff';
}

/** Return the CSS custom properties a package/theme wants on the site root. */
export function themeCssVars(theme: SiteTheme): Record<string, string> {
  return {
    '--site-primary': theme.primaryColor,
    '--site-accent': theme.accentColor,
    '--site-primary-foreground': yiqForeground(theme.primaryColor),
    '--site-accent-foreground': yiqForeground(theme.accentColor),
    '--site-radius': RADIUS_PX[theme.radiusScale],
    '--site-section-py': SECTION_PY_REM[theme.sectionPaddingScale],
    '--site-content-max': CONTENT_MAX[theme.contentWidth],
    '--site-gutter': SIDE_GUTTER[theme.sideGutter],
    '--site-font-scale': String(theme.fontScale),
    '--site-heading-font': theme.headingFontFamily
      ? fontStack(theme.headingFontFamily)
      : fontStack(theme.fontFamily),
  };
}

/** Curated font list for the public site builder. Each entry maps a stored
 *  key to a CSS font-family stack. New keys can be added freely; old ones
 *  must never be removed (or stored values would silently fall back). */
export const FONT_OPTIONS: { value: string; label: string; css: string }[] = [
  { value: 'sans', label: 'Sans (system)', css: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { value: 'serif', label: 'Serif (system)', css: 'Georgia, "Times New Roman", serif' },
  { value: 'lato', label: 'Lato', css: '"Lato", system-ui, sans-serif' },
  { value: 'open-sans', label: 'Open Sans', css: '"Open Sans", system-ui, sans-serif' },
  { value: 'roboto', label: 'Roboto', css: '"Roboto", system-ui, sans-serif' },
  { value: 'montserrat', label: 'Montserrat', css: '"Montserrat", system-ui, sans-serif' },
  { value: 'poppins', label: 'Poppins', css: '"Poppins", system-ui, sans-serif' },
  { value: 'raleway', label: 'Raleway', css: '"Raleway", system-ui, sans-serif' },
  { value: 'oswald', label: 'Oswald', css: '"Oswald", Impact, sans-serif' },
  { value: 'bebas-neue', label: 'Bebas Neue', css: '"Bebas Neue", Impact, sans-serif' },
  { value: 'playfair', label: 'Playfair Display', css: '"Playfair Display", Georgia, serif' },
  { value: 'merriweather', label: 'Merriweather', css: '"Merriweather", Georgia, serif' },
  { value: 'cormorant', label: 'Cormorant Garamond', css: '"Cormorant Garamond", Georgia, serif' },
  { value: 'libre-baskerville', label: 'Libre Baskerville', css: '"Libre Baskerville", Georgia, serif' },
  { value: 'cinzel', label: 'Cinzel', css: '"Cinzel", Georgia, serif' },
  { value: 'dancing-script', label: 'Dancing Script', css: '"Dancing Script", cursive' },
  { value: 'great-vibes', label: 'Great Vibes', css: '"Great Vibes", cursive' },
];

export function fontStack(value: string | undefined): string {
  const opt = FONT_OPTIONS.find((o) => o.value === value);
  return opt?.css ?? FONT_OPTIONS[0].css;
}

// A block row as stored in gw_site_blocks (and snapshotted into published_blocks).
export interface SiteBlock {
  id: string;
  block_type: string;
  position: number;
  config: Record<string, unknown>;
  is_visible: boolean;
  /** Page slug this block belongs to. Absent (legacy snapshots) = 'home'. */
  page?: string;
}

/** Page slug of a block; legacy blocks (pre-pages snapshots) are home. */
export function blockPage(b: Pick<SiteBlock, 'page'>): string {
  return b.page || 'home';
}

/** Distinct page slugs present in a block list, home first. */
export function sitePages(blocks: Array<Pick<SiteBlock, 'page'>>): string[] {
  const pages = new Set<string>(['home']);
  for (const b of blocks) pages.add(blockPage(b));
  return ['home', ...[...pages].filter((p) => p !== 'home').sort()];
}

// Context handed to every block render. isPreview = editor preview (admin
// session, draft data, tenant-scoped queries); otherwise the public /sites/:slug
// page (anon, published snapshot + RPCs only).
export interface SiteRenderContext {
  /** True when this block renders as a Columns child — the column already
   *  provides the container/gutter, so the block must not add its own
   *  (double-gutter misalignment, Kevin 2026-08-13). */
  inColumn?: boolean;
  slug: string;
  theme: SiteTheme;
  orgName: string;
  logoUrl: string | null;
  isPreview: boolean;
  activeAddons: string[];
  /** Show a member sign-in link (set when the site renders on the tenant's own domain). */
  memberSignIn?: boolean;
  /** The tenant's public SoundCloud profile (branding.soundcloud_url). The
   *  `soundcloud` block reads it from here rather than holding a copy, so
   *  setting it once in Branding lights up the block with no per-block
   *  setup — and leaving it blank renders nothing. */
  soundcloudUrl?: string | null;
}

export interface BlockRenderProps<C = Record<string, unknown>> {
  config: C;
  ctx: SiteRenderContext;
  /**
   * Only set when the block is rendered inside the editor's live preview.
   * Lets the block surface interactive editing affordances (e.g. drag the
   * hero text to reposition it) and persist the change via the same path
   * as the editor form. Undefined on the public site.
   */
  onConfigChange?: (patch: Partial<C>) => void;
}

export interface BlockEditorFormProps<C = Record<string, unknown>> {
  config: C;
  onChange: (config: C) => void;
  /** Site-level theme (colors/font). Some blocks (Header) surface these inline. */
  theme?: SiteTheme;
  onThemeChange?: (patch: Partial<SiteTheme>) => void;
}

export interface BlockModule<S extends z.ZodTypeAny = z.ZodTypeAny> {
  type: string;
  name: string;
  description: string;
  icon: LucideIcon;
  tier: 'free' | 'addon';
  /** gw_billing_modules.id that must be active for this block */
  requiredAddon?: string;
  /**
   * Human-readable name of the admin module that powers this public block.
   * Shown in the block picker as "Powered by …". Internal Control Center
   * surfaces keep using the module's technical name.
   */
  poweredBy?: string;
  /** Group used by the block picker to organize options. */
  group?: 'core' | 'addon' | 'gleeworld';
  /**
   * Restrict this block to specific tenant slugs. Absent = offered to every
   * tenant. This gates the block PICKER only: a block already placed on a
   * page still renders everywhere, so a slug change can't blank a live site.
   */
  tenants?: string[];
  /** Locked blocks pin to position 0 and can't be hidden or deleted (header). */
  locked?: boolean;
  configSchema: S;
  defaultConfig: z.infer<S>;
  /** Custom settings form; falls back to the generic zod-driven AutoForm. */
  EditorForm?: ComponentType<BlockEditorFormProps<z.infer<S>>>;
  Render: ComponentType<BlockRenderProps<z.infer<S>>>;
}

/** Parse a stored config against the block schema, falling back to defaults per field. */
export function safeConfig<S extends z.ZodTypeAny>(mod: BlockModule<S>, raw: unknown): z.infer<S> {
  const parsed = mod.configSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return mod.configSchema.parse(mod.defaultConfig);
}
