import React from "react";
import { useQuery } from "@tanstack/react-query";
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
        className="min-h-screen flex items-center justify-center brand-blue-theme"
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
      className="min-h-screen w-full relative brand-blue-theme"
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
                <div className="min-h-screen flex items-center justify-center">
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
                <div className="min-h-screen w-full bg-muted flex items-center justify-center">
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
                    href="mailto:kevin@gleeworld.org?subject=GleeWorld%20for%20my%20group&body=Hi%20Kevin%2C%0A%0AI%27d%20like%20to%20set%20up%20GleeWorld%20for%20my%20group.%0A%0AName%20of%20organization%3A%20%0ASize%20%28approx%20members%29%3A%20%0APreferred%20subdomain%3A%20%0AHow%20did%20you%20find%20us%3F%20%0A%0AThanks%21"
                    className="inline-flex items-center justify-center gap-2 rounded-lg font-bold text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 shadow-xl transition-colors"
                    style={{ backgroundColor: '#fbbf24', color: '#0f172a' }}
                  >
                    Get my own site
                    <ArrowRight className="h-5 w-5" />
                  </a>
                  <a
                    href="mailto:kevin@gleeworld.org?subject=GleeWorld%20demo%20request"
                    className="inline-flex items-center justify-center rounded-lg font-semibold text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 transition-colors"
                    style={{
                      border: '2px solid rgba(255,255,255,0.4)',
                      color: '#ffffff',
                      backgroundColor: 'transparent',
                    }}
                  >
                    Book a demo
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
  'mailto:kevin@gleeworld.org?subject=GleeWorld%20for%20my%20group&body=Hi%20Kevin%2C%0A%0AI%27d%20like%20to%20set%20up%20GleeWorld%20for%20my%20group.%0A%0AName%20of%20organization%3A%20%0ASize%20%28approx%20members%29%3A%20%0APreferred%20subdomain%3A%20%0AHow%20did%20you%20find%20us%3F%20%0A%0AThanks%21';
const MAILTO_DEMO = 'mailto:kevin@gleeworld.org?subject=GleeWorld%20demo%20request';

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
  return (
    <div className="min-h-screen w-full bg-white text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <AppleNav />
      <AppleHero />
      <AppleVideo />
      <AppleProductBig />
      <AppleAudienceGrid />
      <AppleFeatureRow
        eyebrow="Glee Academy"
        title="The LMS built for music."
        body="Run classes the way you actually teach them. Roster, syllabus, attendance, assignments, gradebook — under one roof."
        mockup={<GradebookMockup />}
        pastel="#fef3c7"
        imageLeft={false}
      />
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
        body="Recurring events, sectionals, performances — all in one view your singers can sync to their phones."
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
        eyebrow="Music Library"
        title="Your whole repertoire in one place."
        body="PDF previews, recordings, setlists. Tag by voicing, season, or programme. Searchable in one click."
        mockup={<MusicLibraryMockup />}
        pastel="#d1fae5"
        imageLeft={false}
      />
      <AppleHowItWorks />
      <ApplePricing />
      <AppleTrustStrip />
      <AppleFinalCTA />
      <AppleFooter />
    </div>
  );
}

function AppleNav() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm">
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
        <nav className="hidden sm:flex items-center gap-7 text-sm font-medium text-slate-700">
          <a href="#product" className="hover:text-slate-900 transition-colors">Product</a>
          <a href="#how" className="hover:text-slate-900 transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
          <a href={MAILTO_DEMO} className="hover:text-slate-900 transition-colors">Demo</a>
          <a href="/auth" className="hover:text-slate-900 transition-colors">Sign in</a>
          <a
            href={MAILTO_BUY}
            className="inline-flex items-center rounded-full px-5 py-2 text-sm font-semibold text-white transition-colors hover:scale-[1.02]"
            style={{ background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }}
          >
            Get started
          </a>
        </nav>
        {/* Mobile sign-in (nav is hidden on phones) */}
        <a href="/auth" className="sm:hidden text-sm font-semibold text-slate-700 hover:text-slate-900">Sign in</a>
      </div>
    </header>
  );
}

