import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Plus } from "lucide-react";

export const LiturgicalPlanning = () => {
  const events = [
    {
      id: 1,
      title: "Sunday Service Opening",
      date: "2024-08-04",
      time: "11:00 AM",
      location: "Spelman Chapel",
      songs: ["Amazing Grace", "Lift Every Voice and Sing"]
    },
    {
      id: 2,
      title: "Mid-Week Devotional",
      date: "2024-08-07",
      time: "7:00 PM",
      location: "Music Hall",
      songs: ["Be Still My Soul", "How Great Thou Art"]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Liturgical Planning</h3>
          <p className="text-sm text-muted-foreground">Plan worship services and spiritual events</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Plan Event
        </Button>
      </div>

      <div className="grid gap-4">
        {events.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {event.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {event.time}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {event.location}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Planned Songs:</h4>
                  <div className="flex flex-wrap gap-2">
                    {event.songs.map((song, index) => (
                      <span key={index} className="px-2 py-1 bg-muted rounded-md text-sm">
                        {song}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};