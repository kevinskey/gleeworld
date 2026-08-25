// Link-preview + indexing control for public giving pages.
//
// Two things this exists for:
//   1) OG tags. These links are shared into iMessage and Facebook, where a
//      preview card showing the singer's photo and "$380 of $500 raised"
//      converts materially better than a bare URL. This is a client-side
//      SPA, so crawlers that don't execute JS won't see these — a
//      prerender/SSR pass for /give/* is the follow-up, but setting them
//      here still covers the in-app browsers that DO run JS.
//   2) noindex. Participant pages picture minors. Unless the campaign owner
//      explicitly opted into search indexing, we tell crawlers to stay out —
//      shareable is not the same as searchable.

import { useEffect } from 'react';

interface Meta {
  title: string;
  description: string;
  image?: string | null;
  indexable: boolean;
}

/** Sets a meta tag and returns an undo that restores exactly what was there
 *  before — a tag we created is removed, a tag that already existed gets its
 *  original content back. Leaving a stale robots or og:image behind after a
 *  client-side navigation is worse than never setting one. */
function upsert(selector: string, attrs: Record<string, string>): () => void {
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (existing) {
    const previous = existing.getAttribute('content');
    existing.setAttribute('content', attrs.content);
    return () => {
      if (previous === null) existing.removeAttribute('content');
      else existing.setAttribute('content', previous);
    };
  }
  const el = document.createElement('meta');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.head.appendChild(el);
  return () => el.remove();
}

export function useGivingMeta(meta: Meta | null) {
  useEffect(() => {
    if (!meta) return;
    const previousTitle = document.title;
    document.title = meta.title;

    const undo: Array<() => void> = [
      upsert('meta[name="description"]', { name: 'description', content: meta.description.slice(0, 200) }),
      upsert('meta[property="og:title"]', { property: 'og:title', content: meta.title }),
      upsert('meta[property="og:description"]', { property: 'og:description', content: meta.description.slice(0, 200) }),
      upsert('meta[property="og:type"]', { property: 'og:type', content: 'website' }),
      upsert('meta[property="og:url"]', { property: 'og:url', content: window.location.href }),
      upsert('meta[name="twitter:card"]', { name: 'twitter:card', content: meta.image ? 'summary_large_image' : 'summary' }),
      upsert('meta[name="robots"]', { name: 'robots', content: meta.indexable ? 'index,follow' : 'noindex,nofollow' }),
    ];
    if (meta.image) {
      undo.push(upsert('meta[property="og:image"]', { property: 'og:image', content: meta.image }));
    }

    return () => {
      document.title = previousTitle;
      for (const fn of undo) fn();
    };
    // Depending on the individual fields rather than the object: callers build
    // `meta` inline from query data, so a fresh object identity arrives on every
    // render and would tear down/rebuild every tag each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta?.title, meta?.description, meta?.image, meta?.indexable]);
}
