// Renders a published site payload (from get_public_site). Shared by the
// /sites/:slug route and the tenant root landing when a site is published.
import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BLOCK_REGISTRY, isBlockAvailable } from './registry';
import { blockPage, fontStack, safeConfig, themeCssVars, themeSchema, type SiteBlock, type SiteRenderContext } from './types';
import { StoreOrderConfirmation } from './StoreOrderConfirmation';

// Decorative piano-key gutter. When the viewport is wider than the content
// column the side margins are otherwise blank white; fill each with a tiny
// black-and-white keyboard running the full height (Kevin, 2026-10-21). The
// tile is 7 octaves of 7 white keys (=49), so the 5-black-key pattern repeats
// seamlessly. `side` is which gutter it fills: black keys sit on the INNER
// edge (facing the content) — the right edge of the left gutter, and vice
// versa. Returns a ready-to-use CSS url() with the SVG inlined.
function pianoGutterImage(side: 'left' | 'right'): string {
  // Real-piano proportions: a black key spans ~half a white key's pitch
  // (bh) and reaches ~60% of the white key's length inward (bw). Keeping bh
  // well under one unit leaves a clear white gap between adjacent black keys,
  // so the 2-then-3 grouping reads instead of merging into solid bars.
  const H = 784, unit = H / 49, W = 100, bw = 58, bh = unit * 0.5;
  const bx = side === 'left' ? W - bw : 0; // black keys on the inner edge
  let seps = '';
  let blacks = '';
  for (let k = 0; k < 49; k++) {
    if (k > 0) {
      const y = (k * unit).toFixed(2);
      seps += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#d2d2d2" stroke-width="0.8"/>`;
    }
    const deg = k % 7; // 0..6 = C D E F G A B; black keys after C,D,F,G,A
    if (deg === 1 || deg === 2 || deg === 4 || deg === 5 || deg === 6) {
      const y = (k * unit - bh / 2).toFixed(2);
      blacks += `<rect x="${bx}" y="${y}" width="${bw}" height="${bh.toFixed(2)}" rx="1.5" fill="#161616"/>`;
    }
  }
  const edgeX = side === 'left' ? W : 0; // divider line against the content
  const edge = `<line x1="${edgeX}" y1="0" x2="${edgeX}" y2="${H}" stroke="#bdbdbd" stroke-width="1.5"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><rect width="${W}" height="${H}" fill="#fcfcfc"/>${seps}${blacks}${edge}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export interface PublicSitePayload {
  slug: string;
  theme: Record<string, unknown>;
  blocks: SiteBlock[];
  published_at: string;
  org_name: string | null;
  logo_url: string | null;
  tagline: string | null;
  /** Branding-owned theme fields. Overlay these on top of `theme` so branding
   *  wins for the palette + font, while `theme` keeps package/radius/etc. */
  primary_color: string | null;
  accent_color: string | null;
  font_family: string | null;
  letter_spacing: number | null;
  soundcloud_url: string | null;
  active_addons: string[];
}

function setMeta(name: string, content: string, property = false) {
  const attr = property ? 'property' : 'name';
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

// Per-tenant favicon: point every <link rel="icon"> to the tenant's logo so
// the browser tab shows their brand instead of the platform default. Adds a
// fresh tagged link if none exists. Returns a restore function that puts the
// default favicon back when the user navigates away from the public site.
function setFavicon(url: string): () => void {
  const head = document.head;
  const existing = Array.from(head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
  const previous = existing.map((el) => ({ el, href: el.href, type: el.type, sizes: el.getAttribute('sizes') }));
  existing.forEach((el) => { el.href = url; el.type = url.endsWith('.svg') ? 'image/svg+xml' : 'image/png'; });
  let added: HTMLLinkElement | null = null;
  if (existing.length === 0) {
    added = document.createElement('link');
    added.rel = 'icon';
    added.type = url.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
    added.href = url;
    head.appendChild(added);
  }
  return () => {
    previous.forEach(({ el, href, type, sizes }) => {
      el.href = href;
      el.type = type;
      if (sizes) el.setAttribute('sizes', sizes);
    });
    if (added) head.removeChild(added);
  };
}

export function PublicSiteView({
  data,
  slug,
  memberSignIn = false,
  page = 'home',
  pageHref,
}: {
  data: PublicSitePayload;
  slug: string;
  memberSignIn?: boolean;
  /** Which page of the site to render. Legacy snapshots are all 'home'. */
  page?: string;
  /** Builds the app route for a sibling page (for the #rsvp QR redirect). */
  pageHref?: (page: string) => string;
}) {
  const navigate = useNavigate();
  const theme = useMemo(() => {
    const parsed = themeSchema.safeParse(data.theme ?? {});
    const base = parsed.success ? parsed.data : themeSchema.parse({});
    // Branding owns palette + font; page theme still owns package/radius/etc.
    // Empty-string values in branding fall through to the stored theme (which
    // itself defaults from the schema).
    return {
      ...base,
      primaryColor: data.primary_color || base.primaryColor,
      accentColor: data.accent_color || base.accentColor,
      fontFamily: data.font_family || base.fontFamily,
      letterSpacing: data.letter_spacing ?? base.letterSpacing,
    };
  }, [data.theme, data.primary_color, data.accent_color, data.font_family, data.letter_spacing]);

  const ctx: SiteRenderContext = useMemo(
    () => ({
      slug,
      theme,
      orgName: data.org_name || 'Our Choir',
      logoUrl: data.logo_url || null,
      isPreview: false,
      activeAddons: data.active_addons ?? [],
      memberSignIn,
      soundcloudUrl: data.soundcloud_url || null,
    }),
    [slug, theme, data, memberSignIn],
  );

  useEffect(() => {
    document.title = data.org_name || slug;
    setMeta('description', data.tagline || `${data.org_name || slug} — events, music, and more.`);
    setMeta('og:title', data.org_name || slug, true);
    const hero = (data.blocks ?? []).find((b) => b.block_type === 'hero');
    const ogImage = (hero?.config?.imageUrl as string) || data.logo_url;
    if (ogImage) setMeta('og:image', ogImage, true);
    // Tab favicon follows the tenant's branding logo. (Header block used to
    // carry its own logoUrl override; that was moved to Branding so branding
    // is the single source of truth for the mark.)
    const faviconUrl = data.logo_url;
    const restore = faviconUrl ? setFavicon(faviconUrl) : null;
    return () => { restore?.(); };
  }, [data, slug]);

  const blocks = [...(data.blocks ?? [])]
    .filter((b) => blockPage(b) === page)
    .sort((a, b) => a.position - b.position);

  // Printed-QR back-compat: flyers link to /#rsvp from when the RSVP block
  // lived on the home page. If this page has no rsvp block but a sibling
  // page does, forward the visitor there with the hash intact.
  useEffect(() => {
    if (window.location.hash !== '#rsvp') return;
    if (blocks.some((b) => b.block_type === 'concert-rsvp')) return;
    const target = (data.blocks ?? []).find(
      (b) => b.block_type === 'concert-rsvp' && b.is_visible && blockPage(b) !== page,
    );
    if (target && pageHref) {
      navigate(`${pageHref(blockPage(target))}#rsvp`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.blocks, page]);

  // Store checkout success (Tenant Store add-on, Task 3): store-checkout's
  // success_url redirects here with `?order=&t=`. Purely a display
  // concern — see StoreOrderConfirmation for the token-gated status lookup.
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order');
  const orderToken = searchParams.get('t');

  return (
    <div
      className="gw-site min-h-screen bg-white text-slate-900"
      style={{
        ...themeCssVars(theme),
        fontFamily: fontStack(theme.fontFamily),
        letterSpacing: `${theme.letterSpacing ?? 0}em`,
      } as React.CSSProperties}
    >
      {/* Package tokens applied globally under .gw-site. Headings inherit
          the package's heading font (which is often distinct from the body
          font in Institutional / Modern); every non-hero section picks up
          the package's vertical rhythm so switching packages feels like a
          real shape change and not just a color swap. */}
      <style>{`
        .gw-site h1, .gw-site h2, .gw-site h3, .gw-site h4 { font-family: var(--site-heading-font); }
        .gw-site > section:not(#top),
        .gw-site > footer { padding-top: var(--site-section-py); padding-bottom: var(--site-section-py); }
      `}</style>
      {/* Piano-key gutters. Fixed, full-height, one per side; `width` collapses
          to 0 at or below the content width, so phones/tablets never see them.
          pointer-events:none so the empty margin stays click-through. */}
      <div aria-hidden className="gw-piano-gutter" style={{ left: 0, backgroundImage: pianoGutterImage('left') }} />
      <div aria-hidden className="gw-piano-gutter" style={{ right: 0, backgroundImage: pianoGutterImage('right') }} />
      {orderId && orderToken && <StoreOrderConfirmation order={orderId} token={orderToken} />}
      {blocks.map((block) => {
        const mod = BLOCK_REGISTRY[block.block_type];
        if (!mod || !block.is_visible) return null;
        if (!isBlockAvailable(mod, ctx.activeAddons)) return null;
        const Render = mod.Render;
        return <Render key={block.id} config={safeConfig(mod, block.config)} ctx={ctx} />;
      })}
    </div>
  );
}
