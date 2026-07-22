import React, { createContext, useContext, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RequestWorkspaceDialog } from "@/components/leads/RequestWorkspaceDialog";
import { Link } from "react-router-dom";
import { getDefaultEventImage } from "@/constants/images";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { HeroSlider } from "@/components/hero/HeroSlider";
import { useUniversalHeroSlides } from "@/hooks/useUniversalSlider";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PLAN_TIERS, TIER_PASTELS, formatPrice, monthsFreeFor, type PlanTierId } from "@/lib/planTiers";
import {
  Calendar,
  MapPin,
  ArrowRight,
  Clock,
  GraduationCap,
  Users,
  ClipboardCheck,
  Sparkles,
  Megaphone,
  PenSquare,
  Music,
  ShoppingBag,
  FileText,
  Mail,
  CheckCircle2,
  Shield,
  Zap,
  School,
  Church,
  Building,
  Globe,
  ShieldCheck,
  Mic,
  Menu,
  X,
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  start_date: string;
  location: string | null;
  description: string | null;
  event_type: string;
  image_url: string | null;
}

const MOCK_EVENTS: Event[] = [
  {
    id: "mock-concert-choir",
    title: "Concert Choir Concert",
    start_date: "2026-06-12T19:30:00Z",
    location: "Sisters Chapel",
    description: "An evening of choral masterworks performed by the Concert Choir.",
    event_type: "performance",
    image_url: null,
  },
  {
    id: "mock-freshman-voices",
    title: "Freshman Voices Showcase",
    start_date: "2026-06-19T19:00:00Z",
    location: "Recital Hall",
    description: "First-year singers debut a program of folk songs and spirituals.",
    event_type: "performance",
    image_url: null,
  },
  {
    id: "mock-mens-choir",
    title: "Men's Choir Concert",
    start_date: "2026-06-27T20:00:00Z",
    location: "Concert Hall",
    description: "The Men's Choir presents traditional and contemporary works.",
    event_type: "performance",
    image_url: null,
  },
  {
    id: "mock-auditions",
    title: "Fall Auditions",
    start_date: "2026-08-22T10:00:00Z",
    location: "Fine Arts Building, Room 105",
    description: "Open auditions for all ensembles. Sign up via the audition portal.",
    event_type: "audition",
    image_url: null,
  },
];

