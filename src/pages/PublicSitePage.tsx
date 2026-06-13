// Public tenant site at /sites/:slug. Anonymous-safe: everything comes from
// the get_public_site RPC (published snapshot only) — never from draft tables.
import { useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BLOCK_REGISTRY, isBlockAvailable } from '@/components/public-site/registry';
import { safeConfig, themeSchema, type SiteBlock, type SiteRenderContext } from '@/components/public-site/types';

interface PublicSitePayload {
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

export default function PublicSitePage() {
  const { slug = '' } = useParams<{ slug: string }>();

  const { data, isLoading } = useQuery<PublicSitePayload | null>({
    queryKey: ['public-site', slug],
    enabled: slug.length >= 3,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_site', { p_slug: slug });
      if (error) throw error;
      return (data as PublicSitePayload) ?? null;
    },
  });

  const theme = useMemo(() => {
    const parsed = themeSchema.safeParse(data?.theme ?? {});
    return parsed.success ? parsed.data : themeSchema.parse({});
  }, [data?.theme]);

  const ctx: SiteRenderContext = useMemo(
    () => ({
      slug,
      theme,
      orgName: data?.org_name || 'Our Choir',
      logoUrl: data?.logo_url || null,
      isPreview: false,
      activeAddons: data?.active_addons ?? [],
    }),
    [slug, theme, data],
  );

  useEffect(() => {
    if (!data) return;
    document.title = data.org_name || slug;
    setMeta('description', data.tagline || `${data.org_name || slug} — events, music, and more.`);
    setMeta('og:title', data.org_name || slug, true);
    const hero = (data.blocks ?? []).find((b) => b.block_type === 'hero');
    const ogImage = (hero?.config?.imageUrl as string) || data.logo_url;
    if (ogImage) setMeta('og:image', ogImage, true);
  }, [data, slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
        <h1 className="font-sans normal-case tracking-tight text-3xl font-bold mb-2">Page not found</h1>
        <p className="text-muted-foreground mb-6">This site doesn&apos;t exist or hasn&apos;t been published yet.</p>
        <Link to="/" className="text-primary underline">Go to GleeWorld</Link>
      </div>
    );
  }

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
