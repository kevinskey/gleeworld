import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { UNIFIED_MODULES } from "@/config/unified-modules";

// Simple SEO helper (local to this page)
const useSEO = (title: string, description: string, canonical?: string) => {
  useEffect(() => {
    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', description);
    else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = description;
      document.head.appendChild(m);
    }
    const linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) {
      if (linkCanonical) linkCanonical.href = canonical;
      else {
        const l = document.createElement('link');
        l.rel = 'canonical';
        l.href = canonical;
        document.head.appendChild(l);
      }
    }
  }, [title, description, canonical]);
};

interface EventItem { id: string; title: string; start_date?: string | null; end_date?: string | null; location?: string | null }
interface AudioItem { id: string; title: string; description?: string | null; category?: string | null; audio_url?: string | null }
interface DocItem { id: string; title?: string | null; description?: string | null; file_url?: string | null; mime_type?: string | null }

const SectionHeader: React.FC<{ title: string; count: number }> = ({ title, count }) => (
  <div className="flex items-center gap-3 mb-3">
    <h2 className="text-xl font-semibold">{title}</h2>
    <Badge variant="outline">{count}</Badge>
  </div>
);

export const SearchPage: React.FC = () => {
  useSEO(
    "Search GleeWorld | Site-wide",
    "Search events, media, PDFs, music, and modules across GleeWorld.",
    `${window.location.origin}/search`
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [audio, setAudio] = useState<AudioItem[]>([]);
  const [docs, setDocs] = useState<DocItem[]>([]);

  // Sync from URL
  useEffect(() => {
    setQ(searchParams.get("q") || "");
  }, [searchParams]);

  // Client-side modules filter
  const moduleResults = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [] as typeof UNIFIED_MODULES;
    return UNIFIED_MODULES.filter(m => [m.title, m.description, (m as any).name, m.category, (m as any).keywords?.join(" ")]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term));
  }, [q]);

  // Fetch from Supabase with RLS respecting user access
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setEvents([]);
      setAudio([]);
      setDocs([]);
      return;
    }

    let isCancelled = false;
    const like = `%${term}%`;

    const run = async () => {
      setLoading(true);
      try {
        const [eventsRes, audioRes, docsRes] = await Promise.all([
          supabase
            .from("events")
            .select("id,title,start_date,end_date,location")
            .or(`title.ilike.${like},location.ilike.${like}`),
          supabase
            .from("audio_archive")
            .select("id,title,description,category,audio_url")
            .or(`title.ilike.${like},description.ilike.${like},category.ilike.${like}`),
          supabase
            .from("gw_documents")
            .select("*")
            .or(`title.ilike.${like},description.ilike.${like}`),
        ]);

        if (!isCancelled) {
          setEvents(eventsRes.data ?? []);
          setAudio(audioRes.data ?? []);
          const rawDocs = (docsRes.data as any[]) ?? [];
          setDocs(rawDocs.map((d: any) => ({
            id: d.id,
            title: d.title ?? d.name ?? null,
            description: d.description ?? null,
            file_url: d.file_url ?? d.filepath ?? d.file_path ?? null,
            mime_type: d.mime_type ?? null,
          })));
        }
      } catch (e) {
        console.warn("Search error", e);
        if (!isCancelled) {
          // Keep partial data if any succeeded
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    run();
    return () => { isCancelled = true; };
  }, [q]);

  return (
    <div>
      <header className="w-full border-b border-border bg-background">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold tracking-tight">Search GleeWorld</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">Find content you have access to across events, media, PDFs, music, and modules.</p>
          <div className="mt-4 max-w-xl">
            <Input
              value={q}
              onChange={(e) => {
                const val = e.target.value;
                setQ(val);
                const sp = new URLSearchParams(searchParams);
                if (val) sp.set('q', val); else sp.delete('q');
                setSearchParams(sp, { replace: true });
              }}
              placeholder="Search the website..."
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-10">
        {/* Modules */}
        <section>
          <SectionHeader title="Modules" count={moduleResults.length} />
          {moduleResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matching modules.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {moduleResults.slice(0, 9).map(m => (
                <Card key={m.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      {m.icon && <m.icon className="h-5 w-5" />}
                      <CardTitle className="text-base font-semibold leading-tight">{m.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-3">{m.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{m.category}</Badge>
                      <Button size="sm" onClick={() => { window.location.href = `/dashboard?module=${encodeURIComponent(m.id)}`; }}>Open</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Events */}
        <section>
          <SectionHeader title="Events" count={events.length} />
          {loading && q ? <p className="text-sm text-muted-foreground">Searching events…</p> : null}
          {!loading && events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matching events.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.slice(0, 9).map(ev => (
                <Card key={ev.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold leading-tight">{ev.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div>{ev.location || ""}</div>
                    <div className="flex gap-2">
                      <Link to="/events" className="underline text-primary">View in Calendar</Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Music Library (Audio Archive) */}
        <section>
          <SectionHeader title="Music Library" count={audio.length} />
          {loading && q ? <p className="text-sm text-muted-foreground">Searching music…</p> : null}
          {!loading && audio.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matching tracks.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {audio.slice(0, 9).map(a => (
                <Card key={a.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold leading-tight">{a.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div className="line-clamp-2">{a.description}</div>
                    <div className="flex gap-2">
                      <Link to="/music-library" className="underline text-primary">Open Music Library</Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* PDFs / Documents */}
        <section>
          <SectionHeader title="PDFs & Documents" count={docs.length} />
          {loading && q ? <p className="text-sm text-muted-foreground">Searching documents…</p> : null}
          {!loading && docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matching documents.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {docs.slice(0, 9).map(d => (
                <Card key={d.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold leading-tight">{d.title || d.file_url || 'Document'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div className="line-clamp-2">{d.description}</div>
                    <div className="flex gap-2">
                      <Link to="/dashboard?module=documents" className="underline text-primary">Open Documents</Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default SearchPage;
