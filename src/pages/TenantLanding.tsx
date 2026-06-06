// Per-tenant public landing page. Rendered at "/" for any tenant subdomain
// that isn't the main GleeWorld platform site. Reads branding + hero + upcoming
// events from the current tenant's data via anon-readable RLS policies.
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, ArrowRight, LogIn, Facebook, Instagram, Youtube, Music, Twitter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';

interface HeroSlide {
  id: string;
  image_url: string | null;
  title: string | null;
  description: string | null;
  display_order: number;
}

interface LandingSection {
  id: string;
  section_type: string;
  enabled: boolean;
  display_order: number;
  config: Record<string, any>;
}

/** Pipe a Supabase Storage URL through imgproxy at 16:9 cover. Non-storage URLs pass through unchanged. */
function heroSrc(url: string | null | undefined, width = 1920, height = 1080): string | undefined {
  if (!url) return undefined;
  if (url.includes('/storage/v1/object/public/')) {
    return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
      + `?width=${width}&height=${height}&resize=cover&quality=85`;
  }
  return url;
}

function youtubeEmbedSrc(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  if (url.includes('soundcloud.com')) return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%239333ea`;
  if (url.includes('open.spotify.com')) return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
  return null;
}

interface PublicEvent {
  id: string;
  title: string;
  start_date: string;
  location: string | null;
}

export default function TenantLanding() {
  const { settings } = useBrandingSettings();
  const orgName = settings.org_name ?? settings.short_name ?? 'Welcome';
  const tagline = settings.tagline ?? '';
  const logo = settings.logo_url ?? '/lovable-uploads/gleeworld-logo.png?v=6';
  const accent = settings.primary_color ?? '#9333ea';

  const tenantSlug = (window as any).__TENANT_CONFIG__?.tenant;

  // Hero slides for this tenant
  const { data: slides = [] } = useQuery<HeroSlide[]>({
    queryKey: ['public-hero-slides', tenantSlug],
    queryFn: async () => {
      let q = supabase
        .from('gw_hero_slides')
        .select('id, image_url, title, description, display_order, gw_tenants!inner(slug)')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (tenantSlug) q = q.eq('gw_tenants.slug', tenantSlug);
      const { data } = await q.limit(4);
      return (data as any[]) ?? [];
    },
    staleTime: 10_000,            // re-fetch after 10 sec, not the React Query default 5 min
    refetchOnWindowFocus: true,   // re-check when the preview tab regains focus
  });

  const heroMode: 'single' | 'slider-fade' | 'slider-scroll' =
    ((settings as any).hero_mode as any) ?? 'single';
  const heroSpeedSec = Math.max(2, Math.min(20, ((settings as any).hero_slider_speed_seconds as number) ?? 5));
  const activeSlides = heroMode === 'single' ? slides.slice(0, 1) : slides;

  // Auto-advance for fade slider (speed in milliseconds)
  const [fadeIndex, setFadeIndex] = useState(0);
  useEffect(() => {
    if (heroMode !== 'slider-fade' || activeSlides.length < 2) return;
    const t = setInterval(() => setFadeIndex(i => (i + 1) % activeSlides.length), heroSpeedSec * 1000);
    return () => clearInterval(t);
  }, [heroMode, activeSlides.length, heroSpeedSec]);

  // Per-tenant landing sections (about, music, social, etc.)
  // Filter by tenant via inner join — for anon visitors RLS doesn't scope.
  const { data: sections = [] } = useQuery<LandingSection[]>({
    queryKey: ['gw_landing_sections', tenantSlug],
    queryFn: async () => {
      let q = supabase
        .from('gw_landing_sections')
        .select('id, section_type, enabled, display_order, config, gw_tenants!inner(slug)')
        .eq('enabled', true)
        .order('display_order');
      if (tenantSlug) q = q.eq('gw_tenants.slug', tenantSlug);
      const { data } = await q;
      return (data as any[]) ?? [];
    },
  });
  const about = sections.find(s => s.section_type === 'about');
  const music = sections.find(s => s.section_type === 'music');
  const social = sections.find(s => s.section_type === 'social');

  // Upcoming public events
  const { data: events = [] } = useQuery<PublicEvent[]>({
    queryKey: ['public-events', tenantSlug],
    queryFn: async () => {
      let q = supabase
        .from('gw_events')
        .select('id, title, start_date, location, is_public, gw_tenants!inner(slug)')
        .eq('is_public', true)
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true });
      if (tenantSlug) q = q.eq('gw_tenants.slug', tenantSlug);
      const { data } = await q.limit(4);
      return (data as any[]) ?? [];
    },
  });

  const primaryHero = slides[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header strip */}
      <header className="sticky top-0 z-50 bg-[hsl(var(--brand-navy))] text-white border-b border-white/10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt={orgName} className="h-9 sm:h-11 w-auto object-contain" />
            <span className="font-bold text-base sm:text-lg tracking-tight">{settings.short_name ?? orgName}</span>
          </Link>
          <div className="flex items-center gap-2">
            {(settings as any).show_enroll_cta && (
              <Button asChild size="sm" className="bg-white text-gray-900 hover:bg-white/90">
                <Link to="/enroll">Enroll</Link>
              </Button>
            )}
            <Button asChild size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <Link to="/auth"><LogIn className="w-4 h-4 mr-1.5" /> Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero — supports single image / fade slider / horizontal scroll slider */}
      {heroMode === 'slider-scroll' && activeSlides.length > 0 ? (
        <ScrollSlider
          slides={activeSlides}
          fallbackTitle={`Welcome to ${orgName}`}
          fallbackBody={tagline || ''}
          accent={accent}
          autoplaySec={heroSpeedSec}
        />
      ) : heroMode === 'slider-fade' && activeSlides.length > 0 ? (
        <section className="relative bg-[hsl(var(--brand-navy))] text-white overflow-hidden" style={{ minHeight: '60vh' }}>
          {activeSlides.map((s, i) => (
            <div key={s.id} className={`absolute inset-0 transition-opacity duration-700 ${i === fadeIndex ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'}`}>
              <HeroSlideRender slide={s} fallbackTitle={`Welcome to ${orgName}`} fallbackBody={tagline || ''} accent={accent} className="h-full" />
            </div>
          ))}
          {activeSlides.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {activeSlides.map((_, i) => (
                <button key={i} onClick={() => setFadeIndex(i)} className={`w-2.5 h-2.5 rounded-full transition ${i === fadeIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/70'}`} aria-label={`Slide ${i+1}`} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <HeroSlideRender slide={primaryHero} fallbackTitle={`Welcome to ${orgName}`} fallbackBody={tagline || "This is your public landing page. Sign in as an admin to upload a hero image, write a tagline, and shape what visitors see first."} accent={accent} />
      )}

      {/* Admin onboarding strip — shown only when there's no hero set up yet */}
      {!primaryHero && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 mt-10">
          <Card className="p-6 border-primary/30 bg-primary/5">
            <h3 className="font-semibold text-lg mb-1">First time here? Set up your landing page.</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Sign in as your site admin (top right), then customize:
            </p>
            <ul className="text-sm text-muted-foreground ml-5 list-disc space-y-1">
              <li><strong>Branding</strong> (logo, colors, name, tagline) at <code className="bg-muted px-1 rounded">/admin/site-setup</code></li>
              <li><strong>Hero images + slider</strong> in Control Center → "Heroes & Sliders"</li>
              <li><strong>Upcoming events</strong> in Control Center → "Calendar" (mark them <em>public</em>)</li>
              <li><strong>Add-ons</strong> (finance, contracts, SMS, etc.) at <code className="bg-muted px-1 rounded">/settings/modules</code></li>
            </ul>
          </Card>
        </section>
      )}

      {/* About — layout depends on tenant choice */}
      {about?.enabled && (() => {
        const layout = about.config.layout ?? 'centered';
        const img = (about.config.image_url as string | undefined)?.trim() || null;
        const title = about.config.title as string | undefined;
        const body = about.config.body as string | undefined;

        const TitleBody = ({ titleClass = '' }: { titleClass?: string }) => (
          <>
            {title && <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${titleClass}`}>{title}</h2>}
            {body && <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">{body}</p>}
          </>
        );

        // Placeholder used when a layout is chosen but no image uploaded yet
        const ImageOrPlaceholder = () => img ? (
          <img src={img} alt="" className="w-full h-72 sm:h-96 object-contain bg-muted rounded-2xl shadow-lg" />
        ) : (
          <div
            className="w-full h-72 sm:h-96 rounded-2xl shadow-lg"
            style={{ background: `linear-gradient(135deg, hsl(var(--brand-blue-light)) 0%, ${accent} 100%)` }}
            aria-hidden
          />
        );

        if (layout === 'banner') {
          return (
            <section className="relative overflow-hidden py-24 sm:py-32 text-white">
              {img ? (
                <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, hsl(var(--brand-blue-light)) 0%, ${accent} 100%)` }} />
              )}
              <div className="absolute inset-0 bg-black/50" />
              <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
                {title && <h2 className="text-4xl sm:text-5xl font-bold mb-4 drop-shadow-lg">{title}</h2>}
                {body && <p className="text-lg sm:text-xl leading-relaxed whitespace-pre-wrap drop-shadow">{body}</p>}
              </div>
            </section>
          );
        }
        if (layout === 'image-left') {
          return (
            <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
              <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                <ImageOrPlaceholder />
                <div><TitleBody /></div>
              </div>
            </section>
          );
        }
        if (layout === 'image-right') {
          return (
            <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
              <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                <div><TitleBody /></div>
                <ImageOrPlaceholder />
              </div>
            </section>
          );
        }
        // default centered
        return (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
            <TitleBody />
          </section>
        );
      })()}

      {/* Music samples */}
      {music?.enabled && (music.config.embeds?.length ?? 0) > 0 && (
        <section
          className="relative overflow-hidden py-16"
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, hsl(var(--brand-navy)) 50%, hsl(var(--brand-blue-light)) 100%)`,
          }}
        >
          {/* Subtle radial overlays for depth */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(90% 50% at 0% 0%, rgba(255,255,255,0.12) 0%, transparent 50%), radial-gradient(80% 50% at 100% 100%, rgba(0,0,0,0.35) 0%, transparent 50%)`,
            }}
          />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-white">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2 drop-shadow">
              <Music className="w-6 h-6" /> Listen
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {music.config.embeds.filter((e: any) => e.url).map((emb: any, i: number) => {
                const src = youtubeEmbedSrc(emb.url);
                if (!src) return null;
                return (
                  <div key={i} className="aspect-video rounded-lg overflow-hidden shadow-xl ring-1 ring-white/10">
                    <iframe src={src} className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Upcoming events — only rendered if the tenant has public events */}
      {events.length > 0 && (
        <section id="events" className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2">
            <Calendar className="w-6 h-6" style={{ color: accent }} /> Upcoming
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {events.map((ev) => (
              <Card key={ev.id} className="p-4 hover:shadow-lg transition">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {new Date(ev.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <h3 className="font-semibold mb-1">{ev.title}</h3>
                {ev.location && <p className="text-sm text-muted-foreground">{ev.location}</p>}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-sm text-muted-foreground text-center">
          {social?.enabled && (
            <div className="flex justify-center gap-4 mb-4">
              {social.config.facebook && <a href={social.config.facebook} target="_blank" rel="noreferrer" className="hover:text-foreground" aria-label="Facebook"><Facebook className="w-5 h-5" /></a>}
              {social.config.instagram && <a href={social.config.instagram} target="_blank" rel="noreferrer" className="hover:text-foreground" aria-label="Instagram"><Instagram className="w-5 h-5" /></a>}
              {social.config.youtube && <a href={social.config.youtube} target="_blank" rel="noreferrer" className="hover:text-foreground" aria-label="YouTube"><Youtube className="w-5 h-5" /></a>}
              {social.config.spotify && <a href={social.config.spotify} target="_blank" rel="noreferrer" className="hover:text-foreground" aria-label="Spotify"><Music className="w-5 h-5" /></a>}
              {social.config.soundcloud && <a href={social.config.soundcloud} target="_blank" rel="noreferrer" className="hover:text-foreground" aria-label="SoundCloud"><Music className="w-5 h-5" /></a>}
              {social.config.twitter && <a href={social.config.twitter} target="_blank" rel="noreferrer" className="hover:text-foreground" aria-label="Twitter/X"><Twitter className="w-5 h-5" /></a>}
            </div>
          )}
          <p className="!max-w-none">© {new Date().getFullYear()} {orgName}. Powered by <a href="https://gleeworld.org" target="_blank" rel="noreferrer" className="font-semibold underline">GleeWorld</a>.</p>
        </div>
      </footer>
    </div>
  );
}

// Scroll-snap slider with prev/next buttons + dot indicators + autoplay.
function ScrollSlider({
  slides,
  fallbackTitle,
  fallbackBody,
  accent,
  autoplaySec,
}: {
  slides: HeroSlide[];
  fallbackTitle: string;
  fallbackBody: string;
  accent: string;
  autoplaySec: number;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);

  const goTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const target = Math.max(0, Math.min(slides.length - 1, i));
    el.scrollTo({ left: target * el.clientWidth, behavior: 'smooth' });
    setIdx(target);
  };

  // Track current slide as the user scrolls/swipes
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / el.clientWidth);
      if (i !== idx) setIdx(i);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [idx]);

  // Autoplay
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % slides.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    }, autoplaySec * 1000);
    return () => clearInterval(t);
  }, [slides.length, autoplaySec]);

  return (
    <section className="relative bg-[hsl(var(--brand-navy))] text-white">
      <div
        ref={scrollerRef}
        className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none' as any }}
      >
        {slides.map((s) => (
          <HeroSlideRender
            key={s.id}
            slide={s}
            fallbackTitle={fallbackTitle}
            fallbackBody={fallbackBody}
            accent={accent}
            className="snap-start shrink-0 min-w-full"
          />
        ))}
      </div>
      {slides.length > 1 && (
        <>
          <button
            onClick={() => goTo(idx - 1)}
            disabled={idx === 0}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 disabled:opacity-30 flex items-center justify-center backdrop-blur-sm"
            aria-label="Previous slide"
          ><ChevronLeft className="w-6 h-6" /></button>
          <button
            onClick={() => goTo(idx + 1)}
            disabled={idx === slides.length - 1}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 disabled:opacity-30 flex items-center justify-center backdrop-blur-sm"
            aria-label="Next slide"
          ><ChevronRight className="w-6 h-6" /></button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`w-2.5 h-2.5 rounded-full transition ${i === idx ? 'bg-white' : 'bg-white/40 hover:bg-white/70'}`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// A single hero slide — image background + readable text chip. Used standalone for
// 'single' mode and as the cell for the scroll/fade slider modes.
function HeroSlideRender({
  slide,
  fallbackTitle,
  fallbackBody,
  accent,
  className = '',
}: {
  slide?: HeroSlide;
  fallbackTitle: string;
  fallbackBody: string;
  accent: string;
  className?: string;
}) {
  return (
    <section className={`relative overflow-hidden bg-[hsl(var(--brand-navy))] text-white ${className}`}>
      {slide?.image_url ? (
        <img src={heroSrc(slide.image_url) ?? slide.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background: `radial-gradient(120% 80% at 0% 0%, hsl(var(--brand-blue-light)) 0%, transparent 50%), radial-gradient(120% 80% at 100% 100%, ${accent} 0%, transparent 50%)`,
          }}
        />
      )}
      {slide?.image_url && <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 to-transparent" />}
      {!slide?.image_url && <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--brand-navy))]/80 via-[hsl(var(--brand-navy))]/60 to-transparent" />}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28 md:py-36">
        <div className="max-w-2xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 leading-tight">
            <span
              className="bg-black/40 rounded-lg px-3 py-1"
              style={{
                WebkitBoxDecorationBreak: 'clone',
                boxDecorationBreak: 'clone',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                textShadow: '0 2px 12px rgba(0,0,0,0.6), 0 0 1px rgba(0,0,0,0.9)',
              } as any}
            >
              {slide?.title || fallbackTitle}
            </span>
          </h1>
          {(slide?.description || fallbackBody) && (
            <p className="text-lg sm:text-xl text-white max-w-xl leading-relaxed">
              <span
                className="bg-black/40 rounded-md px-2 py-1"
                style={{
                  WebkitBoxDecorationBreak: 'clone',
                  boxDecorationBreak: 'clone',
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                  textShadow: '0 1px 8px rgba(0,0,0,0.6), 0 0 1px rgba(0,0,0,0.9)',
                } as any}
              >
                {slide?.description || fallbackBody}
              </span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
