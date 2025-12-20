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
        <Card className="bg-gradient-to-br from-emerald-500/20 via-yellow-500/10 to-red-500/10 border-emerald-500/30">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-emerald-500">{tripInfo.year} Journey</Badge>
              {tripInfo.destinations.map((dest) => (
                <Badge key={dest} variant="outline">{dest}</Badge>
              ))}
            </div>
            <CardTitle className="text-2xl">{tripInfo.theme}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {tripInfo.dates}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleInterest} size="lg" className="w-full sm:w-auto">
              <Plane className="h-4 w-4 mr-2" />
              Register Interest
            </Button>
          </CardContent>
        </Card>

        {/* Trip Details */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-500" />
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

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5 text-emerald-500" />
                Trip Highlights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {tripInfo.highlights.map((highlight, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                    {highlight}
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