export const GleeWorldLanding = () => {
  const { loading: authLoading } = useAuth();
  const tenantOrg = typeof window !== 'undefined' ? (window as any).__TENANT_CONFIG__?.org : undefined;
  const siteName = tenantOrg || 'GleeWorld';
  // Sales CTA appears only on the main marketing site — never on tenant clones.
  const isTenantClone = !!tenantOrg;

  const { data: adaptedSlides = [], isLoading: heroLoading } =
    useUniversalHeroSlides("homepage_hero");

  const { data: realEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["homepage-events"],
    queryFn: async () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("gw_events")
        .select("*")
        .gte("start_date", startOfToday.toISOString())
        .eq("is_public", true)
        .neq("calendar_id", "931a4ae9-2a06-4111-a217-59083632b1a3")
        .order("start_date", { ascending: true })
        .limit(6);

      if (error) throw error;
      return data as Event[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Showcase mock events for prospective buyers when the DB has none.
  const events: Event[] = realEvents.length > 0 ? realEvents : MOCK_EVENTS;

  const loading = heroLoading || eventsLoading;

  if (loading || authLoading) {
    return (
      <div
        className="w-full flex items-center justify-center brand-blue-theme"
        style={{
          background:
            "linear-gradient(180deg, hsl(208 100% 33%) 0%, hsl(203 100% 40%) 40%, hsl(197 80% 63%) 100%)",
        }}
      >
        <LoadingSpinner size="lg" text={`Loading ${siteName}...`} className="text-white" />
      </div>
    );
  }

  // Main marketing site — sells the GleeWorld platform.
  if (!isTenantClone) {
    return <MarketingSite />;
  }

  // Tenant clone — public landing for an individual choir/band/school.
  return (
    <div
      className="w-full w-full relative brand-blue-theme"
      style={{
        background:
          "linear-gradient(180deg, hsl(208 100% 33%) 0%, hsl(203 100% 40%) 40%, hsl(197 80% 63%) 100%)",
      }}
    >
      <div
        className="absolute inset-0 -z-10 opacity-20 mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncA type='linear' slope='0.08'/></feComponentTransfer></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
        aria-hidden="true"
      />

      <PublicLayout>
        {/* Hero */}
        <section className="relative z-30 py-2 sm:py-3 md:py-4 w-full bg-white">
          <div className="w-full">
            <Card className="overflow-hidden bg-card/60 backdrop-blur-sm border-2 border-border shadow-xl rounded-lg sm:rounded-xl md:rounded-2xl">
              {adaptedSlides.length > 0 ? (
                <div className="w-full flex items-center justify-center">
                  <HeroSlider
                    slides={adaptedSlides}
                    defaultDurationMs={6000}
                    autoplay
                    showControls={false}
                    showProgress={false}
                    showPausePlay={false}
                  />
                </div>
              ) : (
                <div className="w-full w-full bg-muted flex items-center justify-center">
                  <div className="text-center p-4">
                    <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm sm:text-base">No hero slides configured</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </section>

        {/* Upcoming Events — hidden on the main marketing site, shown on tenant clones */}
        {isTenantClone && (
        <section id="events" className="relative z-30 py-4 sm:py-8 md:py-12 lg:py-16 w-full bg-primary-foreground">
          <div className="w-full">
            <Card className="p-3 sm:p-5 md:p-6 lg:p-8 bg-card/60 backdrop-blur-sm border-2 border-border shadow-xl">
              <div className="text-center mb-4 md:mb-6 lg:mb-8">
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-secondary animate-pulse" />
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-dancing font-bold text-foreground mb-2">
                    Upcoming Events
                  </h2>
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-primary animate-pulse" />
                </div>
              </div>

              {events.length > 0 ? (
                <>
                  {/* Desktop */}
                  <div className="hidden md:block">
                    <div
                      className="flex gap-4 lg:gap-6 overflow-x-scroll pb-4 scrollbar-hide"
                      style={{ scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}
                    >
                      {events.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="md:hidden">
                    <Carousel className="w-full">
                      <CarouselContent className="-ml-2 sm:-ml-4">
                        {events.map((event) => (
                          <CarouselItem key={event.id} className="pl-2 sm:pl-4 basis-[85%] sm:basis-[70%]">
                            <EventCard event={event} />
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                    </Carousel>
                  </div>

                  <div className="text-center mt-6">
                    <Button asChild variant="outline">
                      <Link to="/public-calendar">
                        View Full Calendar <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No upcoming events. Check back soon.</p>
                </div>
              )}
            </Card>
          </div>
        </section>
        )}

        {/* What you can do with GleeWorld */}
        <section className="relative z-30 py-4 sm:py-8 md:py-12 lg:py-16 w-full">
          <div className="w-full">
            <Card className="p-3 sm:p-5 md:p-6 lg:p-8 bg-card/60 backdrop-blur-sm border-2 border-border shadow-xl">
              <div className="text-center mb-6 md:mb-8">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-dancing font-bold text-foreground mb-2">
                  One platform. Every class, every group.
                </h2>
                <p className="text-foreground/70 text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
                  GleeWorld runs your choir, band, or class — from rosters to rehearsals to grades.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FeatureTile
                  icon={GraduationCap}
                  title="Glee Academy LMS"
                  body="Classes, syllabi, assignments, gradebook. A full learning management system built for music."
                  to="/glee-academy"
                  cta="Browse classes"
                />
                <FeatureTile
                  icon={Users}
                  title="Groups & Rosters"
                  body="Choirs, sections, ensembles. Enroll students, manage rosters, communicate."
                  to="/auth"
                  cta="Sign in"
                />
                <FeatureTile
                  icon={ClipboardCheck}
                  title="Attendance & Calendar"
                  body="Take attendance, schedule rehearsals, handle excuse requests in one place."
                  to="/public-calendar"
                  cta="View calendar"
                />
              </div>
            </Card>
          </div>
        </section>

        {/* Sales CTA — only on the main marketing site */}
        {!isTenantClone && (
          <section className="relative z-30 py-8 sm:py-12 md:py-16 w-full">
            <div
              className="relative overflow-hidden rounded-2xl border-2 border-amber-300/40 shadow-2xl p-6 sm:p-8 md:p-12 lg:p-16"
              style={{
                background: 'linear-gradient(135deg, #150d26 0%, #0a4d8f 50%, #1a6dc7 100%)',
              }}
            >
              <div className="relative z-10 max-w-3xl mx-auto space-y-4 md:space-y-6 text-center">
                <div
                  className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase"
                  style={{
                    backgroundColor: 'rgba(251, 191, 36, 0.25)',
                    border: '1px solid rgba(252, 211, 77, 0.5)',
                    color: '#fde68a',
                  }}
                >
                  For directors, schools &amp; churches
                </div>

                <h2
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
                  style={{ color: '#ffffff' }}
                >
                  Run your choir or band on GleeWorld.
                </h2>

                <p
                  className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.88)' }}
                >
                  Your own private site with everything you've seen here — classes, rosters,
                  attendance, gradebook, calendar, communications, music library, and shop.
                  Hosted, secured, and updated by us.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 py-4 max-w-2xl mx-auto text-left">
                  {[
                    { big: '10 min', small: 'to launch' },
                    { big: '45+', small: 'modules' },
                    { big: 'Private', small: 'database' },
                    { big: 'Yours', small: 'branding' },
                  ].map((stat) => (
                    <div
                      key={stat.small}
                      className="rounded-lg p-3"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.10)',
                        border: '1px solid rgba(255,255,255,0.20)',
                      }}
                    >
                      <div className="text-xl sm:text-2xl font-bold" style={{ color: '#ffffff' }}>
                        {stat.big}
                      </div>
                      <div className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        {stat.small}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <a
                    href="mailto:kevin@gleeworld.org?subject=GleeWorld%20for%20my%20group&body=Hi%20Kevin%2C%0A%0AI%27d%20like%20to%20set%20up%20GleeWorld%20for%20my%20group.%0A%0AName%20of%20organization%3A%20%0ASize%20%28approx%20students%29%3A%20%0APreferred%20subdomain%3A%20%0AHow%20did%20you%20find%20us%3F%20%0A%0AThanks%21"
                    className="inline-flex items-center justify-center gap-2 rounded-lg font-bold text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 shadow-xl transition-colors"
                    style={{ backgroundColor: '#fbbf24', color: '#0f172a' }}
                  >
                    Get my own site
                    <ArrowRight className="h-5 w-5" />
                  </a>
                  <a
                    href={TRY_DEMO_URL}
                    className="inline-flex items-center justify-center rounded-lg font-semibold text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 transition-colors"
                    style={{
                      border: '2px solid rgba(255,255,255,0.4)',
                      color: '#ffffff',
                      backgroundColor: 'transparent',
                    }}
                  >
                    Try the demo
                  </a>
                </div>

                <p className="text-xs sm:text-sm pt-2" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  No contracts. Cancel any time. We respond within one business day.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <section className="relative z-30 pt-8 sm:pt-12 md:pt-16 pb-4 sm:pb-6">
          <div className="w-full">
            <Card className="bg-primary text-primary-foreground p-4 sm:p-6 md:p-8 lg:p-12 border-2 border-border shadow-xl">
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold">{siteName}</h3>
                  <p className="text-primary-foreground/60 text-sm">
                    The platform built for choirs, bands, and music classes.
                  </p>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="text-base sm:text-lg font-semibold">Quick Links</h4>
                  <div className="space-y-2 text-sm">
                    <div><Link to="/about" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">About</Link></div>
                    <div><a href="#events" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">Events</a></div>
                    <div><Link to="/glee-academy" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">Academy</Link></div>
                    <div><Link to="/press-kit" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">Contact</Link></div>
                  </div>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="text-base sm:text-lg font-semibold">Connect</h4>
                  <div className="space-y-2 text-sm">
                    <div><a href="https://www.facebook.com/RiversideChoir" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">Facebook</a></div>
                    <div><a href="https://www.instagram.com/riversidechoir" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">Instagram</a></div>
                    <div><a href="https://x.com/riversidechoir" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">X</a></div>
                  </div>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="text-base sm:text-lg font-semibold">Contact</h4>
                  <div className="space-y-2 text-sm text-primary-foreground/60">
                    <div>Riverside Music Institute</div>
                    <div>350 Concert Hall Drive</div>
                    <div>Atlanta, GA 30314</div>
                  </div>
                </div>
              </div>
              <div className="border-t border-primary-foreground/20 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-sm text-primary-foreground/60">
                <p>&copy; {new Date().getFullYear()} {siteName}. All rights reserved.</p>
              </div>
            </Card>
          </div>
        </section>
      </PublicLayout>
      <PWAInstallPrompt />
    </div>
  );
};

function EventCard({ event }: { event: Event }) {
  return (
    <Card className="hover:shadow-2xl transition-all duration-300 relative group bg-card border-2 border-border hover:border-accent flex-shrink-0 w-64 lg:w-72 flex flex-col h-[320px]">
      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg font-semibold border border-white/30" asChild>
          <Link to="/public-calendar">
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="h-32 lg:h-36 bg-muted rounded-t-lg flex items-center justify-center relative overflow-hidden flex-shrink-0">
        <img
          src={event.image_url || getDefaultEventImage(event.id)}
          alt={event.title}
          className="w-full h-full object-cover rounded-t-lg brightness-95 contrast-100"
          onError={(e) => {
            e.currentTarget.src = getDefaultEventImage(event.id);
          }}
        />
      </div>
      <CardContent className="p-3 lg:p-4 flex flex-col flex-grow">
        <h3 className="text-sm lg:text-base font-semibold text-card-foreground line-clamp-2 text-center mb-2">{event.title}</h3>
        <div className="space-y-1 text-xs text-muted-foreground mt-auto">
          <div className="flex items-center justify-center gap-1">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span>{new Date(event.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>
          {event.start_date && (
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span>{new Date(event.start_date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
            </div>
          )}
          {event.location && (
            <div className="flex items-center justify-center gap-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureTile({
  icon: Icon, title, body, to, cta,
}: {
  icon: typeof GraduationCap;
  title: string;
  body: string;
  to: string;
  cta: string;
}) {
  return (
    <Link
      to={to}
      className="bg-white/90 hover:bg-white border-2 border-border hover:border-accent rounded-xl p-5 transition-all hover:shadow-xl flex flex-col group"
    >
      <Icon className="h-8 w-8 text-primary mb-3" />
      <h3 className="text-lg font-bold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground flex-grow">{body}</p>
      <div className="mt-4 text-sm font-semibold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
        {cta} <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// MarketingSite — gleeworld.org as a SaaS pitch for choir/band directors.
// ──────────────────────────────────────────────────────────────────────────

// Apple-style typography for the marketing site only. The global stylesheet
// forces all h1/h2/h3 to Bebas Neue (uppercase display font); override with
// a clean modern sans-serif inline.
const SANS = "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif";
const HEADING_STYLE = { fontFamily: SANS, textTransform: 'none' as const };

const MAILTO_BUY =
  'mailto:kevin@gleeworld.org?subject=GleeWorld%20for%20my%20group&body=Hi%20Kevin%2C%0A%0AI%27d%20like%20to%20set%20up%20GleeWorld%20for%20my%20group.%0A%0AName%20of%20organization%3A%20%0ASize%20%28approx%20students%29%3A%20%0APreferred%20subdomain%3A%20%0AHow%20did%20you%20find%20us%3F%20%0A%0AThanks%21';
// "Try the demo" scrolls to the persona picker below so visitors pick their
// use case (Choir & Church, School District, School Program, Songwriter)
// before landing in a demo tenant that matches — not a generic one.
const TRY_DEMO_URL = '#examples';

// "Get started" buttons across the marketing site open a single shared
// inquiry dialog (rather than mailto:) so we capture submissions server-side.
const InquiryContext = createContext<{ open: () => void }>({ open: () => {} });
const useInquiry = () => useContext(InquiryContext);

// Music-themed imagery — candid / objects / from-behind shots so no one is
// looking directly into the camera.
const IMG = {
  choir: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1600&q=80&auto=format&fit=crop',      // concert hall stage, no faces
  conductor: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&q=80&auto=format&fit=crop',  // conductor from behind, hands raised
  band: 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=1200&q=80&auto=format&fit=crop',       // brass instruments
  classroom: 'https://images.unsplash.com/photo-1568652678454-50d56bb9921a?w=1200&q=80&auto=format&fit=crop',  // piano keys + sheet music
  worship: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=1200&q=80&auto=format&fit=crop',    // cathedral interior, no people
  laptop: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1400&q=80&auto=format&fit=crop',     // clean laptop on desk
  sheet: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=1200&q=80&auto=format&fit=crop',      // sheet music close-up
};

function MarketingSite() {
  const [inquiryOpen, setInquiryOpen] = useState(false);
  return (
    <InquiryContext.Provider value={{ open: () => setInquiryOpen(true) }}>
      <div className="w-full w-full bg-white text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        <AppleNav />
        <AppleHero />
        {/* Real, clickable proof right below the hero — replaces the old
            "See it in action" video slot, which only ever showed an
            unconfigured placeholder (LOOM_EMBED_URL was never set). Actual
            live demo sites are a stronger, more concrete first proof point
            than an empty video player. */}
        <LiveExamplesSection />
        <AppleProductBig />
        <FounderSection />
        {/* Assistant sits right after the founder card — Kevin explicitly
            wants this showcased next, before the consolidation table. */}
        <AppleFeatureRow
          eyebrow="GleeWorld Assistant"
          title="The AI that already knows your program."
          body="Move a rehearsal, message a section, add a piece to your library, draft a syllabus — by voice or text. The Assistant is scoped to your workspace, so it can act on your calendar, roster, and library the moment you ask. On every page, in the browser and in the native apps."
          mockup={<AssistantMockup />}
          pastel="#ede9fe"
          imageLeft={false}
        />
        <ReplacementTable />
        <AppleAudienceGrid />
        {/* Music Library sources leads the feature stack — public-domain
            (CPDL, our biggest content differentiator) plus the user's
            private uploads and the GleeWorld Music Store where indie
            composers list scores directly. Three sources, one search. */}
        <AppleFeatureRow
          eyebrow="Music Library sources"
          title="Three sources of music, one search."
          body="57,000 public-domain works from the Choral Public Domain Library, all legal to share. Your own PDFs in a private library only you see. And the GleeWorld Music Store, where independent composers list their scores directly."
          mockup={<CPDLCatalogMockup />}
          pastel="#fef3c7"
          imageLeft={false}
        />
        <AppleFeatureRow
          eyebrow="Music Library"
          title="Your whole repertoire in one place."
          body="PDF previews, recordings, setlists. Tag by voicing, season, or programme. Searchable in one click."
          mockup={<MusicLibraryMockup />}
          pastel="#d1fae5"
          imageLeft={true}
        />
        {/* Academy gets a dedicated showcase — it's the LMS, one of the
            platform's two biggest pillars (with the Music Library), and
            deserves visual weight beyond a single AppleFeatureRow. */}
        <GleeAcademyShowcase />
        {/* Ensembles showcase — the flip side of Academy: the operational
            life of a choir/band/orchestra (recruit → rehearse → perform →
            stay in touch). Also gets its own dedicated section rather
            than a single row, per Kevin. */}
        <EnsemblesShowcase />
        <AppleFeatureRow
          eyebrow="Attendance"
          title="Rehearsals on autopilot."
          body="Recurring schedules. QR check-in. Excuse requests with one-tap approve. Policies that grade themselves."
          mockup={<AttendanceMockup />}
          pastel="#dbeafe"
          imageLeft={true}
        />
        <AppleFeatureRow
          eyebrow="Calendar"
          title="Every rehearsal, every concert."
          body="Recurring events, sectionals, performances — all in one view your students can sync to their phones."
          mockup={<CalendarMockup />}
          pastel="#ede9fe"
          imageLeft={false}
        />
        <AppleFeatureRow
          eyebrow="Communications"
          title="One inbox for your ensemble."
          body="Class-scoped email, push, and announcements. Stop asking people to check four different apps."
          mockup={<CommsMockup />}
          pastel="#fce7f3"
          imageLeft={true}
        />
        <AppleFeatureRow
          eyebrow="Concert Planner"
          title="Print-ready programs in minutes."
          body="Drag pieces from your library, assign soloists and accompanists, and export a clean bulletin. Editor credits ride along on every score so attribution is never your problem."
          mockup={<ConcertPlannerMockup />}
          pastel="#dbeafe"
          imageLeft={false}
        />
        <AppleFeatureRow
          eyebrow="Practice Studio"
          title="Recordings that actually sound like music."
          body="Students record takes with a built-in metronome. A real audio engine — preamp, compressor, normalizer — mixes them clean before they hit your inbox for teacher feedback."
          mockup={<PracticeStudioMockup />}
          pastel="#ede9fe"
          imageLeft={true}
        />
        <AppleFeatureRow
          eyebrow="iOS + Android"
          title="On every phone your students carry."
          body="Native apps in the App Store and Google Play. Push notifications for rehearsal changes. Tenant-aware so a student who belongs to two ensembles can switch between them with a tap."
          mockup={<MobileAppMockup />}
          pastel="#fce7f3"
          imageLeft={false}
        />
        <AppleHowItWorks />
        <ApplePricing />
        <AppleTrustStrip />
        <AppleFinalCTA />
        <AppleFooter />
        <RequestWorkspaceDialog open={inquiryOpen} onClose={() => setInquiryOpen(false)} />
      </div>
    </InquiryContext.Provider>
  );
}

// One source of truth for the nav links: the desktop row and the mobile sheet
// render the same array, so they can't drift apart.
const MARKETING_NAV_LINKS: { href: string; label: string }[] = [
  { href: '#product', label: 'Product' },
  { href: '#examples', label: 'Examples' },
  { href: '#how', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
];

function AppleNav() {
  const { open: openInquiry } = useInquiry();
  const [menuOpen, setMenuOpen] = useState(false);

  // Esc closes the sheet. Without this the only way out on a keyboard is to
  // tab to the toggle, which is a trap for anyone not using a pointer.
  React.useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <header
      className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="max-w-7xl mx-auto px-6 h-14 sm:h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          {/* The source PNG is 1536×1024 with the glyph centered on a
              transparent canvas. CSS-zoom crops to the glyph so it doesn't
              render tiny in the header. */}
          <div
            role="img"
            aria-label="GleeWorld logo"
            className="w-10 h-10 sm:w-12 sm:h-12"
            style={{
              backgroundImage: 'url(/lovable-uploads/gleeworld-logo.png?v=6)',
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
          <span
            className="font-bold text-xl sm:text-2xl tracking-tight"
            style={{ ...HEADING_STYLE, letterSpacing: '-0.02em', color: '#000618' }}
          >
            GleeWorld
          </span>
        </a>
        {/* Desktop nav appears at lg (1024px), not sm (640px). Measured: the
            wordmark is 191px and this row is 468px; with the 48px gutter they
            touch at 707px and need 755px to breathe. md (768px) looks like it
            clears that, but a desktop scrollbar eats ~15px of it, so the gap
            collapses to zero at exactly 768. lg leaves 459px of air. Below it,
            the links live in the sheet. */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-700">
          {MARKETING_NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-slate-900 transition-colors">{l.label}</a>
          ))}
          <a href="/auth" className="hover:text-slate-900 transition-colors">Sign in</a>
          <button
            type="button"
            onClick={openInquiry}
            className="inline-flex items-center rounded-full px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
            style={{ background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }}
          >
            Get started
          </button>
        </nav>

        {/* Below lg the links live in the sheet, so the toggle replaces them. */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="lg:hidden inline-flex items-center justify-center w-10 h-10 -mr-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="marketing-mobile-nav"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {menuOpen && (
        <nav
          id="marketing-mobile-nav"
          className="lg:hidden border-t border-slate-200 bg-white px-6 py-4 flex flex-col gap-1 text-base font-medium text-slate-700"
        >
          {MARKETING_NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="py-2.5 hover:text-slate-900 transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href="/auth"
            onClick={() => setMenuOpen(false)}
            className="py-2.5 hover:text-slate-900 transition-colors"
          >
            Sign in
          </a>
          <button
            type="button"
            onClick={() => { setMenuOpen(false); openInquiry(); }}
            className="mt-2 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
            style={{ background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }}
          >
            Get started
          </button>
        </nav>
      )}
    </header>
  );
}

function AppleHero() {
  // Pull the first active slide from the homepage_hero slider so this hero is
  // controlled by the admin's Hero Manager — not a hardcoded image.
  const { data: slides = [] } = useUniversalHeroSlides("homepage_hero");
  const slide = slides[0];
  const { open: openInquiry } = useInquiry();

  return (
    <section className="relative w-full bg-white">
      {/* Both the hero image AND its dark backdrop are capped to the page
          max-width so the section stays consistent with everything below
          it. Background lives on the inner wrapper (not the section) so
          there's no full-bleed dark gutter on wide viewports. */}
      <div className="max-w-7xl mx-auto bg-[#0a0518]">
        {slide?.imageUrl ? (
          <>
            {/* Mobile <640px: prefer mobile image, fall back to desktop */}
            <img
              src={slide.mobileImageUrl || slide.imageUrl}
              alt={slide.title || 'GleeWorld — Run your music program. Beautifully.'}
              className="w-full h-auto block sm:hidden"
            />
            {/* Desktop ≥640px */}
            <img
              src={slide.imageUrl}
              alt={slide.title || 'GleeWorld — Run your music program. Beautifully.'}
              className="w-full h-auto hidden sm:block"
            />
          </>
        ) : (
          // No hero configured — gradient backdrop in place of the image.
          <div
            className="w-full aspect-[16/8] sm:aspect-[16/7] flex items-center justify-center"
            style={{ background: 'radial-gradient(circle at 50% 30%, #1a0f3a 0%, #0a0518 70%)' }}
          >
            <div className="text-center text-white/70 px-6">
              <p className="text-sm sm:text-base uppercase tracking-widest opacity-60">No hero configured</p>
              <p className="text-lg sm:text-2xl font-semibold mt-2">Run your music program. Beautifully.</p>
            </div>
          </div>
        )}

        {/* CTA strip — sits BELOW the hero image, not overlaying it */}
        <div className="px-6 py-8 sm:py-12">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            type="button"
            onClick={openInquiry}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full px-7 py-3 text-base font-semibold text-white transition-transform hover:scale-[1.03] shadow-2xl"
            style={{ background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }}
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </button>
          <a
            href={TRY_DEMO_URL}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full px-7 py-3 text-base font-semibold transition-colors backdrop-blur-sm"
            style={{ color: '#ffffff', border: '1px solid rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.10)' }}
          >
            Try the demo <ArrowRight className="h-4 w-4" />
          </a>
          </div>{/* /CTA inner */}
        </div>{/* /CTA outer */}
      </div>{/* /max-w-7xl wrapper */}
    </section>
  );
}

// ── Product mockup primitives ──────────────────────────────────────────────

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-amber-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <div className="ml-3 px-3 py-0.5 text-xs text-slate-500 bg-white rounded border border-slate-200 font-mono">
          eastside.gleeworld.org
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="bg-[hsl(40,10%,96%)] p-6 sm:p-8">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500" />
          <div>
            <div className="font-bold text-slate-900 text-sm">Eastside Choir</div>
            <div className="text-xs text-slate-500">Control Center</div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-7 rounded-full bg-slate-200" />
          <div className="h-7 w-20 rounded-full bg-sky-600" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Members', val: '47', color: '#dbeafe' },
          { label: 'Classes', val: '4', color: '#fce7f3' },
          { label: 'Events', val: '12', color: '#fef3c7' },
          { label: 'Attendance', val: '94%', color: '#d1fae5' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-3" style={{ backgroundColor: s.color }}>
            <div className="text-xs uppercase tracking-wider text-slate-600 font-semibold mb-1">{s.label}</div>
            <div className="text-xl font-bold text-slate-900">{s.val}</div>
          </div>
        ))}
      </div>

      {/* Module tiles — the eight surfaces most choir/church tenants live
          in daily. Order roughly matches the sidebar priority; colors are
          just for visual variety (the real app tiles use the tenant's
          brand color). Kept to eight for a clean 2x4 grid — Notation,
          Sight Reading, Liturgy Planner, Tour Manager and the rest are
          add-ons discussed at signup, not front-of-house tiles here. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Music Library', color: '#10b981' },
          { label: 'Calendar', color: '#ec4899' },
          { label: 'Roster', color: '#f59e0b' },
          { label: 'Messages', color: '#0ea5e9' },
          { label: 'Studio', color: '#6366f1' },
          { label: 'Academy', color: '#8b5cf6' },
          { label: 'Concert Planner', color: '#f97316' },
          { label: 'Box Office', color: '#64748b' },
        ].map((m) => (
          <div key={m.label} className="bg-slate-800 rounded-xl p-3">
            <div className="w-5 h-5 rounded mb-2" style={{ backgroundColor: m.color }} />
            <div className="text-xs font-semibold text-white">{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GradebookMockup() {
  const rows = [
    { name: 'Aaliyah J.', w1: 'A', w2: 'A-', w3: 'A', w4: 'B+', avg: '94%' },
    { name: 'Brandon K.', w1: 'B+', w2: 'A-', w3: 'A-', w4: 'A', avg: '91%' },
    { name: 'Cynthia L.', w1: 'A', w2: 'A', w3: 'A', w4: 'A', avg: '98%' },
    { name: 'Devon M.', w1: 'B', w2: 'B+', w3: 'A-', w4: 'A-', avg: '88%' },
    { name: 'Elena P.', w1: 'A-', w2: 'A', w3: 'A', w4: 'A-', avg: '93%' },
  ];
  return (
    <div className="bg-white p-5 sm:p-6 text-xs sm:text-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-bold text-slate-900">Gradebook</div>
          <div className="text-xs sm:text-xs text-slate-500">MUS 240 · Fall 2026</div>
        </div>
        <div className="text-xs sm:text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-semibold">Class avg 92%</div>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-xs sm:text-xs text-slate-500 border-b border-slate-200">
            <th className="text-left font-medium py-2">Student</th>
            <th className="text-center font-medium">W1</th>
            <th className="text-center font-medium">W2</th>
            <th className="text-center font-medium">W3</th>
            <th className="text-center font-medium">W4</th>
            <th className="text-right font-medium">Avg</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-slate-100">
              <td className="py-2 text-slate-900 font-medium">{r.name}</td>
              <td className="text-center text-slate-600">{r.w1}</td>
              <td className="text-center text-slate-600">{r.w2}</td>
              <td className="text-center text-slate-600">{r.w3}</td>
              <td className="text-center text-slate-600">{r.w4}</td>
              <td className="text-right font-bold text-slate-900">{r.avg}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function AttendanceMockup() {
  const students = ['Aaliyah', 'Brandon', 'Cynthia', 'Devon', 'Elena', 'Felix', 'Grace', 'Hugo'];
  const dates = ['M', 'T', 'W', 'Th', 'F'];
  // P = present, A = absent, E = excused, L = late
  const grid = [
    ['P','P','P','P','P'],
    ['P','L','P','P','P'],
    ['P','P','P','P','P'],
    ['E','P','P','P','P'],
    ['P','P','P','E','P'],
    ['P','P','A','P','P'],
    ['P','P','P','P','P'],
    ['L','P','P','P','P'],
  ];
  const color = (c: string) =>
    c === 'P' ? '#10b981' :
    c === 'A' ? '#ef4444' :
    c === 'E' ? '#0ea5e9' :
                '#f59e0b';
  return (
    <div className="bg-white p-5 sm:p-6 text-xs sm:text-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-slate-900">Attendance · Week of Sep 14</div>
        <div className="flex gap-2 text-xs">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />Present</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#0ea5e9' }} />Excused</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f59e0b' }} />Late</span>
        </div>
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'minmax(7rem,1fr) repeat(5, 2rem)' }}>
        <div />
        {dates.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-slate-500">{d}</div>
        ))}
        {students.map((s, i) => (
          <React.Fragment key={s}>
            <div className="text-slate-700 font-medium py-1">{s}</div>
            {grid[i].map((c, j) => (
              <div
                key={j}
                className="rounded text-white text-xs font-bold flex items-center justify-center"
                style={{ backgroundColor: color(c), aspectRatio: '1/1' }}
              >
                {c}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function CalendarMockup() {
  const events = [
    { day: 'Mon 16', t: '7:00 PM', name: 'Full Choir Rehearsal', color: '#6366f1' },
    { day: 'Wed 18', t: '7:00 PM', name: 'Sectional · Sopranos', color: '#ec4899' },
    { day: 'Thu 19', t: '6:00 PM', name: 'Tenor + Bass Sectional', color: '#f59e0b' },
    { day: 'Sat 21', t: '4:00 PM', name: 'Concert · Sisters Chapel', color: '#10b981' },
  ];
  return (
    <div className="bg-white p-5 sm:p-6 text-xs sm:text-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-slate-900">Upcoming · September</div>
        <div className="text-xs text-slate-500">4 events</div>
      </div>
      <div className="space-y-2">
        {events.map((e) => (
          <div key={e.name} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50">
            <div className="w-1.5 self-stretch rounded-full" style={{ backgroundColor: e.color }} />
            <div className="flex-1">
              <div className="font-semibold text-slate-900">{e.name}</div>
              <div className="text-xs sm:text-xs text-slate-500">{e.day} · {e.t}</div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EnsembleRosterMockup() {
  const members: { name: string; part: string; section: string; status: 'present' | 'late' | 'excused' }[] = [
    { name: 'Aaliyah J.',  part: 'Soprano I',  section: 'S1', status: 'present' },
    { name: 'Brandon K.',  part: 'Tenor II',   section: 'T2', status: 'present' },
    { name: 'Cynthia L.',  part: 'Alto I',     section: 'A1', status: 'excused' },
    { name: 'Devon M.',    part: 'Bass I',     section: 'B1', status: 'present' },
    { name: 'Elena P.',    part: 'Soprano II', section: 'S2', status: 'present' },
    { name: 'Franklin R.', part: 'Tenor I',    section: 'T1', status: 'late' },
  ];
  return (
    <div className="bg-white p-5 sm:p-6 text-xs sm:text-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-bold text-slate-900">Concert Choir</div>
          <div className="text-xs text-slate-500">Fall 2026 · 6 of 48 shown</div>
        </div>
        <div className="text-[10px] sm:text-xs text-emerald-700 font-semibold px-2 py-0.5 rounded-full bg-emerald-50">SATB</div>
      </div>
      <div className="space-y-1">
        {members.map((m, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-violet-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-violet-700">
              {m.section}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900 truncate">{m.name}</div>
              <div className="text-xs text-slate-500 truncate">{m.part}</div>
            </div>
            <div className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              m.status === 'present' ? 'bg-emerald-50 text-emerald-700' :
              m.status === 'late'    ? 'bg-amber-50 text-amber-700' :
                                       'bg-slate-100 text-slate-600'
            }`}>
              {m.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssistantMockup() {
  return (
    <div className="bg-white p-5 sm:p-6 text-xs sm:text-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }}>
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <div className="font-bold text-slate-900">GleeWorld Assistant</div>
        </div>
        <div className="text-[10px] sm:text-xs text-emerald-700 font-semibold px-2 py-0.5 rounded-full bg-emerald-50">Listening…</div>
      </div>
      <div className="space-y-3">
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-slate-100 px-3 py-2 text-slate-900">
            "Move Friday's rehearsal to 6:30 and let the tenors know."
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }}>
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-violet-50 border border-violet-100 px-3 py-2 text-slate-700">
            Done. Rehearsal Friday moved to <span className="font-semibold text-slate-900">6:30 PM</span>. Drafted an announcement to the tenors — preview it?
          </div>
        </div>
      </div>
      <div className="mt-5 rounded-full bg-slate-50 border border-slate-100 flex items-center gap-2 px-3 py-2">
        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }}>
          <Mic className="w-3 h-3 text-white" />
        </div>
        <div className="flex gap-0.5 items-center flex-1 h-4">
          {[3, 6, 10, 7, 4, 8, 5, 9, 6, 3].map((h, i) => (
            <div key={i} className="w-0.5 rounded-full bg-violet-300" style={{ height: `${h * 1.5}px` }} />
          ))}
        </div>
        <span className="text-[10px] sm:text-xs text-slate-500">Tap to talk</span>
      </div>
    </div>
  );
}

function CommsMockup() {
  return (
    <div className="bg-white p-5 sm:p-6 text-xs sm:text-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-bold text-slate-900">Announcements</div>
        <div className="text-xs text-slate-500">3 unread</div>
      </div>
      {[
        { who: 'Dr. Hayes', when: '2h', msg: 'Rehearsal Friday moved to 6:30 PM — please confirm in the calendar.', tag: 'All choir' },
        { who: 'Section Leader', when: '5h', msg: 'Sopranos: please review measures 24–32 before Thursday.', tag: 'Sopranos' },
        { who: 'Manager', when: '1d', msg: 'Concert dress fitted at Tuesday\'s rehearsal. Bring a friend.', tag: 'All choir' },
      ].map((m, i) => (
        <div key={i} className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">{m.who}</span>
              <span className="text-xs text-slate-500">· {m.when}</span>
              <span className="text-[9px] sm:text-xs px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 font-semibold">{m.tag}</span>
            </div>
            <p className="text-slate-700 leading-snug">{m.msg}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MusicLibraryMockup() {
  const tracks = [
    { title: 'Lift Every Voice and Sing', composer: 'J. R. Johnson', dur: '3:42' },
    { title: 'Ave Verum Corpus', composer: 'W. A. Mozart', dur: '4:15' },
    { title: 'Down by the Riverside', composer: 'Traditional', dur: '5:08' },
    { title: 'Lux Aurumque', composer: 'Eric Whitacre', dur: '3:55' },
    { title: 'Total Praise', composer: 'Richard Smallwood', dur: '6:22' },
  ];
  return (
    <div className="bg-white p-5 sm:p-6 text-xs sm:text-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-slate-900">Music Library</div>
        <div className="text-xs text-slate-500">62 pieces</div>
      </div>
      <div className="space-y-1.5">
        {tracks.map((t, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50">
            <div className="w-8 h-10 rounded bg-gradient-to-br from-amber-100 to-rose-100 flex items-center justify-center flex-shrink-0">
              <Music className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900 truncate">{t.title}</div>
              <div className="text-xs text-slate-500 truncate">{t.composer}</div>
            </div>
            <div className="text-xs sm:text-xs text-slate-400 font-mono">{t.dur}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CPDLCatalogMockup() {
  const hits = [
    { title: 'Ave Maria', composer: 'Josquin des Prez', voicing: 'SATB', lang: 'Latin' },
    { title: 'Lift Thine Eyes', composer: 'Felix Mendelssohn', voicing: 'SSA', lang: 'English' },
    { title: 'Sicut Cervus', composer: 'Giovanni P. da Palestrina', voicing: 'SATB', lang: 'Latin' },
    { title: 'Ubi Caritas', composer: 'Maurice Duruflé', voicing: 'SATB', lang: 'Latin' },
  ];
  return (
    <div className="bg-white p-5 sm:p-6 text-xs sm:text-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-slate-900">Public-Domain Catalog</div>
        <div className="text-[10px] sm:text-xs text-emerald-700 font-semibold px-2 py-0.5 rounded-full bg-emerald-50">CPDL · 57,000 works</div>
      </div>
      <div className="bg-slate-50 rounded-md px-3 py-1.5 mb-3 text-slate-500 text-xs">Search title or composer…</div>
      <div className="space-y-1.5">
        {hits.map((h, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900 truncate">{h.title}</div>
              <div className="text-xs text-slate-500 truncate">{h.composer}</div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{h.voicing}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{h.lang}</span>
            <button className="text-[10px] sm:text-xs font-semibold text-white px-2.5 py-1 rounded-md bg-slate-900">Add</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConcertPlannerMockup() {
  const program = [
    { piece: 'Sicut Cervus', composer: 'Palestrina', soloist: '' },
    { piece: 'Ave Verum Corpus', composer: 'Mozart', soloist: 'Maria Lee (S)' },
    { piece: 'Lift Every Voice and Sing', composer: 'Johnson', soloist: 'Choir' },
    { piece: 'Total Praise', composer: 'Smallwood', soloist: 'Devon James (T)' },
  ];
  return (
    <div className="bg-white p-5 sm:p-6 text-xs sm:text-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-bold text-slate-900">Spring Concert · Apr 18</div>
          <div className="text-[11px] text-slate-500">Sage Auditorium · 7:30 PM</div>
        </div>
        <button className="text-[10px] sm:text-xs font-semibold text-white px-2.5 py-1 rounded-md bg-slate-900">Print program</button>
      </div>
      <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
        {program.map((p, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <div className="text-slate-400 font-mono text-[11px] w-5">{i + 1}.</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900 truncate">{p.piece}</div>
              <div className="text-[11px] text-slate-500 truncate">{p.composer}</div>
            </div>
            {p.soloist && <div className="text-[10px] text-indigo-700 italic truncate max-w-[7rem]">{p.soloist}</div>}
          </div>
        ))}
      </div>
      <div className="mt-3 text-[10px] text-slate-500 italic">
        Editor credits preserved from CPDL on print export.
      </div>
    </div>
  );
}

function PracticeStudioMockup() {
  return (
    <div className="bg-white p-5 sm:p-6 text-xs sm:text-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-slate-900">Practice take · 6/23</div>
        <div className="text-[11px] text-slate-500 font-mono">♩=120 · 4/4 · 2:18</div>
      </div>
      <div className="flex items-end gap-[2px] h-16 mb-3 px-1">
        {Array.from({ length: 48 }).map((_, i) => {
          const h = 18 + Math.round(40 * Math.abs(Math.sin(i / 2.3)) * (0.5 + Math.random() / 2));
          return <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-indigo-500 to-pink-400" style={{ height: `${h}%` }} />;
        })}
      </div>
      <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-3">
        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">Compressed</span>
        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">Normalized 0 dB</span>
        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">Click track</span>
      </div>
      <div className="border border-slate-200 rounded-md p-3 bg-slate-50">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Teacher feedback</div>
        <p className="text-slate-700 leading-snug">Lovely tone on the sustained notes. Watch the diphthong on "lord" in m.&nbsp;12.</p>
      </div>
    </div>
  );
}

function MobileAppMockup() {
  return (
    <div className="bg-gradient-to-b from-slate-50 to-white p-5 sm:p-6 text-xs sm:text-sm">
      <div className="flex items-end justify-center gap-4">
        {/* Phone 1 — push notification */}
        <div className="w-32 h-56 rounded-[1.5rem] border-4 border-slate-900 bg-white shadow-xl overflow-hidden">
          <div className="h-4 bg-slate-900" />
          <div className="p-2 space-y-2">
            <div className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider">9:41</div>
            <div className="rounded-md bg-slate-100 p-1.5">
              <div className="text-[8px] font-bold text-slate-900">GleeWorld</div>
              <div className="text-[8px] text-slate-600 leading-tight">Rehearsal moved to 6:30 PM tonight.</div>
            </div>
            <div className="rounded-md bg-slate-100 p-1.5">
              <div className="text-[8px] font-bold text-slate-900">Messenger</div>
              <div className="text-[8px] text-slate-600 leading-tight">@Sopranos — please review mm. 24–32.</div>
            </div>
          </div>
        </div>
        {/* Phone 2 — practice recorder */}
        <div className="w-32 h-56 rounded-[1.5rem] border-4 border-slate-900 bg-white shadow-xl overflow-hidden">
          <div className="h-4 bg-slate-900" />
          <div className="p-2">
            <div className="text-[9px] font-bold text-slate-900 mb-1">Practice Studio</div>
            <div className="flex items-end gap-[1px] h-10 mb-2">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="flex-1 rounded-sm bg-indigo-500" style={{ height: `${20 + Math.abs(Math.sin(i)) * 70}%` }} />
              ))}
            </div>
            <div className="w-full text-center text-[8px] font-mono text-slate-500">♩=120 · 0:42</div>
            <div className="mt-3 mx-auto w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white text-[10px] font-bold">REC</div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-slate-500">
        <span>iOS · TestFlight</span>
        <span>·</span>
        <span>Google Play · Internal testing</span>
      </div>
    </div>
  );
}

function AppleProductBig() {
  return (
    <section id="product" className="py-16 sm:py-24 md:py-32" style={{ backgroundColor: '#f5f5f7' }}>
      <div className="max-w-5xl mx-auto px-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#0071e3' }}>
          One platform
        </p>
        <h2
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] text-slate-900 mb-6"
          style={{ ...HEADING_STYLE, letterSpacing: '-0.03em' }}
        >
          Everything you need.
          <br />
          <span className="text-slate-400">All in one place.</span>
        </h2>
        <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Your music library, your calendar, your roster, your recordings — all on
          your own site, the full app in the browser and in native iOS and Android
          apps your people actually open.
        </p>
      </div>
      <div className="max-w-6xl mx-auto px-6 mt-12 sm:mt-16">
        <BrowserFrame>
          <DashboardMockup />
        </BrowserFrame>
      </div>
    </section>
  );
}

// ── FounderSection ──────────────────────────────────────────────────────
// Kevin's actual credentials (conductor, composer, professor, church
// musician) are the most credible thing on this page and the hardest
// thing for a competitor to fake. The bio is short on purpose — the
// list of titles does the heavy lifting.
//
// PHOTO: drop a square portrait at /lovable-uploads/kevin-portrait.jpg
// (or update FOUNDER_PHOTO below). Until then a gradient placeholder
// renders so the layout doesn't collapse.
const FOUNDER_PHOTO = '/lovable-uploads/kevin-portrait.jpg';
function FounderSection() {
  return (
    <section id="founder" className="py-16 sm:py-24 md:py-32 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-8 md:gap-12 items-center">
          <div className="mx-auto md:mx-0">
            <div
              className="w-44 h-44 sm:w-52 sm:h-52 rounded-3xl shadow-xl bg-cover bg-center"
              style={{
                backgroundImage: `url(${FOUNDER_PHOTO}), linear-gradient(135deg, #3b82f6, #8b5cf6, #c084fc)`,
              }}
              aria-label="Dr. Kevin Johnson"
            />
          </div>
          <div>
            <p
              className="text-sm font-semibold uppercase tracking-wider mb-3"
              style={{ color: '#0071e3' }}
            >
              Why GleeWorld exists
            </p>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-slate-900 mb-5"
              style={{ ...HEADING_STYLE, letterSpacing: '-0.025em' }}
            >
              Built by a director, for directors.
            </h2>
            <p className="text-base sm:text-lg text-slate-700 leading-relaxed mb-4">
              Most music programs run on a patchwork of software that was never
              designed for music. After decades directing choirs, teaching
              college students, managing libraries, producing concerts, and
              serving churches, I built GleeWorld to bring everything together
              in one place — and to treat music programs like music programs,
              not generic offices.
            </p>
            <p className="text-xl sm:text-2xl text-slate-900 font-bold">
              Dr. Kevin Johnson
            </p>
            <p className="text-base text-slate-600 mt-1">
              Conductor · Composer · Educator · Church Musician
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── ReplacementTable ────────────────────────────────────────────────────
// Frames GleeWorld as a consolidation play, not a "yet another tool."
// Each row is a tool the buyer already pays for or already hates juggling.
// Purely factual — no testimonials, no fabricated numbers required.
function ReplacementTable() {
  const rows: { uses: string; replaces: string }[] = [
    { uses: 'GroupMe, WhatsApp, Remind',              replaces: 'Messenger with push notifications' },
    { uses: 'Google Drive, Dropbox',                  replaces: 'Music Library with rights tagging' },
    { uses: 'Google Calendar, Calendly',              replaces: 'Calendar with rehearsal recurrence' },
    { uses: 'Canvas, Google Classroom',               replaces: 'Academy + Grading + Assignments' },
    { uses: 'Excel, Google Sheets',                   replaces: 'QR Attendance & Rosters' },
    { uses: 'Mailchimp, Constant Contact',            replaces: 'Announcements & section broadcasts' },
    { uses: 'Eventbrite, TicketTailor',               replaces: 'Box Office (add-on)' },
    { uses: 'Audacity, GarageBand',                   replaces: 'Practice Studio with auto-mix' },
    { uses: 'Word, InDesign, PageMaker',              replaces: 'Concert Planner (print-ready programs)' },
    { uses: 'Browsing CPDL by hand',                  replaces: 'Public-Domain Catalog (57k works)' },
  ];
  return (
    <section id="replaces" className="py-16 sm:py-24 md:py-32 bg-slate-50">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#0071e3' }}>
            One platform · One bill · One sign-in
          </p>
          <h2
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-slate-900"
            style={{ ...HEADING_STYLE, letterSpacing: '-0.03em' }}
          >
            What GleeWorld improves.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mt-4">
            Most directors duct-tape ten apps together. GleeWorld is one app
            that knows it's for music.
          </p>
        </div>
        <div className="rounded-3xl bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-[1fr,auto,1fr] sm:grid-cols-[1fr,auto,1fr] text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200">
            <div className="px-4 sm:px-6 py-3">What you use today</div>
            <div className="px-2 py-3" aria-hidden="true" />
            <div className="px-4 sm:px-6 py-3">How GleeWorld does it</div>
          </div>
          {rows.map((r, i) => (
            <div
              key={r.uses}
              className={`grid grid-cols-[1fr,auto,1fr] sm:grid-cols-[1fr,auto,1fr] items-center text-sm sm:text-base ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
            >
              <div className="px-4 sm:px-6 py-3 sm:py-4 text-slate-500">
                {r.uses}
              </div>
              <div className="px-2 text-slate-400" aria-hidden="true">→</div>
              <div className="px-4 sm:px-6 py-3 sm:py-4 text-slate-900 font-semibold">
                {r.replaces}
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-slate-500 mt-8 max-w-2xl mx-auto">
          Simplify the stack. Add the modules you need. Pay for one platform
          built specifically for the way music programs run.
        </p>
      </div>
    </section>
  );
}

function AppleAudienceGrid() {
  const audiences = [
    { title: 'Choir Directors', body: 'Concert, chamber, gospel, jazz vocal — any ensemble.', pastel: '#ede9fe', stat: { label: 'Voice parts tracked', val: 'SATB+' } },
    { title: 'Band Directors', body: 'Marching, concert, jazz, orchestra — every section.', pastel: '#fef3c7', stat: { label: 'Sections', val: '12+' } },
    { title: 'Music Teachers', body: 'K-12 and university classrooms. Class roster + LMS.', pastel: '#dbeafe', stat: { label: 'Classes', val: 'Unlimited' } },
    { title: 'Worship Leaders', body: 'Church choirs and praise teams with liturgical planning.', pastel: '#fce7f3', stat: { label: 'Service planning', val: 'Built-in' } },
  ];
  return (
    <section className="py-16 sm:py-24 md:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12 sm:mb-16">
          <h2
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-slate-900"
            style={{ ...HEADING_STYLE, letterSpacing: '-0.03em' }}
          >
            Built for the way you teach.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {audiences.map((a) => (
            <div
              key={a.title}
              className="rounded-3xl p-8 sm:p-10 md:p-12 min-h-[22rem] flex flex-col justify-between"
              style={{ backgroundColor: a.pastel }}
            >
              <div>
                <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 text-slate-900" style={{ ...HEADING_STYLE, letterSpacing: '-0.02em' }}>
                  {a.title}
                </h3>
                <p className="text-base sm:text-lg text-slate-700 max-w-md">{a.body}</p>
              </div>
              <div className="mt-8 inline-flex items-baseline gap-3 self-start bg-white/70 backdrop-blur rounded-2xl px-5 py-3">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900" style={{ ...HEADING_STYLE, letterSpacing: '-0.02em' }}>{a.stat.val}</span>
                <span className="text-xs sm:text-sm text-slate-600">{a.stat.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Real, live tenant sites used as clickable proof — no login required, no
// mock data. Each maps to one of the four demo tenants provisioned for
// exactly this purpose (gw_tenants slugs demo-choir/demo-district/
// demo-school/demo-songwriter). Update the url if a demo tenant's
// subdomain ever changes.
const EXAMPLE_SITES: Array<{
  title: string; body: string; icon: typeof Church; pastel: string; url: string;
  badge?: string;
}> = [
  // Card order maps directly to the 2×2 grid on desktop:
  //   top-left  = Private Studio      top-right    = Choir & Church
  //   bot-left  = School Program      bottom-right = Enterprise
  {
    title: 'Private Studio',
    body: 'For private teachers and independent musicians — one place where all your music lives together.',
    icon: PenSquare,
    // Warm sand instead of pink — reads more grown-up/premium for a
    // studio professionals charge by the hour out of, without losing
    // the personal warmth pink gave it.
    pastel: '#fef2e2',
    url: 'https://demo-songwriter.gleeworld.org/try',
  },
  {
    title: 'Choir & Church',
    body: 'Sacred music ministry — service planning, choir roster, and a hymnal library, all in one place.',
    icon: Church,
    pastel: '#ede9fe',
    url: 'https://demo-choir.gleeworld.org/try',
  },
  {
    title: 'School Program',
    body: 'A single music classroom — gradebook, attendance, and the rehearsal calendar your students actually check.',
    icon: School,
    pastel: '#fef3c7',
    url: 'https://demo-school.gleeworld.org/try',
  },
  {
    title: 'Enterprise',
    body: 'Every campus, every ensemble, one dashboard — for districts, universities, and multi-site music programs.',
    icon: Building,
    pastel: '#dbeafe',
    url: 'https://demo-district.gleeworld.org/try',
    badge: 'Most sites pick this',
  },
];

function LiveExamplesSection() {
  return (
    <section className="py-16 sm:py-24 md:py-32 bg-white" id="examples">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#0071e3' }}>
            See it live
          </p>
          <h2
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-slate-900"
            style={{ ...HEADING_STYLE, letterSpacing: '-0.03em' }}
          >
            Real apps. Running today.
          </h2>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto mt-4">
            Every program type below is a live GleeWorld sample site — click through and explore. No login required.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {EXAMPLE_SITES.map((s) => (
            <a
              key={s.title}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative rounded-3xl p-8 sm:p-10 min-h-[16rem] flex flex-col justify-between transition-transform hover:scale-[1.015]"
              style={{ backgroundColor: s.pastel }}
            >
              {s.badge && (
                <span
                  className="absolute top-5 right-5 inline-flex items-center rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-800"
                  style={{ backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)' }}
                >
                  {s.badge}
                </span>
              )}
              <div>
                <s.icon className="h-9 w-9 text-slate-900 mb-4" />
                <h3
                  className="text-2xl sm:text-3xl font-bold mb-2 text-slate-900"
                  style={{ ...HEADING_STYLE, letterSpacing: '-0.02em' }}
                >
                  {s.title}
                </h3>
                <p className="text-sm sm:text-base text-slate-700 max-w-sm">{s.body}</p>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 self-start text-sm font-semibold text-slate-900 group-hover:gap-3 transition-all">
                View example site <ArrowRight className="h-4 w-4" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function AppleFeatureRow({
  eyebrow, title, body, mockup, pastel, imageLeft,
}: {
  eyebrow: string; title: string; body: string; mockup: React.ReactNode; pastel: string; imageLeft: boolean;
}) {
  return (
    <section className="py-16 sm:py-24 md:py-32" style={{ backgroundColor: pastel }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className={`grid md:grid-cols-2 gap-10 md:gap-16 items-center ${imageLeft ? '' : 'md:[&>*:first-child]:order-2'}`}>
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200/60 bg-white">
            {mockup}
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#0071e3' }}>
              {eyebrow}
            </p>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-slate-900 mb-5"
              style={{ ...HEADING_STYLE, letterSpacing: '-0.025em' }}
            >
              {title}
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-700 leading-relaxed max-w-lg">{body}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Glee Academy Showcase ───────────────────────────────────────────────
// The Academy is GleeWorld's LMS — comparable in scope to a Canvas or
// Google Classroom, tuned for music programs. Elevated above the
// standard AppleFeatureRow so it can carry all the sub-features (course
// builder, gradebook, attendance, parent portal, resource center, etc.)
// without cramming them into a two-line body.
function GleeAcademyShowcase() {
  const clusters: { title: string; items: string[] }[] = [
    {
      title: 'Build the course',
      items: [
        'AI-assisted course builder (interview)',
        'Syllabus + outcomes',
        'Content modules',
        'Audio + video library',
      ],
    },
    {
      title: 'Teach and assess',
      items: [
        'Assignments',
        'Quizzes, tests, polls',
        'Manual + auto grading',
        'Full gradebook',
      ],
    },
    {
      title: 'Run the class',
      items: [
        'QR-check-in attendance',
        'Class messaging',
        'Instructor Console',
        'Rosters + section groups',
      ],
    },
    {
      title: 'Family + community',
      items: [
        'Parent Portal (K–12)',
        'Teacher Resource Center',
        'Course sharing between teachers',
      ],
    },
  ];
  return (
    <section id="academy" className="py-8 sm:py-14 md:py-20 lg:py-28" style={{ backgroundColor: '#fef3c7' }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#0071e3' }}>
            Glee Academy
          </p>
          <h2
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-slate-900 mb-5"
            style={{ ...HEADING_STYLE, letterSpacing: '-0.03em' }}
          >
            The full LMS, built for music.
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-slate-700 max-w-2xl mx-auto leading-relaxed">
            Course tools you'd expect from a Canvas or Google Classroom —
            plus the pieces music programs actually need. From private
            studios to K–12 to college, every part of the class lives in
            one place.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center mb-12">
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200/60 bg-white order-2 md:order-1">
            <GradebookMockup />
          </div>
          <div className="grid sm:grid-cols-2 gap-4 order-1 md:order-2">
            {clusters.map((c) => (
              <div key={c.title} className="rounded-2xl bg-white/80 backdrop-blur border border-white p-5">
                <h3
                  className="font-bold text-slate-900 mb-3 text-base"
                  style={{ ...HEADING_STYLE, letterSpacing: '-0.01em' }}
                >
                  {c.title}
                </h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  {c.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#10b981' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Ensembles Showcase ──────────────────────────────────────────────────
// The operational life of a choir/band/orchestra — recruit, rehearse,
// perform, stay in touch after they've graduated. Elevated to the same
// scale as GleeAcademyShowcase since Kevin flagged it as the other half
// of the platform's story alongside the LMS.
function EnsemblesShowcase() {
  const clusters: { title: string; items: string[] }[] = [
    {
      title: 'Recruit + roster',
      items: [
        'Audition tracking + recruitment',
        'Student profiles',
        'Wardrobe management',
        'Newsletters (current + graduates)',
      ],
    },
    {
      title: 'Rehearsal ops',
      items: [
        'Multiple attendance methods',
        'Seating chart builder',
        'Sectionals + section groups',
        'In-app video conferencing',
      ],
    },
    {
      title: 'Music + performance',
      items: [
        'Part tracks (voice + instrument)',
        'Music viewer + annotation',
        'iPad-first music library',
        'Sight Reading Studio',
      ],
    },
    {
      title: 'Extras',
      items: [
        'Template course add-ons',
        'Rehearsal plans',
      ],
    },
  ];
  return (
    <section id="ensembles" className="py-8 sm:py-14 md:py-20 lg:py-28" style={{ backgroundColor: '#dcfce7' }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#0071e3' }}>
            Ensembles
          </p>
          <h2
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-slate-900 mb-5"
            style={{ ...HEADING_STYLE, letterSpacing: '-0.03em' }}
          >
            Everything from auditions<br className="hidden sm:block" /> to graduate newsletters.
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-slate-700 max-w-2xl mx-auto leading-relaxed">
            The full life of a choir, band, or orchestra in one place —
            recruit them, rehearse them, perform, and stay in touch after
            they've graduated.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center mb-12">
          <div className="grid sm:grid-cols-2 gap-4 order-2 md:order-1">
            {clusters.map((c) => (
              <div key={c.title} className="rounded-2xl bg-white/80 backdrop-blur border border-white p-5">
                <h3
                  className="font-bold text-slate-900 mb-3 text-base"
                  style={{ ...HEADING_STYLE, letterSpacing: '-0.01em' }}
                >
                  {c.title}
                </h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  {c.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#10b981' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200/60 bg-white order-1 md:order-2">
            <EnsembleRosterMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function AppleHowItWorks() {
  const pillars: {
    Icon: typeof Globe; title: string; body: React.ReactNode;
  }[] = [
    {
      Icon: Globe,
      title: 'Your own workspace, your own address.',
      body: (
        <>
          Every organization runs on its own GleeWorld — its own subdomain
          (<code className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.85em] font-mono text-slate-700">yourorg.gleeworld.org</code>),
          its own users, its own music library, its own branding. Point a
          custom domain any time.
        </>
      ),
    },
    {
      Icon: ShieldCheck,
      title: 'Isolated by the database, not just the app.',
      body: (
        <>
          Every row and every file is tagged with your organization's ID;
          the database itself rejects any read or write from another
          tenant, even if the app has a bug. No admin outside your org
          ever sees a byte of your data.
        </>
      ),
    },
    {
      Icon: Zap,
      title: 'Live in ten minutes, set up personally.',
      body: (
        <>
          One short email — name, size, preferred subdomain — and we
          provision your workspace by hand. You get a login link, invite
          your people, and start. No self-serve maze, no long sales cycle.
        </>
      ),
    },
  ];
  return (
    <section id="how" className="py-16 sm:py-24 md:py-32" style={{ backgroundColor: '#fafafa' }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12 sm:mb-16">
          <h2
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-slate-900"
            style={{ ...HEADING_STYLE, letterSpacing: '-0.03em' }}
          >
            Built for shared use.<br className="hidden sm:block" /> Without shared data.
          </h2>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto mt-5 leading-relaxed">
            Every organization runs on its own GleeWorld — separate address,
            separate database, separate everything — set up personally in
            ten minutes.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {pillars.map((p) => (
            <div key={p.title} className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-100">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }}
              >
                <p.Icon className="w-7 h-7 text-white" strokeWidth={2.2} />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3" style={{ ...HEADING_STYLE, letterSpacing: '-0.015em' }}>
                {p.title}
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-slate-500 mt-10">
          Digging deeper on security or a school DPA? See our{' '}
          <a href="/security" className="text-slate-700 font-semibold underline underline-offset-4 hover:text-slate-900">Trust Center</a>
          {' '}or{' '}
          <a href="/dpa" className="text-slate-700 font-semibold underline underline-offset-4 hover:text-slate-900">DPA for schools</a>.
        </p>
      </div>
    </section>
  );
}

function AppleTrustStrip() {
  const items = [
    { label: 'Your data is yours.', body: 'Private database per site. Full export any time.' },
    { label: 'Always up to date.', body: 'New features ship to you automatically. No upgrade fees.' },
    { label: 'No long contracts.', body: 'Month to month. Cancel any time, we send the full backup.' },
  ];
  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center">
          {items.map((it) => (
            <div key={it.label}>
              <div className="text-2xl sm:text-3xl font-bold mb-3 text-slate-900" style={{ ...HEADING_STYLE, letterSpacing: '-0.02em' }}>
                {it.label}
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-sm mx-auto">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AppleFinalCTA() {
  const { open: openInquiry } = useInquiry();
  return (
    <section className="py-16 sm:py-24 md:py-32 bg-white">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] text-slate-900 mb-6"
          style={{ ...HEADING_STYLE, letterSpacing: '-0.03em' }}
        >
          Ready to begin?
        </h2>
        <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-xl mx-auto mb-10 leading-relaxed">
          Tell us about your group. We'll have your site live by tomorrow.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={openInquiry}
            className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-white transition-transform hover:scale-[1.02]"
            style={{ background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }}
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </button>
          <a
            href={TRY_DEMO_URL}
            className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-semibold"
            style={{ color: '#0071e3' }}
          >
            Try the demo <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

// ── Stripe Payment Links ──────────────────────────────────────────────────
// Create these in Stripe Dashboard → Payment Links, one per PlanTierId, once
// the tier restructure (see docs/superpowers/plans/2026-07-04-tiers-billing.md)
// reaches its launch gate. Each link should wrap the tier's monthly lookup_key
// price and collect: customer email (required), custom field "org_name"
// (text, required), custom field "subdomain" (text, optional).
// Every value here is intentionally null for now — the old ensemble/studio/
// conservatory/university links referenced retired tier ids and pricing, and
// real replacements aren't created until the launch gate in the runbook
// above. Until then every "Talk to us" CTA below falls back to MAILTO_BUY.
const PLAN_CHECKOUT_LINKS: Record<PlanTierId, string | null> = {
  personal: null,
  director_60: null,
  director_150: null,
  institution: null,
};

// Canonical add-on list per Kevin — no à-la-carte pricing. Each add-on is
// included starting at the tier listed here (and every tier above). Kept as
// a compact reference on the landing so prospects can see WHAT they get,
// not a shopping list. Order roughly matches Personal-first inclusion.
const ADDON_MODULES: { name: string; includedFrom: PlanTierId; tagline: string }[] = [
  { name: 'Studio',          includedFrom: 'personal',     tagline: 'Multitrack recording with a real audio engine.' },
  { name: 'Studio Hours',    includedFrom: 'personal',     tagline: 'Bookable teacher time your students can grab.' },
  { name: 'Concert Planner', includedFrom: 'personal',     tagline: 'Print-ready programs with editor credits.' },
  { name: 'Finances',        includedFrom: 'personal',     tagline: 'Contracts, invoicing, and cash-flow tracking.' },
  { name: 'Tour Manager',    includedFrom: 'director_60',  tagline: 'Routes, hotels, weather, manifests.' },
  { name: 'PR Hub',          includedFrom: 'director_60',  tagline: 'Press releases, media kits, and outreach.' },
  { name: 'Box Office',      includedFrom: 'director_150', tagline: 'Ticketing — you keep 100% of ticket sales.' },
  { name: 'Liturgy Planner', includedFrom: 'director_150', tagline: 'Weekly service planning with readings and orders of worship.' },
];

const TIER_LABEL_SHORT: Record<PlanTierId, string> = {
  personal: 'Personal',
  director_60: 'Director',
  director_150: 'Director+',
  institution: 'Institution',
};

function ApplePricing() {
  return (
    <section id="pricing" className="py-16 sm:py-24 md:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#0071e3' }}>
            Pricing
          </p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-slate-900" style={{ ...HEADING_STYLE, letterSpacing: '-0.03em' }}>
            Simple, honest pricing.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mt-4">
            Month-to-month. Cancel any time and we send you a full data export.
          </p>
          {/* Launch promo: free setup through the end of the calendar year.
              When the promo ends, remove this block (or flip the copy). */}
          <div className="mt-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-800 px-4 py-1.5 text-sm font-semibold border border-emerald-200">
              Free setup through Dec 31, 2026 — $0 to get your workspace live.
            </span>
          </div>
        </div>

        {/* items-stretch (default) keeps every card in a row the same height,
            regardless of feature-list length — the CTA sits at the bottom of
            each card thanks to the flex-grow on the <ul> below. */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
          {PLAN_TIERS.map((tier) => {
            // Director (director_60) is the default tenant tier (see
            // DEFAULT_PLAN_TIER in planTiers.ts) and carries the "most
            // popular" treatment. All tiers (including Personal) render at
            // the same size — Personal used to be visually shrunk, but Kevin
            // wants uniform card typography.
            const featured = tier.id === 'director_60';
            const checkoutLink = PLAN_CHECKOUT_LINKS[tier.id];
            const priceLabel = tier.quote ? `From ${formatPrice(tier.monthlyCents)}` : formatPrice(tier.monthlyCents);
            const monthsFree = monthsFreeFor(tier);

            return (
              <div
                key={tier.id}
                className={`relative rounded-3xl flex flex-col p-6 sm:p-8 ${
                  featured ? 'shadow-2xl ring-2' : 'shadow-sm border border-slate-200'
                }`}
                style={{
                  background: TIER_PASTELS[tier.id],
                  ...(featured ? { ['--tw-ring-color' as any]: '#8b5cf6' } : {}),
                }}
              >
                {featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full text-white"
                       style={{ background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }}>
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-xl font-bold text-slate-900 mb-1" style={{ ...HEADING_STYLE, letterSpacing: '-0.015em' }}>
                  {tier.label}
                </h3>
                {/* line-clamp-2 keeps every card's tagline block at a
                    consistent 2-line height regardless of length, so the
                    price line below never sits at a different vertical
                    position across cards. */}
                <p className="text-sm text-slate-600 mb-5 line-clamp-2 min-h-[2.5rem]" title={tier.tagline}>{tier.tagline}</p>
                <div className="mb-5">
                  <span className="text-5xl font-bold text-slate-900" style={{ ...HEADING_STYLE, letterSpacing: '-0.03em' }}>
                    {priceLabel}
                  </span>
                  <span className="text-base text-slate-600">/mo</span>
                </div>
                {monthsFree >= 1 && (
                  <p className="text-xs text-slate-500 -mt-3 mb-5">
                    Annual {formatPrice(tier.annualCents)} · {monthsFree} month{monthsFree === 1 ? '' : 's'} free
                  </p>
                )}
                <ul className="space-y-2.5 mb-8 flex-grow">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#10b981' }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={checkoutLink || MAILTO_BUY}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                  style={featured
                    ? { background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }
                    : { backgroundColor: '#0f172a' }}
                >
                  {/* Every tier is "Choose Plan" per Kevin — self-serve checkout
                      isn't wired yet (PLAN_CHECKOUT_LINKS is all null until the
                      launch gate in docs/superpowers/plans/2026-07-04-tiers-billing.md),
                      so until then the href falls through to MAILTO_BUY for
                      all tiers. */}
                  Choose Plan
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-slate-500 mt-10 max-w-2xl mx-auto">
          Annual billing available on every tier — see each card for exact savings.
          Educational institutions get 20% off all tiers. All plans include hosting, SSL,
          automatic backups, and ongoing platform updates.
        </p>

        {/* Add-ons — no à-la-carte pricing. Each module is included
            starting at the tier listed on its card, and every tier above.
            Landing keeps the list visible so prospects can see the
            functionality shape of each tier at a glance. */}
        <div className="mt-20 sm:mt-24 border-t border-slate-200 pt-12 sm:pt-16">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#0071e3' }}>
              Add-ons
            </p>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-slate-900" style={{ ...HEADING_STYLE, letterSpacing: '-0.03em' }}>
              Included with every plan.
            </h3>
            <p className="text-base text-slate-600 max-w-2xl mx-auto mt-3">
              No add-on à la carte. Every module is included at the tier below and every tier above — Institution gets them all.
            </p>
          </div>
          {/* Card layout stacks name + chip vertically so the module name
              can breathe at text-xl without competing with a wide chip on
              the same baseline. "Included from {Tier}" avoids the
              "Director++" bug that happens when the tier label already
              ends in + and we appended another +. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {ADDON_MODULES.map((m) => (
              <div key={m.name} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-xl" style={{ ...HEADING_STYLE }}>{m.name}</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full whitespace-nowrap">
                    Included from {TIER_LABEL_SHORT[m.includedFrom]}
                  </span>
                </div>
                <p className="text-base text-slate-600 leading-relaxed">{m.tagline}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AppleFooter() {
  return (
    <footer className="py-12 border-t border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <img src="/lovable-uploads/gleeworld-logo.png?v=6" alt="GleeWorld" className="w-5 h-5 rounded" />
          <span className="font-semibold text-slate-700">GleeWorld</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center">
          <a href="#pricing" className="hover:text-slate-700 transition-colors">Pricing</a>
          <a href="/terms" className="hover:text-slate-700 transition-colors">Terms</a>
          <a href="/privacy" className="hover:text-slate-700 transition-colors">Privacy</a>
          <a href="/security" className="hover:text-slate-700 transition-colors">Trust Center</a>
          <a href="/dpa" className="hover:text-slate-700 transition-colors">DPA (Schools)</a>
          <a href={MAILTO_BUY} className="hover:text-slate-700 transition-colors">
            <Mail className="inline h-3 w-3 mr-1" />kevin@gleeworld.org
          </a>
        </div>
        <p>&copy; {new Date().getFullYear()} GleeWorld. All rights reserved.</p>
      </div>
    </footer>
  );
}
