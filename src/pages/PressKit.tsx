import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Download, ExternalLink, Mail, Phone, Instagram, Facebook, Twitter, Youtube, Star, Award, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { useUniversalHeroSlides } from "@/hooks/useUniversalSlider";
import { useBrandingSettings } from "@/hooks/useBrandingSettings";

const PressKit = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { settings: branding } = useBrandingSettings();
  const ensembleName = branding.org_name || branding.short_name || 'Your Ensemble';

  // Pull active press-kit slides from the universal slider table. If the
  // admin hasn't configured any (e.g. fresh template install), fall back to
  // AI-generated placeholders so the page never renders empty.
  const { data: universalSlides = [], isLoading: loading } = useUniversalHeroSlides('press_kit_hero');
  const heroSlides = universalSlides.length > 0
    ? universalSlides.map((s) => ({ id: s.id, image_url: s.imageUrl, title: s.title, description: s.description }))
    : [
        {
          id: 'fallback-1',
          image_url: 'https://image.pollinations.ai/prompt/elegant%20choir%20performing%20on%20concert%20hall%20stage%2C%20warm%20stage%20lighting%2C%20cinematic%2C%20editorial%20photography%20style?width=1600&height=900&nologo=true&seed=11',
          title: 'Performance Excellence',
          description: 'A choir performing at prestigious venues worldwide',
        },
        {
          id: 'fallback-2',
          image_url: 'https://image.pollinations.ai/prompt/african%20american%20musical%20heritage%2C%20gospel%20choir%20singing%2C%20rich%20warm%20colors%2C%20painted%20illustration%20style?width=1600&height=900&nologo=true&seed=22',
          title: 'Musical Heritage',
          description: 'Preserving and celebrating rich musical traditions',
        },
        {
          id: 'fallback-3',
          image_url: 'https://image.pollinations.ai/prompt/young%20choral%20conductor%20leading%20a%20rehearsal%2C%20dramatic%20golden%20hour%20lighting%2C%20editorial%20portrait?width=1600&height=900&nologo=true&seed=33',
          title: 'Leadership Excellence',
          description: 'Developing the next generation of musical and academic leaders',
        },
      ];

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  // Sample copy uses a fictional ensemble — "The {ensembleName}" —
  // so directors visiting this page can see how a press kit would feel for
  // their own group. Replace the names, dates, contacts, and notable
  // performances below with your own.
  const downloadAssets = [
    {
      name: "High-Resolution Logo",
      format: "PNG, SVG",
      description: "Your choir's official logo in formats suited for print, web, and merchandise."
    },
    {
      name: "Performance Photos",
      format: "JPG (300 DPI)",
      description: "Curated press-ready photos from rehearsals, concerts, and tours."
    },
    {
      name: "Director Headshots",
      format: "JPG (300 DPI)",
      description: "Professional headshots of your music director and section leaders."
    },
    {
      name: "Fact Sheet",
      format: "PDF",
      description: "One-page overview: founding year, voicing, repertoire focus, and contact info."
    }
  ];

  const mediaContacts = [
    {
      name: "Media Relations",
      email: "press@riversidechoir.example",
      phone: "(555) 123-4567"
    },
    {
      name: "Music Director",
      email: "director@riversidechoir.example",
      phone: "(555) 123-4568"
    }
  ];

  return (
    <PublicLayout>
      {/* Dark theme wrapper — the press-kit cards were designed for a dark
          page (translucent white/10 over text-white). PublicLayout's cream
          background made everything invisible; this wrapper restores the
          intended editorial-dark look so all text reads clearly. */}
      <div className="bg-[#0b1220] -mt-px">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16 animate-fade-in text-white">
        {/* Hero Header */}
        <div className="relative text-center space-y-8 py-20 overflow-hidden min-h-[80vh] flex items-center justify-center">
          {/* Slideshow Background */}
          {heroSlides.length > 0 && heroSlides.map((slide, index) => (
            <div
              key={slide.id || index}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
                index === currentSlide ? 'opacity-60' : 'opacity-0'
              }`}
              style={{ backgroundImage: `url(${slide.image_url})` }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-black/40"></div>
          
          {/* Slideshow Indicators */}
          {heroSlides.length > 0 && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentSlide 
                      ? 'bg-brand-blue-light scale-125 shadow-lg shadow-brand-blue-light/50' 
                      : 'bg-white/40 hover:bg-white/60 backdrop-blur-sm'
                  }`}
                />
              ))}
            </div>
          )}

          <div className="relative z-10 space-y-8 px-6">
            <div className="flex justify-center mb-8">
              <div className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 shadow-2xl">
                <Award className="h-5 w-5 text-brand-blue-light animate-float" />
                <span className="text-white font-medium">A 50-Year Choral Tradition</span>
              </div>
            </div>
            <h1 className="text-6xl md:text-8xl font-playfair font-bold text-white leading-tight drop-shadow-lg">
              Press Kit
            </h1>
            <div className="max-w-5xl mx-auto px-8">
              <p className="text-2xl md:text-3xl text-white/90 font-medium leading-relaxed">
                Media resources for the <span className="text-brand-blue-light font-semibold">{ensembleName}</span>
              </p>
              <p className="text-2xl md:text-3xl text-white/90 font-medium mt-2">
                A community of voices building something beautiful together
              </p>
            </div>
          </div>
        </div>

        {/* Quick Facts */}
        <Card className="relative overflow-hidden border-0 shadow-2xl bg-white/10 backdrop-blur-xl border border-white/20">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-blue-light/20 via-transparent to-brand-blue-dark/20"></div>
          <CardContent className="relative p-10">
            <div className="flex items-center justify-center mb-8">
              <Star className="h-6 w-6 text-brand-blue-light mr-3" />
              <h2 className="text-3xl font-playfair font-bold text-white">Quick Facts</h2>
              <Star className="h-6 w-6 text-brand-blue-light ml-3" />
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center group hover:scale-105 transition-transform duration-300">
                <div className="text-4xl font-bold text-brand-blue-light mb-2 group-hover:text-white transition-colors drop-shadow-lg">1975</div>
                <div className="text-white/80 font-medium">Founded</div>
              </div>
              <div className="text-center group hover:scale-105 transition-transform duration-300">
                <div className="text-4xl font-bold text-brand-blue-light mb-2 group-hover:text-white transition-colors drop-shadow-lg">60</div>
                <div className="text-white/80 font-medium">Voices on Stage</div>
              </div>
              <div className="text-center group hover:scale-105 transition-transform duration-300">
                <div className="text-4xl font-bold text-brand-blue-light mb-2 group-hover:text-white transition-colors drop-shadow-lg">40+</div>
                <div className="text-white/80 font-medium">Concerts Each Season</div>
              </div>
              <div className="text-center group hover:scale-105 transition-transform duration-300">
                <div className="text-4xl font-bold text-brand-blue-light mb-2 group-hover:text-white transition-colors drop-shadow-lg">3</div>
                <div className="text-white/80 font-medium">International Tours</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About Section */}
        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="group relative overflow-hidden border-0 shadow-2xl hover:shadow-brand-blue-light/20 transition-all duration-500 bg-white/10 backdrop-blur-xl border border-white/20">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-blue-light/20 via-transparent to-brand-blue-dark/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="relative p-8">
              <div className="flex items-center mb-6">
                <Globe className="h-6 w-6 text-brand-blue-light mr-3" />
                <h2 className="text-2xl font-playfair font-bold text-white">About the Choir</h2>
              </div>
              <div className="space-y-4 text-white/90 leading-relaxed">
                <p>
                  The <span className="text-brand-blue-light font-semibold">{ensembleName}</span>, founded in 1975, is a 60-voice ensemble committed to programming that ranges from Renaissance polyphony to brand-new commissioned works. We believe choral music is one of the most direct ways a community can speak with a single voice.
                </p>
                <p>
                  Our singers are <span className="text-white font-semibold">teachers, students, parents, retirees, and working musicians</span> — drawn together by a shared love of the choral art. Weekly rehearsals, two flagship concert weekends a year, plus pop-up performances around town keep the choir woven into community life.
                </p>
                <p>
                  From <span className="text-brand-blue-light font-semibold">cathedral residencies</span> to school outreach concerts to collaborations with local orchestras, the choir's mission is the same wherever it sings: lift voices, lift listeners, and pass the choral tradition forward.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 shadow-2xl hover:shadow-brand-blue-light/20 transition-all duration-500 bg-white/10 backdrop-blur-xl border border-white/20">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="relative p-8">
              <div className="flex items-center mb-6">
                <Award className="h-6 w-6 text-secondary mr-3" />
                <h2 className="text-2xl font-playfair font-bold text-white">Our Mission</h2>
              </div>
              <div className="space-y-4 text-white/80 leading-relaxed">
                <p>
                  The <span className="text-secondary font-semibold">{ensembleName}</span> exists to make excellent choral music accessible — to the people who sing it, the audiences who hear it, and the next generation of musicians learning what is possible with a chorus and a baton.
                </p>
                <p>
                  We program ambitiously and rehearse with discipline. We commission new work from <span className="text-primary font-semibold">living composers</span>, we honor the standard repertoire that earned its place, and we sing music from cultures and traditions that don't always get the spotlight in concert halls.
                </p>
                <p>
                  Above all, we believe singing together — really together — is one of the most human things a community can do. Every concert, every outreach visit, and every commissioned premiere is in service of that belief.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Director Bio */}
        <Card className="relative overflow-hidden border-0 shadow-[var(--shadow-promotional)] bg-gradient-to-r from-background via-primary/5 to-background backdrop-blur-lg">
          <div className="absolute inset-0 bg-[var(--gradient-card)] opacity-50"></div>
          <CardContent className="relative p-10">
            <div className="flex items-center justify-center mb-8">
              <Award className="h-6 w-6 text-primary mr-3 animate-float" />
              <h2 className="text-3xl font-playfair font-bold text-white">Director Biography</h2>
              <Award className="h-6 w-6 text-primary ml-3 animate-float" />
            </div>
            <div className="grid lg:grid-cols-3 gap-10">
              <div className="lg:col-span-1">
                <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl group">
                  <img
                    src="https://image.pollinations.ai/prompt/professional%20choir%20director%20at%20grand%20piano%2C%20black%20suit%2C%20dramatic%20studio%20lighting%2C%20editorial%20portrait%2C%20cinematic?width=1024&height=1024&nologo=true&seed=44"
                    alt="AI-generated portrait of a choir director at the piano"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
              </div>
              <div className="lg:col-span-2 space-y-6 text-white/70 leading-relaxed">
                <p className="text-lg">
                  <span className="text-white font-semibold">Dr. Eleanor Hayes</span> is in her twelfth season as Music Director of the {ensembleName}. She holds a DMA in choral conducting from a major American conservatory and has guest-conducted ensembles across three continents, but it is her work week after week with the same singers that she calls "the real job."
                </p>
                <p className="text-lg">
                  Under her leadership, the choir has <span className="text-white font-semibold">tripled its concert audience</span>, launched an annual commissioning project, and built a tuition-free youth chorus that now feeds dozens of singers into the senior ensemble each year. Her programming pairs the great choral standards with new voices the audience hasn't heard before.
                </p>
                <p className="text-lg">
                  She lives by a simple rehearsal principle: every singer in the room deserves both clear technique and a clear reason the piece exists. That ethic is the heartbeat behind the choir's <span className="text-white font-semibold">distinctive sound</span> and its growing reputation as one of the region's most thoughtful musical organizations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Downloadable Assets */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-secondary/5 to-primary/5 backdrop-blur-lg">
          <div className="absolute top-0 left-0 w-full h-1 bg-[var(--gradient-primary)]"></div>
          <CardContent className="p-10">
            <div className="flex items-center justify-center mb-8">
              <Download className="h-6 w-6 text-secondary mr-3" />
              <h2 className="text-3xl font-playfair font-bold text-white">Media Resources</h2>
              <Download className="h-6 w-6 text-secondary ml-3" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {downloadAssets.map((asset, index) => (
                <div key={index} className="group relative overflow-hidden border border-primary/20 rounded-xl p-6 bg-gradient-to-br from-background to-primary/5 hover:shadow-lg transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-primary transition-colors">{asset.name}</h3>
                      <Badge variant="secondary" className="mt-2 bg-secondary/20 text-secondary border-secondary/30">
                        {asset.format}
                      </Badge>
                    </div>
                    <Button size="sm" variant="outline" className="border-brand-blue-light/50 text-white hover:bg-brand-blue-light hover:text-white transition-all duration-300 group-hover:scale-105 backdrop-blur-sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <p className="relative text-white/80 text-sm leading-relaxed">{asset.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Social Media & Contact */}
        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-[var(--shadow-hover)] transition-all duration-500 bg-gradient-to-br from-primary/5 to-background backdrop-blur-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="relative p-8">
              <div className="flex items-center mb-6">
                <Mail className="h-6 w-6 text-primary mr-3" />
                <h2 className="text-2xl font-playfair font-bold text-white">Media Contacts</h2>
              </div>
              <div className="space-y-6">
                {mediaContacts.map((contact, index) => (
                  <div key={index} className="border-b border-border/50 pb-4 last:border-b-0 last:pb-0">
                    <h3 className="font-semibold text-white mb-2">{contact.name}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-white/80 hover:text-primary transition-colors">
                        <Mail className="h-4 w-4 mr-3" />
                        <a href={`mailto:${contact.email}`} className="hover:underline">
                          {contact.email}
                        </a>
                      </div>
                      <div className="flex items-center text-white/80 hover:text-primary transition-colors">
                        <Phone className="h-4 w-4 mr-3" />
                        <a href={`tel:${contact.phone}`} className="hover:underline">
                          {contact.phone}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-[var(--shadow-hover)] transition-all duration-500 bg-gradient-to-br from-secondary/5 to-background backdrop-blur-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="relative p-8">
              <div className="flex items-center mb-6">
                <Globe className="h-6 w-6 text-secondary mr-3" />
                <h2 className="text-2xl font-playfair font-bold text-white">Follow Us</h2>
              </div>
              <div className="space-y-4">
                <p className="text-white/80 mb-6 leading-relaxed">
                  Follow the {ensembleName} for concert announcements, rehearsal sneak peeks, and the stories behind the music. Replace each handle below with your choir's own.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="border-primary/30 text-white hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 group" asChild>
                    <a href="#" target="_blank" rel="noopener noreferrer">
                      <Instagram className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                      Instagram
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                  <Button variant="outline" className="border-primary/30 text-white hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 group" asChild>
                    <a href="#" target="_blank" rel="noopener noreferrer">
                      <Facebook className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                      Facebook
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                  <Button variant="outline" className="border-primary/30 text-white hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 group" asChild>
                    <a href="#" target="_blank" rel="noopener noreferrer">
                      <Twitter className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                      X
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                  <Button variant="outline" className="border-primary/30 text-white hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 group" asChild>
                    <a href="#" target="_blank" rel="noopener noreferrer">
                      <Youtube className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                      YouTube
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance History Highlights */}
        <Card className="relative overflow-hidden border-0 shadow-[var(--shadow-promotional)] bg-gradient-to-br from-background via-secondary/5 to-primary/5 backdrop-blur-lg">
          <div className="absolute inset-0 bg-[var(--gradient-card)] opacity-30"></div>
          <CardContent className="relative p-10">
            <div className="flex items-center justify-center mb-10">
              <Star className="h-6 w-6 text-secondary mr-3 animate-float" />
              <h2 className="text-3xl font-playfair font-bold text-white">Notable Performances</h2>
              <Star className="h-6 w-6 text-secondary ml-3 animate-float" />
            </div>
            <div className="grid md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="group border-t border-primary/30 pt-6 hover:bg-primary/5 p-4 rounded-lg transition-all duration-300">
                  <div className="text-primary font-semibold mb-3 text-lg group-hover:text-secondary transition-colors">Regional Symphony Hall</div>
                  <div className="text-white/80 text-sm max-w-md leading-relaxed">Season Opening Gala (2024) — A co-billed program with the regional philharmonic featuring Vaughan Williams and a world-premiere work commissioned for the occasion.</div>
                </div>
                <div className="group border-t border-primary/30 pt-6 hover:bg-primary/5 p-4 rounded-lg transition-all duration-300">
                  <div className="text-primary font-semibold mb-3 text-lg group-hover:text-secondary transition-colors">Downtown Cathedral</div>
                  <div className="text-white/80 text-sm max-w-md leading-relaxed">Annual Easter Vigil (2023, 2024, 2025) — A reverent program of sacred choral music in the acoustically renowned downtown cathedral, broadcast live on the local public radio affiliate.</div>
                </div>
                <div className="group border-t border-primary/30 pt-6 hover:bg-primary/5 p-4 rounded-lg transition-all duration-300">
                  <div className="text-primary font-semibold mb-3 text-lg group-hover:text-secondary transition-colors">Choral Festival of the Lakes</div>
                  <div className="text-white/80 text-sm max-w-md leading-relaxed">Featured Ensemble (2024) — Selected by audition to anchor a four-day festival drawing choirs from across the region, sharing the stage with a 200-voice combined chorus finale.</div>
                </div>
                <div className="group border-t border-primary/30 pt-6 hover:bg-primary/5 p-4 rounded-lg transition-all duration-300">
                  <div className="text-primary font-semibold mb-3 text-lg group-hover:text-secondary transition-colors">PBS "Sounds of the Heartland"</div>
                  <div className="text-white/80 text-sm max-w-md leading-relaxed">Featured Episode (2024) — A documentary-style profile pairing concert footage with rehearsal access, earning a regional Emmy nomination for arts programming.</div>
                </div>
                <div className="group border-t border-primary/30 pt-6 hover:bg-primary/5 p-4 rounded-lg transition-all duration-300">
                  <div className="text-primary font-semibold mb-3 text-lg group-hover:text-secondary transition-colors">European Tour</div>
                  <div className="text-white/80 text-sm max-w-md leading-relaxed">Italy &amp; Austria (2023) — A two-week tour with residencies in Florence, Salzburg, and Vienna, including a performance at the Stephansdom and an exchange with a Viennese youth chorus.</div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="group border-t border-primary/30 pt-6 hover:bg-primary/5 p-4 rounded-lg transition-all duration-300">
                  <div className="text-primary font-semibold mb-3 text-lg group-hover:text-secondary transition-colors">Veterans Day Memorial Concert</div>
                  <div className="text-white/80 text-sm max-w-md leading-relaxed">(2024) — A reverent civic program at the city memorial, featuring a newly commissioned setting of veterans' letters home woven through traditional service hymns.</div>
                </div>
                <div className="group border-t border-primary/30 pt-6 hover:bg-primary/5 p-4 rounded-lg transition-all duration-300">
                  <div className="text-primary font-semibold mb-3 text-lg group-hover:text-secondary transition-colors">University Concert Series</div>
                  <div className="text-white/80 text-sm max-w-md leading-relaxed">"Songs of the New World" (2024) — A guest residency featuring works by living American composers, paired with a masterclass for the host university's choral conducting students.</div>
                </div>
                <div className="group border-t border-primary/30 pt-6 hover:bg-primary/5 p-4 rounded-lg transition-all duration-300">
                  <div className="text-primary font-semibold mb-3 text-lg group-hover:text-secondary transition-colors">Community Outreach Series</div>
                  <div className="text-white/80 text-sm max-w-md leading-relaxed">School &amp; Hospice Visits (Ongoing) — A standing commitment to bring music to audiences who can't easily come to the concert hall, including monthly performances at three local care facilities.</div>
                </div>
                <div className="group border-t border-primary/30 pt-6 hover:bg-primary/5 p-4 rounded-lg transition-all duration-300">
                  <div className="text-primary font-semibold mb-3 text-lg group-hover:text-secondary transition-colors">National Choral Convention</div>
                  <div className="text-white/80 text-sm max-w-md leading-relaxed">Showcase Performance (2022) — Selected by blind audition to perform at the national professional conference, presenting a program of premieres alongside historic standards.</div>
                </div>
                <div className="group border-t border-primary/30 pt-6 hover:bg-primary/5 p-4 rounded-lg transition-all duration-300">
                  <div className="text-primary font-semibold mb-3 text-lg group-hover:text-secondary transition-colors">Annual Holiday Concert</div>
                  <div className="text-white/80 text-sm max-w-md leading-relaxed">An annual tradition — A beloved December program of sacred and secular winter music, regularly selling out the cathedral and broadcast on the local public TV station.</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="relative overflow-hidden border-0 shadow-[var(--shadow-promotional)] bg-gradient-to-r from-primary/10 via-secondary/5 to-primary/10 backdrop-blur-lg">
          <div className="absolute inset-0 bg-[var(--gradient-hero)] opacity-20"></div>
          <CardContent className="relative p-12 text-center">
            <div className="flex justify-center mb-6">
              <Star className="h-8 w-8 text-secondary animate-float" />
            </div>
            <h2 className="text-4xl font-playfair font-bold text-white mb-6">
              Ready to Feature Our Story?
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-3xl mx-auto leading-relaxed">
              The <span className="text-primary font-semibold">{ensembleName}</span> is available for interviews, concert previews, and editorial features. Reach out to our media relations contact to discuss timing, repertoire, and access.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button size="lg" className="bg-primary hover:bg-primary/90 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                <Mail className="h-5 w-5 mr-2" />
                Contact Media Relations
              </Button>
              <Button size="lg" variant="outline" className="border-secondary/50 text-white hover:bg-secondary hover:text-secondary-foreground hover:border-secondary hover:scale-105 transition-all duration-300">
                <Download className="h-5 w-5 mr-2" />
                Download Complete Press Kit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </PublicLayout>
  );
};

export default PressKit;