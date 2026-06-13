// Renders a published site payload (from get_public_site). Shared by the
// /sites/:slug route and the tenant root landing when a site is published.
import { useEffect, useMemo } from 'react';
import { BLOCK_REGISTRY, isBlockAvailable } from './registry';
import { safeConfig, themeSchema, type SiteBlock, type SiteRenderContext } from './types';

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
  }, [data, slug]);

  const blocks = [...(data.blocks ?? [])].sort((a, b) => a.position - b.position);

  return (
    <div
      className={`min-h-screen bg-white text-slate-900 ${theme.fontFamily === 'serif' ? 'font-serif' : 'font-sans'}`}
      style={{
        ['--site-primary' as string]: theme.primaryColor,
        ['--site-accent' as string]: theme.accentColor,
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
