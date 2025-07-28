import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Download, ExternalLink, Mail, Phone, Instagram, Facebook, Twitter, Youtube } from "lucide-react";

const PressKit = () => {
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
      <div className="space-y-12">
        {/* Header */}
        <div className="text-center space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
              Press Kit
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto">
              Media resources for the Spelman College Glee Club
            </p>
          </div>
        </div>

        {/* Quick Facts */}
        <Card className="bg-white/10 backdrop-blur-md border border-white/20">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Facts</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-light">1924</div>
                <div className="text-gray-600">Founded</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-light">100+</div>
                <div className="text-gray-600">Years of Excellence</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-light">50+</div>
                <div className="text-gray-600">Talented Voices</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-light">Global</div>
                <div className="text-gray-600">Recognition</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About Section */}
        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="bg-white/10 backdrop-blur-md border border-white/20">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">About the Glee Club</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  The Spelman College Glee Club, established in 1924, stands as one of the most prestigious collegiate choral ensembles in the world. For nearly a century, we have been dedicated to the preservation and presentation of the rich musical heritage of African Americans while embracing diverse musical traditions.
                </p>
                <p>
                  Our ensemble consists of approximately 50 talented young women who represent the finest in vocal artistry and academic excellence. Under expert direction, the Glee Club maintains the highest standards of musical performance while fostering leadership, sisterhood, and cultural awareness.
                </p>
                <p>
                  From performing at the White House to international concert tours, the Spelman College Glee Club continues to be ambassadors of musical excellence, carrying forward a legacy of artistic distinction that spans generations.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border border-white/20">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">About Spelman College</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Spelman College, a historically Black college established in 1881, is a global leader in the education of women of African descent. Located in Atlanta, Georgia, Spelman is consistently ranked among the top liberal arts colleges in the nation.
                </p>
                <p>
                  The college is renowned for its rigorous academic programs, distinguished faculty, and commitment to developing ethical leaders who will make significant contributions to their communities and the world. Spelman's 2,100 students represent 47 states and 20 countries.
                </p>
                <p>
                  As part of the Atlanta University Center, the world's largest consortium of historically Black colleges and universities, Spelman provides an unparalleled educational experience that combines academic excellence with cultural enrichment and social responsibility.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Director Bio */}
        <Card className="bg-white/10 backdrop-blur-md border border-white/20">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Director Biography</h2>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <div className="aspect-square rounded-lg overflow-hidden shadow-lg">
                  <img 
                    src="/lovable-uploads/ed6eac5a-152a-48d7-b3a2-22e14132926b.png"
                    alt="Director playing piano in black suit - professional portrait"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="lg:col-span-2 space-y-4 text-gray-700">
                <p>
                  Our distinguished director brings decades of experience in choral excellence and musical leadership to the Spelman College Glee Club. With advanced degrees in choral conducting and music education, they have dedicated their career to nurturing young voices and preserving musical traditions.
                </p>
                <p>
                  Under their leadership, the Glee Club has achieved new heights of artistic excellence, performing with renowned orchestras, participating in international festivals, and maintaining the ensemble's reputation as one of the premier collegiate choirs in the world.
                </p>
                <p>
                  Their commitment to musical excellence, combined with a deep understanding of the Glee Club's historical significance, ensures that each generation of Spelman women continues to carry forward this remarkable legacy.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Downloadable Assets */}
        <Card className="bg-white/10 backdrop-blur-md border border-white/20">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Media Resources</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {downloadAssets.map((asset, index) => (
                <div key={index} className="border border-white/20 rounded-lg p-6 bg-white/5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{asset.name}</h3>
                      <Badge variant="secondary" className="mt-2">
                        {asset.format}
                      </Badge>
                    </div>
                    <Button size="sm" variant="outline" className="border-gray-300 text-gray-900 hover:bg-gray-100">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <p className="text-gray-600 text-sm">{asset.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Social Media & Contact */}
        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="bg-white/10 backdrop-blur-md border border-white/20">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Media Contacts</h2>
              <div className="space-y-6">
                {mediaContacts.map((contact, index) => (
                  <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                    <h3 className="font-semibold text-gray-900 mb-2">{contact.name}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-gray-600">
                        <Mail className="h-4 w-4 mr-3" />
                        <a href={`mailto:${contact.email}`} className="hover:text-gray-900 transition-colors">
                          {contact.email}
                        </a>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-4 w-4 mr-3" />
                        <a href={`tel:${contact.phone}`} className="hover:text-gray-900 transition-colors">
                          {contact.phone}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border border-white/20">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Follow Us</h2>
              <div className="space-y-4">
                <p className="text-gray-600 mb-6">
                  Stay connected with the Spelman College Glee Club through our social media channels for the latest news, performances, and behind-the-scenes content.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="border-gray-300 text-gray-900 hover:bg-gray-100" asChild>
                    <a href="https://www.instagram.com/spelmanglee" target="_blank" rel="noopener noreferrer">
                      <Instagram className="h-4 w-4 mr-2" />
                      Instagram
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                  <Button variant="outline" className="border-gray-300 text-gray-900 hover:bg-gray-100" asChild>
                    <a href="https://www.facebook.com/SpelmanGlee" target="_blank" rel="noopener noreferrer">
                      <Facebook className="h-4 w-4 mr-2" />
                      Facebook
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                  <Button variant="outline" className="border-gray-300 text-gray-900 hover:bg-gray-100" asChild>
                    <a href="https://x.com/spelmanglee" target="_blank" rel="noopener noreferrer">
                      <Twitter className="h-4 w-4 mr-2" />
                      X
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                  <Button variant="outline" className="border-gray-300 text-gray-900 hover:bg-gray-100" asChild>
                    <a href="https://www.youtube.com/@spelmancollegegleeclub" target="_blank" rel="noopener noreferrer">
                      <Youtube className="h-4 w-4 mr-2" />
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
        <Card className="bg-white/10 backdrop-blur-md border border-white/20">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Notable Performances</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center space-y-2">
                <div className="text-primary-light font-semibold">The White House</div>
                <div className="text-gray-600 text-sm">Performance for President Barack Obama (2016) — A defining national honor, representing Spelman on the global stage and affirming its reputation as a cultural ambassador of excellence and grace.</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-primary-light font-semibold">State Farm Arena</div>
                <div className="text-gray-600 text-sm">Tabernacle Choir "Hope" Tour (September 2024) — Performed with the Tabernacle Choir and Morehouse College Glee Club in a landmark musical and cultural exchange celebrating unity, diversity, and faith.</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-primary-light font-semibold">Faneuil Hall, Boston</div>
                <div className="text-gray-600 text-sm">Historic Venue Performance — A performance at one of the oldest public gathering spaces in the U.S., reflecting the Glee Club's role in cultural diplomacy and historically resonant venues.</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-primary-light font-semibold">WABE Studios' Serenbe</div>
                <div className="text-gray-600 text-sm">Wildflower Meadow Concert (2024) — Filmed for the Sounds Like ATL series, this visually stunning outdoor performance earned a Southeast Emmy nomination for excellence in sound and production.</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-primary-light font-semibold">Terras sem Sombra Festival, Portugal</div>
                <div className="text-gray-600 text-sm">(2019) — A prestigious international cultural exchange where the Glee Club represented the African-American choral tradition on European soil, blending diplomacy, artistry, and sisterhood.</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-primary-light font-semibold">Jessye Norman Memorial Tribute</div>
                <div className="text-gray-600 text-sm">(2019) — A deeply emotional campus service performance honoring the life of opera legend Jessye Norman, showcasing the Glee Club's ability to meet the moment with beauty, reverence, and power.</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-primary-light font-semibold">Atlanta Symphony Hall</div>
                <div className="text-gray-600 text-sm">"Carlos Simon Curates" (2024) — Featured alongside professional soloists and full orchestra, performing works by Moses Hogan, Hale Smith, and others in a program highlighting Black excellence in classical music.</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-primary-light font-semibold">Mother Emanuel AME Church</div>
                <div className="text-gray-600 text-sm">Charleston, SC (2017) — A healing and commemorative concert at the site of national tragedy, exemplifying the Glee Club's ministry of hope and justice through music.</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-primary-light font-semibold">Lincoln Center</div>
                <div className="text-gray-600 text-sm">Avery Fisher Hall, NYC — Performing in one of the most prestigious concert halls in the world, affirming the Glee Club's stature in the global choral community.</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-primary-light font-semibold">Spelman-Morehouse Christmas Carol Concert</div>
                <div className="text-gray-600 text-sm">Annual Tradition (2023, 2024) — Broadcast via NPR and Georgia Public Broadcasting, this holiday concert remains a beloved cultural staple showcasing Black sacred music, sisterhood, and joy.</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-primary/20 to-secondary/20 border border-white/20">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Feature Our Story?
            </h2>
            <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
              The Spelman College Glee Club is available for interviews, performances, and special features. Contact our media relations team to discuss opportunities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                <Mail className="h-5 w-5 mr-2" />
                Contact Media Relations
              </Button>
              <Button size="lg" variant="outline" className="border-gray-300 text-gray-900 hover:bg-gray-100">
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