function AppleHero() {
  // Pull the first active slide from the homepage_hero slider so this hero is
  // controlled by the admin's Hero Manager — not a hardcoded image.
  const { data: slides = [] } = useUniversalHeroSlides("homepage_hero");
  const slide = slides[0];
  const objectPosition = `${slide?.imagePositionX || 'center'} ${slide?.imagePositionY || 'center'}`;

  return (
    <section className="relative bg-[#0a0518] min-h-screen flex items-center justify-center">
      {slide?.imageUrl ? (
        <img
          src={slide.imageUrl}
          alt={slide.title || 'GleeWorld — Run your music program. Beautifully.'}
          className="w-full h-auto block"
          style={{ objectFit: 'contain', objectPosition }}
        />
      ) : (
        // No hero configured — just the gradient backdrop with the CTA strip.
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

      {/* CTA strip at bottom over a dark gradient */}
      <div
        className="absolute inset-x-0 bottom-0 px-6 pt-16 pb-8 sm:pb-12"
        style={{ background: 'linear-gradient(180deg, rgba(10,5,24,0) 0%, rgba(10,5,24,0.92) 70%)' }}
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-3 justify-center items-center">
          <a
            href={MAILTO_BUY}
            className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-base font-semibold text-white transition-transform hover:scale-[1.03] shadow-2xl"
            style={{ background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }}
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href={MAILTO_DEMO}
            className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-base font-semibold transition-colors backdrop-blur-sm"
            style={{ color: '#ffffff', border: '1px solid rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.10)' }}
          >
            Watch a demo <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
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
        <div className="ml-3 px-3 py-0.5 text-[10px] text-slate-500 bg-white rounded border border-slate-200 font-mono">
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
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Members', val: '47', color: '#dbeafe' },
          { label: 'Classes', val: '4', color: '#fce7f3' },
          { label: 'Events', val: '12', color: '#fef3c7' },
          { label: 'Attendance', val: '94%', color: '#d1fae5' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-3" style={{ backgroundColor: s.color }}>
            <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-1">{s.label}</div>
            <div className="text-xl font-bold text-slate-900">{s.val}</div>
          </div>
        ))}
      </div>

      {/* Module tiles */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Academy', color: '#6366f1' },
          { label: 'Calendar', color: '#ec4899' },
          { label: 'Roster', color: '#f59e0b' },
          { label: 'Music', color: '#10b981' },
          { label: 'Messages', color: '#0ea5e9' },
          { label: 'Gradebook', color: '#8b5cf6' },
          { label: 'Shop', color: '#f97316' },
          { label: 'Press Kit', color: '#64748b' },
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
          <div className="text-[10px] sm:text-xs text-slate-500">MUS 240 · Fall 2026</div>
        </div>
        <div className="text-[10px] sm:text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-semibold">Class avg 92%</div>
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-[10px] sm:text-xs text-slate-500 border-b border-slate-200">
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
        <div className="flex gap-2 text-[10px]">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />Present</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#0ea5e9' }} />Excused</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f59e0b' }} />Late</span>
        </div>
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'minmax(7rem,1fr) repeat(5, 2rem)' }}>
        <div />
        {dates.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-slate-500">{d}</div>
        ))}
        {students.map((s, i) => (
          <React.Fragment key={s}>
            <div className="text-slate-700 font-medium py-1">{s}</div>
            {grid[i].map((c, j) => (
              <div
                key={j}
                className="rounded text-white text-[10px] font-bold flex items-center justify-center"
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
        <div className="text-[10px] text-slate-500">4 events</div>
      </div>
      <div className="space-y-2">
        {events.map((e) => (
          <div key={e.name} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50">
            <div className="w-1.5 self-stretch rounded-full" style={{ backgroundColor: e.color }} />
            <div className="flex-1">
              <div className="font-semibold text-slate-900">{e.name}</div>
              <div className="text-[10px] sm:text-xs text-slate-500">{e.day} · {e.t}</div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CommsMockup() {
  return (
    <div className="bg-white p-5 sm:p-6 text-xs sm:text-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-bold text-slate-900">Announcements</div>
        <div className="text-[10px] text-slate-500">3 unread</div>
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
              <span className="text-[10px] text-slate-500">· {m.when}</span>
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 font-semibold">{m.tag}</span>
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
        <div className="text-[10px] text-slate-500">62 pieces</div>
      </div>
      <div className="space-y-1.5">
        {tracks.map((t, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50">
            <div className="w-8 h-10 rounded bg-gradient-to-br from-amber-100 to-rose-100 flex items-center justify-center flex-shrink-0">
              <Music className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900 truncate">{t.title}</div>
              <div className="text-[10px] text-slate-500 truncate">{t.composer}</div>
            </div>
            <div className="text-[10px] sm:text-xs text-slate-400 font-mono">{t.dur}</div>
          </div>
        ))}
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
          Everything your group needs.
          <br />
          <span className="text-slate-400">Nothing it doesn't.</span>
        </h2>
        <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Forty-five modules. One sign-in. No more stitching Google Sheets, Mailchimp,
          Stripe, and Dropbox into something that almost works.
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

function AppleHowItWorks() {
  const steps = [
    { num: '01', title: 'Tell us about your group.', body: 'One short email — name, size, your preferred subdomain.' },
    { num: '02', title: 'We set up your site.', body: 'Ten minutes from request to live. You get a login link.' },
    { num: '03', title: 'Invite your students.', body: 'Bulk-import a roster or invite people one by one.' },
  ];
  return (
    <section id="how" className="py-16 sm:py-24 md:py-32" style={{ backgroundColor: '#fafafa' }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12 sm:mb-16">
          <h2
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-slate-900"
            style={{ ...HEADING_STYLE, letterSpacing: '-0.03em' }}
          >
            From email to live in ten minutes.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((s) => (
            <div key={s.num} className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-100">
              <div
                className="text-6xl font-bold mb-4"
                style={{ background: 'linear-gradient(135deg, #0071e3, #4f46e5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
              >
                {s.num}
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2" style={{ ...HEADING_STYLE, letterSpacing: '-0.015em' }}>
                {s.title}
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
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
          Send one email. We'll have your site live by tomorrow.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={MAILTO_BUY}
            className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-white"
            style={{ background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }}
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href={MAILTO_DEMO}
            className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-semibold"
            style={{ color: '#0071e3' }}
          >
            Book a demo <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

// ── Demo video ────────────────────────────────────────────────────────────
// REPLACE this with your Loom embed URL when you record the walkthrough.
// Get it from Loom → Share → "Embed code" → copy just the URL after src="...".
// Until then we show a "Coming soon" placeholder.
const LOOM_EMBED_URL: string | null = null; // e.g. "https://www.loom.com/embed/XXXXXXXXXXXX"

function AppleVideo() {
  return (
    <section className="py-16 sm:py-24 md:py-32" style={{ backgroundColor: '#f5f5f7' }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#0071e3' }}>
            See it in action
          </p>
          <h2
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-slate-900"
            style={{ ...HEADING_STYLE, letterSpacing: '-0.03em' }}
          >
            90 seconds. The whole product.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mt-4">
            A real director walking through the dashboard, gradebook, attendance, and music library.
            No sales pitch — just the software.
          </p>
        </div>

        <div className="rounded-3xl overflow-hidden shadow-2xl bg-slate-900 aspect-video">
          {LOOM_EMBED_URL ? (
            <iframe
              src={LOOM_EMBED_URL}
              title="GleeWorld product walkthrough"
              frameBorder="0"
              allowFullScreen
              className="w-full h-full"
            />
          ) : (
            <a
              href={MAILTO_DEMO}
              className="w-full h-full flex flex-col items-center justify-center text-center px-6 hover:bg-slate-800 transition-colors"
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div className="text-white text-xl sm:text-2xl font-bold mb-2" style={{ letterSpacing: '-0.015em' }}>
                Walkthrough video coming soon
              </div>
              <div className="text-slate-300 text-sm sm:text-base max-w-md">
                Want a live tour right now? Email us — we'll send you a private link
                and a calendar invite within one business day.
              </div>
              <div className="mt-6 text-sky-300 text-sm font-semibold">Book a live demo →</div>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Stripe Payment Links ──────────────────────────────────────────────────
// Create these in Stripe Dashboard → Payment Links. Each one wraps a
// recurring price. Make sure the Stripe checkout has:
//   • Collect customer email = required
//   • Custom field "org_name" (text, required)
//   • Custom field "subdomain" (text, optional) — used as their site URL slug
// Paste each Payment Link URL below. Until then the buttons gracefully fall
// back to the contact email.
const STRIPE_LINKS: Record<string, string | null> = {
  solo:        "https://buy.stripe.com/14A14m2C8bir73qfqf4Vy00",
  school:      "https://buy.stripe.com/6oUaEW7Ws0DN87u5PF4Vy01",
  institution: "https://buy.stripe.com/cNibJ00u0aen9bya5V4Vy02",
};

function ApplePricing() {
  const tiers = [
    {
      key: 'solo',
      name: 'Solo Director',
      price: '$49',
      cadence: '/month',
      tagline: 'For independent choir or band directors.',
      bullets: [
        'Up to 60 members',
        'All 45 modules',
        'Your subdomain (yourname.gleeworld.org)',
        'Branded logo + colors',
        'Email + chat support',
      ],
      cta: 'Start with Solo',
      pastel: '#f0f9ff',
      featured: false,
    },
    {
      key: 'school',
      name: 'School / Program',
      price: '$99',
      cadence: '/month',
      tagline: 'For school music programs and small ensembles.',
      bullets: [
        'Up to 250 members',
        'All 45 modules',
        'Your subdomain + optional custom domain',
        'Branded logo + colors + tagline',
        'Priority support (24h)',
        'Bulk roster import',
      ],
      cta: 'Most popular — start here',
      pastel: 'linear-gradient(180deg, #ede9fe 0%, #fce7f3 100%)',
      featured: true,
    },
    {
      key: 'institution',
      name: 'Institution',
      price: '$299',
      cadence: '/month',
      tagline: 'For universities, dioceses, and multi-ensemble programs.',
      bullets: [
        'Unlimited members',
        'All 45 modules',
        'Custom domain included',
        'Full white-label (your branding everywhere)',
        'Priority support (4h business hours)',
        'Onboarding call + data migration',
      ],
      cta: 'Talk to us',
      pastel: '#fef3c7',
      featured: false,
    },
  ];
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
            Month-to-month. No setup fees. Cancel any time and we send you a full data export.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-3xl p-8 sm:p-10 flex flex-col ${t.featured ? 'shadow-2xl ring-2' : 'shadow-sm border border-slate-200'}`}
              style={{
                background: t.pastel,
                ...(t.featured ? { ['--tw-ring-color' as any]: '#8b5cf6' } : {}),
              }}
            >
              {t.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full text-white"
                     style={{ background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }}>
                  MOST POPULAR
                </div>
              )}
              <h3 className="text-xl font-bold text-slate-900 mb-1" style={{ ...HEADING_STYLE, letterSpacing: '-0.015em' }}>
                {t.name}
              </h3>
              <p className="text-sm text-slate-600 mb-5">{t.tagline}</p>
              <div className="mb-5">
                <span className="text-5xl font-bold text-slate-900" style={{ ...HEADING_STYLE, letterSpacing: '-0.03em' }}>{t.price}</span>
                <span className="text-base text-slate-600">{t.cadence}</span>
              </div>
              <ul className="space-y-2.5 mb-8 flex-grow">
                {t.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#10b981' }} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <a
                href={STRIPE_LINKS[t.key] || MAILTO_BUY}
                className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                style={t.featured
                  ? { background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }
                  : { backgroundColor: '#0f172a' }}
              >
                {t.cta}
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-slate-500 mt-10 max-w-2xl mx-auto">
          Annual plans available (save 2 months). Educational institutions get 20% off all tiers.
          All plans include hosting, SSL, automatic backups, and ongoing platform updates.
        </p>
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
          <a href={MAILTO_BUY} className="hover:text-slate-700 transition-colors">
            <Mail className="inline h-3 w-3 mr-1" />kevin@gleeworld.org
          </a>
        </div>
        <p>&copy; {new Date().getFullYear()} GleeWorld. All rights reserved.</p>
      </div>
    </footer>
  );
}
