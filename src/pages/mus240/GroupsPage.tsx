import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Music, 
  Brain, 
  Scale, 
  Users, 
  TrendingUp, 
  Shield, 
  Gavel, 
  Mic
} from 'lucide-react';

export default function GroupsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AI & Music Industry Research Groups
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Explore current developments and global trends at the intersection of artificial intelligence and the music industry
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">28%</p>
                  <p className="text-sm text-muted-foreground">AI tracks on Deezer daily</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">75M</p>
                  <p className="text-sm text-muted-foreground">Tracks removed by Spotify</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">200+</p>
                  <p className="text-sm text-muted-foreground">Artists signed open letter</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Gavel className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">3</p>
                  <p className="text-sm text-muted-foreground">Major lawsuits filed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Research Groups Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Business & Economics Group */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Scale className="h-6 w-6 text-primary" />
                Business & Economics of AI Music
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant="secondary">Economics</Badge>
                <Badge variant="secondary">Streaming</Badge>
                <Badge variant="secondary">Revenue</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-4 text-sm">
                  <div className="p-4 bg-secondary/20 rounded-lg">
                    <h4 className="font-semibold mb-2">Key Findings:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Deezer reports 28% of daily uploads are fully AI-generated (30,000+ tracks daily)</li>
                      <li>Exponential growth from 10,000 in January to current levels</li>
                      <li>Up to 70% of AI track plays flagged as fraudulent attempts</li>
                      <li>Spotify removed 75+ million "spammy" tracks in 12 months</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-accent/20 rounded-lg">
                    <h4 className="font-semibold mb-2">Platform Responses:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Proprietary AI detection systems implemented</li>
                      <li>Clear labeling of AI-generated content</li>
                      <li>Algorithmic demotion of pure AI content</li>
                      <li>Three-pronged policy: impersonation, spam, transparency</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-primary/10 rounded-lg">
                    <h4 className="font-semibold mb-2">Research Questions:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>How will AI content affect traditional royalty distribution?</li>
                      <li>What economic models work for AI-human collaboration?</li>
                      <li>How can platforms distinguish valuable AI music from spam?</li>
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Legal & Licensing Group */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Gavel className="h-6 w-6 text-primary" />
                Legal Frameworks & Licensing
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant="secondary">Copyright</Badge>
                <Badge variant="secondary">Licensing</Badge>
                <Badge variant="secondary">Legal</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-4 text-sm">
                  <div className="p-4 bg-secondary/20 rounded-lg">
                    <h4 className="font-semibold mb-2">Major Legal Actions:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>RIAA lawsuits against Suno and Udio for unlicensed training data</li>
                      <li>Universal, Sony, Warner taking hardline stance on AI training</li>
                      <li>YouTube seeking licensing deals with major labels</li>
                      <li>200+ artists signed open letter for stronger AI regulation</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-accent/20 rounded-lg">
                    <h4 className="font-semibold mb-2">Protective Technologies:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>SoundPatrol's "neural fingerprinting" technology</li>
                      <li>Detection of subtle AI influence vs. exact copies</li>
                      <li>Universal & Sony partnership for copyright protection</li>
                      <li>Proactive monitoring of AI-generated content</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-primary/10 rounded-lg">
                    <h4 className="font-semibold mb-2">Research Areas:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Fair use doctrine in AI training contexts</li>
                      <li>Artist consent and opt-in licensing models</li>
                      <li>International copyright law harmonization</li>
                      <li>Technology vs. legislation balance</li>
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Cultural Identity Group */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Mic className="h-6 w-6 text-primary" />
                Cultural Identity & Authorship
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant="secondary">Culture</Badge>
                <Badge variant="secondary">Identity</Badge>
                <Badge variant="secondary">Creativity</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-4 text-sm">
                  <div className="p-4 bg-secondary/20 rounded-lg">
                    <h4 className="font-semibold mb-2">Identity Concerns:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Unauthorized AI voice cloning and "deepfake" songs</li>
                      <li>Cultural appropriation through AI music generation</li>
                      <li>Loss of authentic human expression in music</li>
                      <li>Impact on artistic integrity and personal brand</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-accent/20 rounded-lg">
                    <h4 className="font-semibold mb-2">Global Perspectives:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Different cultural views on AI creativity</li>
                      <li>Traditional music preservation vs. innovation</li>
                      <li>Regional differences in AI music adoption</li>
                      <li>Language and cultural barriers in AI training</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-primary/10 rounded-lg">
                    <h4 className="font-semibold mb-2">Study Focus:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>What constitutes authentic musical expression?</li>
                      <li>How do different cultures view AI collaboration?</li>
                      <li>Can AI enhance rather than replace human creativity?</li>
                      <li>Role of cultural context in music AI training</li>
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Artist Impact Group */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Music className="h-6 w-6 text-primary" />
                Impact on Artist Careers
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant="secondary">Careers</Badge>
                <Badge variant="secondary">Performance</Badge>
                <Badge variant="secondary">Innovation</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-4 text-sm">
                  <div className="p-4 bg-secondary/20 rounded-lg">
                    <h4 className="font-semibold mb-2">Career Challenges:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Competition from AI-generated music flooding platforms</li>
                      <li>Revenue dilution from low-quality AI content</li>
                      <li>Need to adapt workflows and skills</li>
                      <li>Balancing AI tools with authentic expression</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-accent/20 rounded-lg">
                    <h4 className="font-semibold mb-2">New Opportunities:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>AI as creative collaboration partner</li>
                      <li>Enhanced production capabilities for independent artists</li>
                      <li>New forms of interactive and personalized music</li>
                      <li>Democratization of music production tools</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-primary/10 rounded-lg">
                    <h4 className="font-semibold mb-2">Research Topics:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>How are musicians adapting their creative process?</li>
                      <li>What skills remain uniquely human in music?</li>
                      <li>Economic impact on different career stages</li>
                      <li>Success stories of AI-human collaboration</li>
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <Card className="border-primary/20">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Join a Research Group</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Select a research focus area that interests you most. Each group will conduct in-depth analysis, 
              present findings, and contribute to our understanding of AI's role in the music industry.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
                Business & Economics
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
                Legal & Licensing
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
                Cultural Identity
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
                Artist Impact
              </Badge>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}