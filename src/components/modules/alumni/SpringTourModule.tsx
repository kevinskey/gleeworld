import { useState } from 'react';
import { ModuleWrapper } from '@/components/modules/ModuleWrapper';
import { Plane, Calendar, MapPin, Clock, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ModuleProps } from '@/types/unified-modules';
import { toast } from 'sonner';

export function SpringTourModule({ user, isFullPage }: ModuleProps) {
  const [loading, setLoading] = useState(false);

  const tourInfo = {
    year: 2025,
    theme: 'Voices of Hope',
    dates: 'March 8-16, 2025',
    destinations: [
      { city: 'Washington D.C.', date: 'March 8-9', venue: 'Kennedy Center', performance: 'Evening Concert' },
      { city: 'New York City', date: 'March 10-12', venue: 'Carnegie Hall', performance: 'Gala Performance' },
      { city: 'Boston', date: 'March 13-14', venue: 'Symphony Hall', performance: 'Community Concert' },
      { city: 'Philadelphia', date: 'March 15-16', venue: 'Kimmel Center', performance: 'Closing Concert' }
    ],
    alumniOpportunities: [
      'Attend performances with VIP seating',
      'Join post-concert receptions',
      'Host current members in your city',
      'Sponsor a student\'s tour expenses',
      'Volunteer as a city liaison'
    ]
  };

  const handleVolunteer = () => {
    toast.success('Thank you for volunteering! We\'ll contact you soon.');
  };

  const handleRSVP = (city: string) => {
    toast.success(`RSVP confirmed for ${city}!`);
  };

  return (
    <ModuleWrapper
      title="Spring Tour"
      icon={Plane}
    >
      <div className="space-y-6">
        {/* Tour Overview */}
        <Card className="bg-gradient-to-r from-cyan-500/20 via-blue-500/10 to-background border-cyan-500/30">
          <CardHeader>
            <Badge className="w-fit mb-2 bg-cyan-500">{tourInfo.year} Tour</Badge>
            <CardTitle className="text-2xl">{tourInfo.theme}</CardTitle>
            <CardDescription>{tourInfo.dates}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tourInfo.destinations.map((dest) => (
                <Badge key={dest.city} variant="outline" className="gap-1 py-1.5">
                  <MapPin className="h-3 w-3" />
                  {dest.city}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tour Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tour Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {tourInfo.destinations.map((dest, index) => (
                <AccordionItem key={dest.city} value={`item-${index}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-cyan-500" />
                      <span className="font-semibold">{dest.city}</span>
                      <Badge variant="secondary" className="ml-2">{dest.date}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-7 space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        <span><strong>Venue:</strong> {dest.venue}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span><strong>Event:</strong> {dest.performance}</span>
                      </div>
                      <Button size="sm" onClick={() => handleRSVP(dest.city)} className="mt-2">
                        RSVP for {dest.city}
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Alumni Opportunities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How Alumni Can Participate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {tourInfo.alumniOpportunities.map((opportunity, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  {opportunity}
                </li>
              ))}
            </ul>
            <Button onClick={handleVolunteer} className="w-full">
              Volunteer or Get Involved
            </Button>
          </CardContent>
        </Card>
      </div>
    </ModuleWrapper>
  );
}

export default SpringTourModule;
