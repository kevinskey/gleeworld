import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Download, ExternalLink, Mail, Phone, Instagram, Facebook, Twitter, Youtube, Star, Award, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const PressKit = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchPressKitSlides = async () => {
      try {
        const { data: slides, error } = await supabase
          .from('gw_hero_slides')
          .select('*')
          .eq('usage_context', 'press_kit')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) {
          console.error('Error fetching press kit slides:', error);
          // Fallback to hardcoded images if database fetch fails
          setHeroSlides([
            {
              id: '1',
              image_url: '/lovable-uploads/6a86e8cc-1420-4397-8742-983afe6a293f.png',
              title: 'Performance Excellence',
              description: 'The Spelman College Glee Club performing at prestigious venues worldwide'
            },
            {
              id: '2', 
              image_url: '/lovable-uploads/d2719d93-5439-4d49-9d9a-0f68a440e7c5.png',
              title: 'Musical Heritage',
              description: 'Preserving and celebrating the rich musical traditions of African Americans'
            },
            {
              id: '3',
              image_url: '/lovable-uploads/82759e4e-12b8-47a8-907b-7b6b22294919.png',
              title: 'Leadership Excellence',
              description: 'Developing the next generation of musical and academic leaders'
            }
          ]);
        } else {
          setHeroSlides(slides || []);
        }
      } catch (error) {
        console.error('Unexpected error fetching slides:', error);
        // Fallback to hardcoded images
        setHeroSlides([
          {
            id: '1',
            image_url: '/lovable-uploads/6a86e8cc-1420-4397-8742-983afe6a293f.png',
            title: 'Performance Excellence',
            description: 'The Spelman College Glee Club performing at prestigious venues worldwide'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchPressKitSlides();
  }, []);

  useEffect(() => {
    if (heroSlides.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [heroSlides.length]);

  const downloadAssets = [
    {
      name: "High-Resolution Logo",
      format: "PNG, SVG",
      description: "Official Spelman College Glee Club logo in various formats"
    },
    {
      name: "Performance Photos",
      format: "JPG (300 DPI)",
      description: "Collection of professional performance and rehearsal photos"
    },
    {
      name: "Director Headshots",
      format: "JPG (300 DPI)", 
      description: "Professional headshots of our director and key personnel"
    },
    {
      name: "Fact Sheet",
      format: "PDF",
      description: "Quick facts and figures about the Glee Club"
    }
  ];

  const mediaContacts = [
    {
      name: "Media Relations",
      email: "media@spelman.edu",
      phone: "(404) 270-5555"
    },
    {
      name: "Glee Club Director",
      email: "gleeclub@spelman.edu", 
      phone: "(404) 270-5200"
    }
  ];

  return (
    <PublicLayout>
      <div className="space-y-16 animate-fade-in">
        {/* Hero Header */}
        <div className="relative text-center space-y-8 py-20 overflow-hidden min-h-[80vh] flex items-center justify-center">
          {/* Slideshow Background */}
          {heroSlides.length > 0 && heroSlides.map((slide, index) => (
            <div
              key={slide.id || index}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
                index === currentSlide ? 'opacity-30' : 'opacity-0'
              }`}
              style={{ backgroundImage: `url(${slide.image_url})` }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20"></div>
          
          {/* Slideshow Indicators */}
          {heroSlides.length > 0 && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentSlide 
                      ? 'bg-primary scale-125' 
                      : 'bg-primary/40 hover:bg-primary/60'
                  }`}
                />
              ))}
            </div>
          )}

          <div className="relative z-10 space-y-8 px-6">
            <div className="flex justify-center mb-8">
              <div className="flex items-center gap-2 px-6 py-3 bg-background/90 backdrop-blur-lg rounded-full border border-primary/30 shadow-xl">
                <Award className="h-5 w-5 text-primary animate-float" />
                <span className="text-primary font-medium">100+ Years of Excellence</span>
              </div>
            </div>
            <h1 className="text-6xl md:text-8xl font-playfair font-bold text-foreground leading-tight drop-shadow-lg">
              Press Kit
            </h1>
            <div className="max-w-5xl mx-auto px-8">
              <p className="text-2xl md:text-3xl text-muted-foreground font-medium leading-relaxed">
                Media resources for the <span className="text-primary font-semibold">Spelman College Glee Club</span>
              </p>
              <p className="text-2xl md:text-3xl text-muted-foreground font-medium mt-2">
                Cultural ambassadors of musical excellence
              </p>
            </div>
          </div>
        </div>

        {/* Quick Facts */}
        <Card className="relative overflow-hidden border-0 shadow-[var(--shadow-promotional)] bg-[var(--gradient-card)] backdrop-blur-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5"></div>
          <CardContent className="relative p-10">
            <div className="flex items-center justify-center mb-8">
              <Star className="h-6 w-6 text-secondary mr-3" />
              <h2 className="text-3xl font-playfair font-bold text-foreground">Quick Facts</h2>
              <Star className="h-6 w-6 text-secondary ml-3" />
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center group hover:scale-105 transition-transform duration-300">
                <div className="text-4xl font-bold text-primary mb-2 group-hover:text-secondary transition-colors">1924</div>
                <div className="text-muted-foreground font-medium">Founded</div>
              </div>
              <div className="text-center group hover:scale-105 transition-transform duration-300">
                <div className="text-4xl font-bold text-primary mb-2 group-hover:text-secondary transition-colors">100+</div>
                <div className="text-muted-foreground font-medium">Years of Excellence</div>
              </div>
              <div className="text-center group hover:scale-105 transition-transform duration-300">
                <div className="text-4xl font-bold text-primary mb-2 group-hover:text-secondary transition-colors">50+</div>
                <div className="text-muted-foreground font-medium">Talented Voices</div>
              </div>
              <div className="text-center group hover:scale-105 transition-transform duration-300">
                <div className="text-4xl font-bold text-primary mb-2 group-hover:text-secondary transition-colors">Global</div>
                <div className="text-muted-foreground font-medium">Recognition</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About Section */}
        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-[var(--shadow-hover)] transition-all duration-500 bg-gradient-to-br from-primary/5 to-secondary/5 backdrop-blur-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="relative p-8">
              <div className="flex items-center mb-6">
                <Globe className="h-6 w-6 text-primary mr-3" />
                <h2 className="text-2xl font-playfair font-bold text-foreground">About the Glee Club</h2>
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  The <span className="text-primary font-semibold">Spelman College Glee Club</span>, established in 1924, stands as one of the most prestigious collegiate choral ensembles in the world. For nearly a century, we have been dedicated to the preservation and presentation of the rich musical heritage of African Americans while embracing diverse musical traditions.
                </p>
                <p>
                  Our ensemble consists of approximately <span className="text-secondary font-semibold">50 talented young women</span> who represent the finest in vocal artistry and academic excellence. Under expert direction, the Glee Club maintains the highest standards of musical performance while fostering leadership, sisterhood, and cultural awareness.
                </p>
                <p>
                  From performing at the <span className="text-primary font-semibold">White House</span> to international concert tours, the Spelman College Glee Club continues to be ambassadors of musical excellence, carrying forward a legacy of artistic distinction that spans generations.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-[var(--shadow-hover)] transition-all duration-500 bg-gradient-to-br from-secondary/5 to-primary/5 backdrop-blur-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="relative p-8">
              <div className="flex items-center mb-6">
                <Award className="h-6 w-6 text-secondary mr-3" />
                <h2 className="text-2xl font-playfair font-bold text-foreground">About Spelman College</h2>
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  <span className="text-secondary font-semibold">Spelman College</span>, a historically Black college established in 1881, is a global leader in the education of women of African descent. Located in Atlanta, Georgia, Spelman is consistently ranked among the top liberal arts colleges in the nation.
                </p>
                <p>
                  The college is renowned for its rigorous academic programs, distinguished faculty, and commitment to developing ethical leaders who will make significant contributions to their communities and the world. Spelman's <span className="text-primary font-semibold">2,100 students</span> represent 47 states and 20 countries.
                </p>
                <p>
                  As part of the Atlanta University Center, the world's largest consortium of historically Black colleges and universities, Spelman provides an unparalleled educational experience that combines academic excellence with cultural enrichment and social responsibility.
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
              <h2 className="text-3xl font-playfair font-bold text-foreground">Director Biography</h2>
              <Award className="h-6 w-6 text-primary ml-3 animate-float" />
            </div>
            <div className="grid lg:grid-cols-3 gap-10">
              <div className="lg:col-span-1">
                <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl group">
                  <img 
                    src="/lovable-uploads/ed6eac5a-152a-48d7-b3a2-22e14132926b.png"
                    alt="Director playing piano in black suit - professional portrait"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
              </div>
              <div className="lg:col-span-2 space-y-6 text-muted-foreground leading-relaxed">
                <p className="text-lg">
                  Our distinguished director brings <span className="text-primary font-semibold">decades of experience</span> in choral excellence and musical leadership to the Spelman College Glee Club. With advanced degrees in choral conducting and music education, they have dedicated their career to nurturing young voices and preserving musical traditions.
                </p>
                <p className="text-lg">
                  Under their leadership, the Glee Club has achieved <span className="text-secondary font-semibold">new heights of artistic excellence</span>, performing with renowned orchestras, participating in international festivals, and maintaining the ensemble's reputation as one of the premier collegiate choirs in the world.
                </p>
                <p className="text-lg">
                  Their commitment to musical excellence, combined with a deep understanding of the Glee Club's historical significance, ensures that each generation of Spelman women continues to carry forward this <span className="text-primary font-semibold">remarkable legacy</span>.
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
              <h2 className="text-3xl font-playfair font-bold text-foreground">Media Resources</h2>
              <Download className="h-6 w-6 text-secondary ml-3" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {downloadAssets.map((asset, index) => (
                <div key={index} className="group relative overflow-hidden border border-primary/20 rounded-xl p-6 bg-gradient-to-br from-background to-primary/5 hover:shadow-lg transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{asset.name}</h3>
                      <Badge variant="secondary" className="mt-2 bg-secondary/20 text-secondary border-secondary/30">
                        {asset.format}
                      </Badge>
                    </div>
                    <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 group-hover:scale-105">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <p className="relative text-muted-foreground text-sm leading-relaxed">{asset.description}</p>
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
                <h2 className="text-2xl font-playfair font-bold text-foreground">Media Contacts</h2>
              </div>
              <div className="space-y-6">
                {mediaContacts.map((contact, index) => (
                  <div key={index} className="border-b border-border/50 pb-4 last:border-b-0 last:pb-0">
                    <h3 className="font-semibold text-foreground mb-2">{contact.name}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-muted-foreground hover:text-primary transition-colors">
                        <Mail className="h-4 w-4 mr-3" />
                        <a href={`mailto:${contact.email}`} className="hover:underline">
                          {contact.email}
                        </a>
                      </div>
                      <div className="flex items-center text-muted-foreground hover:text-primary transition-colors">
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
                <h2 className="text-2xl font-playfair font-bold text-foreground">Follow Us</h2>
              </div>
              <div className="space-y-4">
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Stay connected with the Spelman College Glee Club through our social media channels for the latest news, performances, and behind-the-scenes content.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="border-primary/30 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 group" asChild>
                    <a href="https://www.instagram.com/spelmanglee" target="_blank" rel="noopener noreferrer">
                      <Instagram className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                      Instagram
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                  <Button variant="outline" className="border-primary/30 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 group" asChild>
                    <a href="https://www.facebook.com/SpelmanGlee" target="_blank" rel="noopener noreferrer">
                      <Facebook className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                      Facebook
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                  <Button variant="outline" className="border-primary/30 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 group" asChild>
                    <a href="https://x.com/spelmanglee" target="_blank" rel="noopener noreferrer">
                      <Twitter className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                      X
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                  <Button variant="outline" className="border-primary/30 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 group" asChild>
                    <a href="https://www.youtube.com/@spelmancollegegleeclub" target="_blank" rel="noopener noreferrer">
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
              <h2 className="text-3xl font-playfair font-bold text-foreground">Notable Performances</h2>
              <Star className="h-6 w-6 text-secondary ml-3 animate-float" />
            </div>
            <div className="grid md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="group border-t border-primary/30 pt-6 hover:bg-primary/5 p-4 rounded-lg transition-all duration-300">
                  <div className="text-primary font-semibold mb-3 text-lg group-hover:text-secondary transition-colors">The White House</div>
                  <div className="text-muted-foreground text-sm max-w-md leading-relaxed">Performance for President Barack Obama (2016) — A defining national honor, representing Spelman on the global stage and affirming its reputation as a cultural ambassador of excellence and grace.</div>
                </div>
                <div className="group border-t border-primary/30 pt-6 hover:bg-primary/5 p-4 rounded-lg transition-all duration-300">
                  <div className="text-primary font-semibold mb-3 text-lg group-hover:text-secondary transition-colors">State Farm Arena</div>
                  <div className="text-muted-foreground text-sm max-w-md leading-relaxed">Tabernacle Choir "Hope" Tour (September 2024) — Performed with the Tabernacle Choir and Morehouse College Glee Club in a landmark musical and cultural exchange celebrating unity, diversity, and faith.</div>
                </div>
                <div className="group border-t border-primary/30 pt-6 hover:bg-primary/5 p-4 rounded-lg transition-all duration-300">
                  <div className="text-primary font-semibold mb-3 text-lg group-hover:text-secondary transition-colors">Faneuil Hall, Boston</div>
                  <div className="text-muted-foreground text-sm max-w-md leading-relaxed">Historic Venue Performance — A performance at one of the oldest public gathering spaces in the U.S., reflecting the Glee Club's role in cultural diplomacy and historically resonant venues.</div>
                </div>
                <div className="group border-t border-primary/30 pt-6 hover:bg-primary/5 p-4 rounded-lg transition-all duration-300">
                  <div className="text-primary font-semibold mb-3 text-lg group-hover:text-secondary transition-colors">WABE Studios' Serenbe</div>
                  <div className="text-muted-foreground text-sm max-w-md leading-relaxed">Wildflower Meadow Concert (2024) — Filmed for the Sounds Like ATL series, this visually stunning outdoor performance earned a Southeast Emmy nomination for excellence in sound and production.</div>
                </div>
                <div className="group border-t border-primary/30 pt-6 hover:bg-primary/5 p-4 rounded-lg transition-all duration-300">
                  <div className="text-primary font-semibold mb-3 text-lg group-hover:text-secondary transition-colors">Terras sem Sombra Festival, Portugal</div>
                  <div className="text-muted-foreground text-sm max-w-md leading-relaxed">(2019) — A prestigious international cultural exchange where the Glee Club represented the African-American choral tradition on European soil, blending diplomacy, artistry, and sisterhood.</div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="group border-t border-primary/30 pt-6 hover:bg-primary/5 p-4 rounded-lg transition-all duration-300">
                  <div className="text-primary font-semibold mb-3 text-lg group-hover:text-secondary transition-colors">Jessye Norman Memorial Tribute</div>
                  <div className="text-muted-foreground text-sm max-w-md leading-relaxed">(2019) — A deeply emotional campus service performance honoring the life of opera legend Jessye Norman, showcasing the Glee Club's ability to meet the moment with beauty, reverence, and power.</div>
                </div>
                <div className="group border-t border-primary/30 pt-6 hover:bg-primary/5 p-4 rounded-lg transition-all duration-300">
                  <div className="text-primary font-semibold mb-3 text-lg group-hover:text-secondary transition-colors">Atlanta Symphony Hall</div>
                  <div className="text-muted-foreground text-sm max-w-md leading-relaxed">"Carlos Simon Curates" (2024) — Featured alongside professional soloists and full orchestra, performing works by Moses Hogan, Hale Smith, and others in a program highlighting Black excellence in classical music.</div>
                </div>
                <div className="group border-t border-primary/30 pt-6 hover:bg-primary/5 p-4 rounded-lg transition-all duration-300">
                  <div className="text-primary font-semibold mb-3 text-lg group-hover:text-secondary transition-colors">Mother Emanuel AME Church</div>
                  <div className="text-muted-foreground text-sm max-w-md leading-relaxed">Charleston, SC (2017) — A healing and commemorative concert at the site of national tragedy, exemplifying the Glee Club's ministry of hope and justice through music.</div>
                </div>
                <div className="group border-t border-primary/30 pt-6 hover:bg-primary/5 p-4 rounded-lg transition-all duration-300">
                  <div className="text-primary font-semibold mb-3 text-lg group-hover:text-secondary transition-colors">Lincoln Center</div>
                  <div className="text-muted-foreground text-sm max-w-md leading-relaxed">Avery Fisher Hall, NYC — Performing in one of the most prestigious concert halls in the world, affirming the Glee Club's stature in the global choral community.</div>
                </div>
                <div className="group border-t border-primary/30 pt-6 hover:bg-primary/5 p-4 rounded-lg transition-all duration-300">
                  <div className="text-primary font-semibold mb-3 text-lg group-hover:text-secondary transition-colors">Spelman-Morehouse Christmas Carol Concert</div>
                  <div className="text-muted-foreground text-sm max-w-md leading-relaxed">Annual Tradition (2023, 2024) — Broadcast via NPR and Georgia Public Broadcasting, this holiday concert remains a beloved cultural staple showcasing Black sacred music, sisterhood, and joy.</div>
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
            <h2 className="text-4xl font-playfair font-bold text-foreground mb-6">
              Ready to Feature Our Story?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              The <span className="text-primary font-semibold">Spelman College Glee Club</span> is available for interviews, performances, and special features. Contact our media relations team to discuss opportunities.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button size="lg" className="bg-primary hover:bg-primary/90 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                <Mail className="h-5 w-5 mr-2" />
                Contact Media Relations
              </Button>
              <Button size="lg" variant="outline" className="border-secondary/50 text-foreground hover:bg-secondary hover:text-secondary-foreground hover:border-secondary hover:scale-105 transition-all duration-300">
                <Download className="h-5 w-5 mr-2" />
                Download Complete Press Kit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
};

export default PressKit;