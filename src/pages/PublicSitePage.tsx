// Public tenant site at /sites/:slug. Anonymous-safe: everything comes from
// the get_public_site RPC (published snapshot only) — never from draft tables.
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PublicSiteView, type PublicSitePayload } from '@/components/public-site/PublicSiteView';

export default function PublicSitePage() {
  const { slug = '', page = 'home' } = useParams<{ slug: string; page?: string }>();

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

  // A page URL only works if the published site actually has blocks on it.
  const pageExists = page === 'home'
    || (data.blocks ?? []).some((b) => (b.page || 'home') === page);
  if (!pageExists) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
        <h1 className="font-sans normal-case tracking-tight text-3xl font-bold mb-2">Page not found</h1>
        <p className="text-muted-foreground mb-6">This page doesn&apos;t exist on this site.</p>
        <Link to={`/sites/${slug}`} className="text-primary underline">Go to the site&apos;s home page</Link>
      </div>
    );
  }

  return (
    <PublicSiteView
      data={data}
      slug={slug}
      page={page}
      pageHref={(p) => (p === 'home' ? `/sites/${slug}` : `/sites/${slug}/${p}`)}
    />
  );
}
