import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Download, ExternalLink, Mail, Phone, Instagram, Facebook, Youtube } from "lucide-react";

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
                  <Button variant="outline" className="border-gray-300 text-gray-900 hover:bg-gray-100">
                    <Instagram className="h-4 w-4 mr-2" />
                    Instagram
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                  <Button variant="outline" className="border-gray-300 text-gray-900 hover:bg-gray-100">
                    <Facebook className="h-4 w-4 mr-2" />
                    Facebook
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                  <Button variant="outline" className="border-gray-300 text-gray-900 hover:bg-gray-100">
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                    </svg>
                    TikTok
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                  <Button variant="outline" className="border-gray-300 text-gray-900 hover:bg-gray-100">
                    <Youtube className="h-4 w-4 mr-2" />
                    YouTube
                    <ExternalLink className="h-4 w-4 ml-2" />
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
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className="text-primary-light font-semibold">The White House</div>
                <div className="text-gray-600 text-sm">Presidential performances and special events</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-primary-light font-semibold">International Tours</div>
                <div className="text-gray-600 text-sm">Cultural ambassadors across continents</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-primary-light font-semibold">Carnegie Hall</div>
                <div className="text-gray-600 text-sm">Prestigious venue performances</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-primary-light font-semibold">Grammy Events</div>
                <div className="text-gray-600 text-sm">Music industry recognition</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-primary-light font-semibold">Olympic Games</div>
                <div className="text-gray-600 text-sm">Opening and closing ceremonies</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-primary-light font-semibold">Major Networks</div>
                <div className="text-gray-600 text-sm">Television and media appearances</div>
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