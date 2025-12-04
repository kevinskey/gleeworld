import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bus, Users, MapPin, ArrowRight } from "lucide-react";

interface BusBuddyPair {
  id: string;
  seatNumber: string;
  buddies: {
    name: string;
    voicePart: string;
    avatar?: string;
  }[];
}

interface BusAssignment {
  busNumber: number;
  busName: string;
  capacity: number;
  pairs: BusBuddyPair[];
}

const busAssignments: BusAssignment[] = [
  {
    busNumber: 1,
    busName: 'Bus A - "Harmony Express"',
    capacity: 56,
    pairs: [
      { id: '1', seatNumber: '1-2', buddies: [{ name: 'Member 1', voicePart: 'Soprano I' }, { name: 'Member 2', voicePart: 'Soprano I' }] },
      { id: '2', seatNumber: '3-4', buddies: [{ name: 'Member 3', voicePart: 'Soprano II' }, { name: 'Member 4', voicePart: 'Soprano II' }] },
      { id: '3', seatNumber: '5-6', buddies: [{ name: 'Member 5', voicePart: 'Alto I' }, { name: 'Member 6', voicePart: 'Alto I' }] },
      { id: '4', seatNumber: '7-8', buddies: [{ name: 'Member 7', voicePart: 'Alto II' }, { name: 'Member 8', voicePart: 'Alto II' }] },
    ]
  },
  {
    busNumber: 2,
    busName: 'Bus B - "Melody Cruiser"',
    capacity: 56,
    pairs: [
      { id: '5', seatNumber: '1-2', buddies: [{ name: 'Member 9', voicePart: 'Soprano I' }, { name: 'Member 10', voicePart: 'Alto I' }] },
      { id: '6', seatNumber: '3-4', buddies: [{ name: 'Member 11', voicePart: 'Soprano II' }, { name: 'Member 12', voicePart: 'Alto II' }] },
    ]
  }
];

export const BusBuddiesSection = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Bus className="h-6 w-6 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Bus Buddy Guidelines</p>
              <p className="text-sm text-muted-foreground">
                Bus buddies are responsible for each other throughout the tour. Please check in with your buddy at every stop. 
                Seat assignments remain the same for the duration of the tour unless otherwise notified.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {busAssignments.map((bus) => (
          <Card key={bus.busNumber}>
            <CardHeader className="bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bus className="h-5 w-5 text-primary" />
                  {bus.busName}
                </CardTitle>
                <Badge variant="outline">
                  <Users className="h-3 w-3 mr-1" />
                  {bus.pairs.length * 2} / {bus.capacity}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {bus.pairs.map((pair) => (
                  <div 
                    key={pair.id} 
                    className="p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        Seats {pair.seatNumber}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {pair.buddies.map((buddy, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center text-center">
                          <Avatar className="h-10 w-10 mb-1">
                            <AvatarImage src={buddy.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {buddy.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-sm font-medium truncate w-full">{buddy.name}</p>
                          <p className="text-xs text-muted-foreground">{buddy.voicePart}</p>
                          {idx === 0 && pair.buddies.length > 1 && (
                            <div className="absolute left-1/2 transform -translate-x-1/2">
                              <ArrowRight className="h-3 w-3 text-muted-foreground hidden" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
