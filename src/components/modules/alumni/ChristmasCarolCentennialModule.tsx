import { useState } from 'react';
import { ModuleWrapper } from '@/components/modules/ModuleWrapper';
import { Sparkles, Calendar, Star, Gift, Music } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ModuleProps } from '@/types/unified-modules';
import { toast } from 'sonner';

export function ChristmasCarolCentennialModule({ user, isFullPage }: ModuleProps) {
  const [loading, setLoading] = useState(false);

  const eventDetails = {
    year: 2026,
    theme: 'A Century of Joy: 100 Years of Christmas Carol Concert',
    mainEvent: {
      date: 'December 6, 2026',
      time: '7:00 PM',
      venue: 'Sisters Chapel',
      ticketsAvailable: true
    },
    fundraisingGoal: 100000,
    fundraisingCurrent: 67500,
    milestones: [
      { year: 1926, description: 'First Christmas Carol Concert' },
      { year: 1950, description: 'Tradition of candlelight processional begins' },
      { year: 1975, description: '50th Anniversary celebration' },
      { year: 2000, description: 'First nationally televised broadcast' },
      { year: 2026, description: 'Centennial Celebration' }
    ]
  };

  const handleDonate = () => {
    toast.success('Thank you for your interest! Redirecting to donation page...');
  };

  const handleRSVP = () => {
    toast.success('RSVP submitted for the Centennial Celebration!');
  };

  const progress = (eventDetails.fundraisingCurrent / eventDetails.fundraisingGoal) * 100;

  return (
    <ModuleWrapper
      title="Christmas Carol Centennial"
      icon={Sparkles}
    >
      <div className="space-y-6">
        {/* Hero Card */}
        <Card className="group bg-gradient-to-br from-amber-500/20 via-red-500/10 to-green-500/10 border-border/50 backdrop-blur-sm overflow-hidden relative hover:shadow-lg transition-all duration-300">
          <div className="absolute top-4 right-4">
            <Badge className="bg-primary/10 text-primary">
              <Star className="h-3 w-3 mr-1" />
              100th Anniversary
            </Badge>
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-semibold group-hover:text-primary transition-colors">{eventDetails.theme}</CardTitle>
            <CardDescription className="leading-relaxed">December 2026 • Sisters Chapel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="gap-2 py-2 px-4 bg-primary/10">
                <Calendar className="h-4 w-4 text-primary" />
                {eventDetails.mainEvent.date}
              </Badge>
              <Badge variant="outline" className="gap-2 py-2 px-4 bg-primary/10">
                <Music className="h-4 w-4 text-primary" />
                {eventDetails.mainEvent.time}
              </Badge>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleRSVP} className="gap-2 group-hover:bg-primary/90 transition-colors">
                <Star className="h-4 w-4" />
                RSVP Now
              </Button>
              <Button onClick={handleDonate} variant="outline" className="gap-2 hover:bg-primary/10 transition-colors">
                <Gift className="h-4 w-4 text-primary" />
                Support the Centennial
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Fundraising Progress */}
        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">Centennial Fund</CardTitle>
            <CardDescription className="leading-relaxed">Help us reach our goal for the 100th celebration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>${eventDetails.fundraisingCurrent.toLocaleString()} raised</span>
                <span className="text-muted-foreground">${eventDetails.fundraisingGoal.toLocaleString()} goal</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
            <Button onClick={handleDonate} className="w-full group-hover:bg-primary/90 transition-colors">
              Contribute to the Centennial Fund
            </Button>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">100 Years of Tradition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative border-l-2 border-primary/30 pl-6 space-y-6">
              {eventDetails.milestones.map((milestone, index) => (
                <div key={milestone.year} className="relative">
                  <div className="absolute -left-8 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                  <div className="flex items-baseline gap-3">
                    <span className="font-bold text-lg text-primary">{milestone.year}</span>
                    <span className="text-muted-foreground leading-relaxed">{milestone.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleWrapper>
  );
}

export default ChristmasCarolCentennialModule;
