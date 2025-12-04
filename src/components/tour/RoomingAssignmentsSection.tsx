import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bed, Users, Building2 } from "lucide-react";

interface RoomAssignment {
  id: string;
  roomNumber: string;
  hotel: string;
  occupants: {
    name: string;
    voicePart: string;
    avatar?: string;
  }[];
  floor: string;
  checkIn: string;
  checkOut: string;
}

const roomAssignments: RoomAssignment[] = [
  {
    id: '1',
    roomNumber: '412',
    hotel: 'Marriott Downtown Nashville',
    floor: '4th Floor',
    checkIn: 'March 15, 3:00 PM',
    checkOut: 'March 17, 11:00 AM',
    occupants: [
      { name: 'Member Name 1', voicePart: 'Soprano I' },
      { name: 'Member Name 2', voicePart: 'Soprano I' },
    ]
  },
  {
    id: '2',
    roomNumber: '414',
    hotel: 'Marriott Downtown Nashville',
    floor: '4th Floor',
    checkIn: 'March 15, 3:00 PM',
    checkOut: 'March 17, 11:00 AM',
    occupants: [
      { name: 'Member Name 3', voicePart: 'Soprano II' },
      { name: 'Member Name 4', voicePart: 'Alto I' },
    ]
  },
  {
    id: '3',
    roomNumber: '502',
    hotel: 'Marriott Downtown Nashville',
    floor: '5th Floor',
    checkIn: 'March 15, 3:00 PM',
    checkOut: 'March 17, 11:00 AM',
    occupants: [
      { name: 'Member Name 5', voicePart: 'Alto II' },
      { name: 'Member Name 6', voicePart: 'Alto II' },
    ]
  },
];

export const RoomingAssignmentsSection = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Current Hotel: Marriott Downtown Nashville</p>
              <p className="text-sm text-muted-foreground">March 15-17, 2026</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roomAssignments.map((room) => (
          <Card key={room.id} className="overflow-hidden">
            <CardHeader className="bg-primary/5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bed className="h-4 w-4" />
                  Room {room.roomNumber}
                </CardTitle>
                <Badge variant="outline">{room.floor}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{room.occupants.length} Occupants</span>
                </div>
                
                <div className="space-y-2">
                  {room.occupants.map((occupant, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={occupant.avatar} />
                        <AvatarFallback className="text-xs bg-primary/10">
                          {occupant.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{occupant.name}</p>
                        <p className="text-xs text-muted-foreground">{occupant.voicePart}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                  <p>Check-in: {room.checkIn}</p>
                  <p>Check-out: {room.checkOut}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Room assignments are subject to change. Contact your Section Leader with any concerns.
      </p>
    </div>
  );
};
