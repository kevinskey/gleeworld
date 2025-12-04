import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Calendar, MapPin, Plane, Info, Users } from "lucide-react";

const Tour2026Page = () => {
  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="relative rounded-3xl overflow-hidden mb-8 bg-gradient-to-br from-primary via-primary/80 to-primary/60 p-8 md:p-12">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
          <div className="relative z-10 text-white">
            <Badge className="bg-white/20 text-white border-white/30 mb-4">Coming Soon</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">2026 Tour Information Center</h1>
            <p className="text-xl text-white/90 max-w-2xl">
              Get ready for an incredible journey! Stay updated on tour dates, destinations, and everything you need to know for the 2026 Spelman College Glee Club tour.
            </p>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Tour Dates</CardTitle>
              <CardDescription>Upcoming schedule and itinerary</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Tour dates will be announced soon. Check back for the complete 2026 tour schedule.</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Destinations</CardTitle>
              <CardDescription>Where we're going</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Exciting destinations are being finalized. Stay tuned for venue announcements!</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Plane className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Travel Info</CardTitle>
              <CardDescription>Logistics and arrangements</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Travel arrangements and logistics details will be shared with members closer to the tour dates.</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Placeholder */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Tour Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-xl p-8 text-center">
              <Globe className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Information Coming Soon</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                The 2026 Tour Information Center is being prepared. All tour details, including destinations, schedules, packing lists, and important documents will be available here.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              For Tour Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 border">
                <h4 className="font-medium mb-1">Required Documents</h4>
                <p className="text-sm text-muted-foreground">Passports, forms, and other necessary paperwork</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border">
                <h4 className="font-medium mb-1">Packing Guide</h4>
                <p className="text-sm text-muted-foreground">What to bring and wardrobe requirements</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border">
                <h4 className="font-medium mb-1">Health & Safety</h4>
                <p className="text-sm text-muted-foreground">Travel health tips and emergency contacts</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border">
                <h4 className="font-medium mb-1">Performance Schedule</h4>
                <p className="text-sm text-muted-foreground">Rehearsal times and concert venues</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </UniversalLayout>
  );
};

export default Tour2026Page;
