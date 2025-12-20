import { useState } from 'react';
import { ModuleWrapper } from '@/components/modules/ModuleWrapper';
import { PartyPopper, Calendar, MapPin, Users, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModuleProps } from '@/types/unified-modules';
import { toast } from 'sonner';

export function ReunionModule({ user, isFullPage }: ModuleProps) {
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('upcoming');

  const reunionYears = [
    { year: 2024, theme: 'Legacy of Excellence', attendees: 156, photos: 423 },
    { year: 2020, theme: 'Virtual Connection', attendees: 89, photos: 156 },
    { year: 2016, theme: 'Decades of Harmony', attendees: 134, photos: 387 }
  ];

  const upcomingReunion = {
    year: 2028,
    dates: 'April 12-14, 2028',
    theme: 'Voices United: A Century of Song',
    location: 'Spelman College Campus',
    registrationOpen: true,
    registered: 45,
    activities: [
      'Grand Reunion Concert',
      'Class Photo Sessions',
      'Decade Dinner Gatherings',
      'Memory Lane Exhibition',
      'Mentorship Mixer'
    ]
  };

  const handleRegister = () => {
    toast.success('Reunion registration submitted!');
  };

  return (
    <ModuleWrapper
      title="Reunion"
      icon={PartyPopper}
    >
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming">Upcoming Reunion</TabsTrigger>
          <TabsTrigger value="past">Past Reunions</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-6 mt-6">
          <Card className="bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-background border-violet-500/30">
            <CardHeader>
              <Badge className="w-fit mb-2 bg-violet-500">Coming Soon</Badge>
              <CardTitle className="text-2xl">{upcomingReunion.theme}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Badge variant="outline" className="gap-2 py-2 px-4">
                  <Calendar className="h-4 w-4" />
                  {upcomingReunion.dates}
                </Badge>
                <Badge variant="outline" className="gap-2 py-2 px-4">
                  <MapPin className="h-4 w-4" />
                  {upcomingReunion.location}
                </Badge>
                <Badge variant="outline" className="gap-2 py-2 px-4">
                  <Users className="h-4 w-4" />
                  {upcomingReunion.registered} registered
                </Badge>
              </div>

              <div className="mt-6">
                <h4 className="font-semibold mb-3">Planned Activities</h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {upcomingReunion.activities.map((activity, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Heart className="h-4 w-4 text-violet-500" />
                      {activity}
                    </li>
                  ))}
                </ul>
              </div>

              {upcomingReunion.registrationOpen && (
                <Button onClick={handleRegister} size="lg" className="w-full mt-4">
                  Register for Reunion {upcomingReunion.year}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="past" className="space-y-4 mt-6">
          <div className="grid gap-4">
            {reunionYears.map((reunion) => (
              <Card key={reunion.year}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Reunion {reunion.year}</CardTitle>
                    <Badge variant="secondary">{reunion.theme}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {reunion.attendees} attendees
                    </span>
                    <span>📸 {reunion.photos} photos</span>
                  </div>
                  <Button variant="outline" size="sm" className="mt-4">
                    View Gallery
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </ModuleWrapper>
  );
}

export default ReunionModule;
