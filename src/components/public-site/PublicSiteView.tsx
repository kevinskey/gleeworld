// Renders a published site payload (from get_public_site). Shared by the
// /sites/:slug route and the tenant root landing when a site is published.
import { useEffect, useMemo } from 'react';
import { BLOCK_REGISTRY, isBlockAvailable } from './registry';
import { fontStack, safeConfig, themeSchema, type SiteBlock, type SiteRenderContext } from './types';

export interface PublicSitePayload {
  slug: string;
  theme: Record<string, unknown>;
  blocks: SiteBlock[];
  published_at: string;
  org_name: string | null;
  logo_url: string | null;
  tagline: string | null;
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
}: {
  data: PublicSitePayload;
  slug: string;
  memberSignIn?: boolean;
}) {
  const theme = useMemo(() => {
    const parsed = themeSchema.safeParse(data.theme ?? {});
    return parsed.success ? parsed.data : themeSchema.parse({});
  }, [data.theme]);

  const ctx: SiteRenderContext = useMemo(
    () => ({
      slug,
      theme,
      orgName: data.org_name || 'Our Choir',
      logoUrl: data.logo_url || null,
      isPreview: false,
      activeAddons: data.active_addons ?? [],
      memberSignIn,
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
    // Tab favicon follows the tenant's logo. Header block.config.logoUrl wins
    // when set (lets a tenant pick a different mark for the tab), otherwise we
    // fall back to gw_branding_settings.logo_url. Falls through to the
    // platform default if neither is present.
    const headerBlock = (data.blocks ?? []).find((b) => b.block_type === 'header');
    const faviconUrl = (headerBlock?.config?.logoUrl as string | undefined) || data.logo_url;
    const restore = faviconUrl ? setFavicon(faviconUrl) : null;
    return () => { restore?.(); };
  }, [data, slug]);

  const blocks = [...(data.blocks ?? [])].sort((a, b) => a.position - b.position);

  return (
    <div
      className="min-h-screen bg-white text-slate-900"
      style={{
        ['--site-primary' as string]: theme.primaryColor,
        ['--site-accent' as string]: theme.accentColor,
        fontFamily: fontStack(theme.fontFamily),
        letterSpacing: `${theme.letterSpacing ?? 0}em`,
      }}
    >
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
