import { useState } from 'react';
import { ModuleWrapper } from '@/components/modules/ModuleWrapper';
import { Globe, Calendar, MapPin, Plane, Users, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ModuleProps } from '@/types/unified-modules';
import { toast } from 'sonner';

export function AfricaTripModule({ user, isFullPage }: ModuleProps) {
  const [loading, setLoading] = useState(false);

  const tripInfo = {
    year: 2026,
    destinations: ['Ghana', 'South Africa'],
    dates: 'December 27, 2026 - January 8, 2027',
    theme: 'Roots & Rhythms: A Journey Home',
    highlights: [
      'Cape Coast Castle visit and ceremony',
      'Collaborative concert with South African choirs',
      'Cultural exchange workshops',
      'Visit to Nelson Mandela sites',
      'Traditional music and dance immersion'
    ],
    tripDetails: {
      spotsTotal: 50,
      spotsFilled: 28,
      depositDeadline: 'June 30, 2026',
      estimatedCost: '$6,500'
    }
  };

  const spotsProgress = (tripInfo.tripDetails.spotsFilled / tripInfo.tripDetails.spotsTotal) * 100;

  const handleInterest = () => {
    toast.success('Interest registered! You\'ll receive more information via email.');
  };

  return (
    <ModuleWrapper
      title="Africa Trip"
      icon={Globe}
    >
      <div className="space-y-6">
        {/* Trip Overview */}
        <Card className="group bg-gradient-to-br from-emerald-500/20 via-yellow-500/10 to-red-500/10 border-border/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-primary/10 text-primary">{tripInfo.year} Journey</Badge>
              {tripInfo.destinations.map((dest) => (
                <Badge key={dest} variant="outline" className="bg-primary/5">{dest}</Badge>
              ))}
            </div>
            <CardTitle className="text-2xl font-semibold group-hover:text-primary transition-colors">{tripInfo.theme}</CardTitle>
            <CardDescription className="flex items-center gap-2 leading-relaxed">
              <Calendar className="h-4 w-4 text-primary" />
              {tripInfo.dates}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleInterest} size="lg" className="w-full sm:w-auto group-hover:bg-primary/90 transition-colors">
              <Plane className="h-4 w-4 mr-2" />
              Register Interest
            </Button>
          </CardContent>
        </Card>

        {/* Trip Details */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-[1.01]">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2 group-hover:text-primary transition-colors">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                Trip Availability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{tripInfo.tripDetails.spotsFilled} spots filled</span>
                  <span className="text-muted-foreground">{tripInfo.tripDetails.spotsTotal} total</span>
                </div>
                <Progress value={spotsProgress} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  {tripInfo.tripDetails.spotsTotal - tripInfo.tripDetails.spotsFilled} spots remaining
                </p>
              </div>
              <div className="pt-2 border-t space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Cost:</span>
                  <span className="font-semibold">{tripInfo.tripDetails.estimatedCost}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit Deadline:</span>
                  <span className="font-semibold">{tripInfo.tripDetails.depositDeadline}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-[1.01]">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2 group-hover:text-primary transition-colors">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Info className="h-5 w-5 text-primary" />
                </div>
                Trip Highlights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {tripInfo.highlights.map((highlight, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <div className="p-1 rounded bg-primary/10 mt-0.5">
                      <MapPin className="h-3 w-3 text-primary" />
                    </div>
                    <span className="leading-relaxed">{highlight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Important Notice */}
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Alumni Priority:</strong> As an alumna, you have early access to trip registration. 
              Current members will be notified after the alumni registration period closes.
            </p>
          </CardContent>
        </Card>
      </div>
    </ModuleWrapper>
  );
}

export default AfricaTripModule;
