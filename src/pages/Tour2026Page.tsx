import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Globe, 
  Calendar, 
  MapPin, 
  Bed, 
  Users, 
  Bus, 
  FileText, 
  Video,
  Package
} from "lucide-react";

import { TourDatesSection } from "@/components/tour/TourDatesSection";
import { RoomingAssignmentsSection } from "@/components/tour/RoomingAssignmentsSection";
import { CrewAssignmentsSection } from "@/components/tour/CrewAssignmentsSection";
import { BusBuddiesSection } from "@/components/tour/BusBuddiesSection";
import { TourDocumentsSection } from "@/components/tour/TourDocumentsSection";
import { LivePerformancesSection } from "@/components/tour/LivePerformancesSection";

const Tour2026Page = () => {
  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="relative rounded-3xl overflow-hidden mb-8 bg-gradient-to-br from-primary via-primary/80 to-primary/60 p-8 md:p-12">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10 text-white">
            <Badge className="bg-white/20 text-white border-white/30 mb-4">
              <Globe className="h-3 w-3 mr-1" />
              2026 Tour
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Tour Information Center</h1>
            <p className="text-xl text-white/90 max-w-2xl">
              Everything you need for the 2026 Spelman College Glee Club tour. Access schedules, assignments, documents, and live performances all in one place.
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">6</p>
              <p className="text-sm text-muted-foreground">Tour Days</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MapPin className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">5</p>
              <p className="text-sm text-muted-foreground">Cities</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Video className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">4</p>
              <p className="text-sm text-muted-foreground">Performances</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">100+</p>
              <p className="text-sm text-muted-foreground">Members</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="dates" className="space-y-6">
          <TabsList className="grid grid-cols-3 md:grid-cols-6 h-auto gap-2 bg-muted/50 p-2 rounded-xl">
            <TabsTrigger 
              value="dates" 
              className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 data-[state=active]:bg-background"
            >
              <Calendar className="h-4 w-4" />
              <span className="text-xs md:text-sm">Dates</span>
            </TabsTrigger>
            <TabsTrigger 
              value="rooming" 
              className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 data-[state=active]:bg-background"
            >
              <Bed className="h-4 w-4" />
              <span className="text-xs md:text-sm">Rooms</span>
            </TabsTrigger>
            <TabsTrigger 
              value="crew" 
              className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 data-[state=active]:bg-background"
            >
              <Package className="h-4 w-4" />
              <span className="text-xs md:text-sm">Crew</span>
            </TabsTrigger>
            <TabsTrigger 
              value="bus" 
              className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 data-[state=active]:bg-background"
            >
              <Bus className="h-4 w-4" />
              <span className="text-xs md:text-sm">Bus</span>
            </TabsTrigger>
            <TabsTrigger 
              value="documents" 
              className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 data-[state=active]:bg-background"
            >
              <FileText className="h-4 w-4" />
              <span className="text-xs md:text-sm">Docs</span>
            </TabsTrigger>
            <TabsTrigger 
              value="live" 
              className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 data-[state=active]:bg-background"
            >
              <Video className="h-4 w-4" />
              <span className="text-xs md:text-sm">Live</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dates" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Tour Schedule & Locations
                </h2>
                <TourDatesSection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rooming" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Bed className="h-5 w-5 text-primary" />
                  Rooming Assignments
                </h2>
                <RoomingAssignmentsSection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="crew" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Merch & Setup Crew
                </h2>
                <CrewAssignmentsSection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bus" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Bus className="h-5 w-5 text-primary" />
                  Bus Buddies
                </h2>
                <BusBuddiesSection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Tour Documents
                </h2>
                <TourDocumentsSection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="live" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Live Performances
                </h2>
                <LivePerformancesSection />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </UniversalLayout>
  );
};

export default Tour2026Page;
