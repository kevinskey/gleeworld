import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Bus, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  Plane, 
  Hotel, 
  Music, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload
} from "lucide-react";

interface Tour {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'confirmed' | 'in_progress' | 'completed';
  venues: number;
  participants: number;
  budget: number;
  notes: string;
}

interface ConcertLogistics {
  id: string;
  tour_id: string;
  venue_name: string;
  location: string;
  date: string;
  time: string;
  setup_time: string;
  soundcheck_time: string;
  capacity: number;
  technical_requirements: string;
  catering_arranged: boolean;
  transportation_arranged: boolean;
  accommodation_arranged: boolean;
  status: 'pending' | 'confirmed' | 'completed';
}

export const ExecutiveToursLogistics = () => {
  const [tours, setTours] = useState<Tour[]>([]);
  const [logistics, setLogistics] = useState<ConcertLogistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTour, setSelectedTour] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchToursAndLogistics();
  }, []);

  const fetchToursAndLogistics = async () => {
    try {
      // For now, using mock data - would integrate with actual database
      const mockTours: Tour[] = [
        {
          id: '1',
          name: 'Spring Concert Tour 2024',
          start_date: '2024-03-15',
          end_date: '2024-03-22',
          status: 'planning',
          venues: 5,
          participants: 45,
          budget: 25000,
          notes: 'Annual spring tour visiting regional universities'
        },
        {
          id: '2',
          name: 'Holiday Concert Series',
          start_date: '2024-12-10',
          end_date: '2024-12-18',
          status: 'confirmed',
          venues: 3,
          participants: 40,
          budget: 15000,
          notes: 'Local holiday performances in Atlanta area'
        }
      ];

      const mockLogistics: ConcertLogistics[] = [
        {
          id: '1',
          tour_id: '1',
          venue_name: 'Clark Atlanta University - CAU Art Gallery',
          location: 'Atlanta, GA',
          date: '2024-03-16',
          time: '19:00',
          setup_time: '16:00',
          soundcheck_time: '17:30',
          capacity: 200,
          technical_requirements: 'Piano, sound system, stage lighting',
          catering_arranged: true,
          transportation_arranged: false,
          accommodation_arranged: true,
          status: 'confirmed'
        },
        {
          id: '2',
          tour_id: '1',
          venue_name: 'Morehouse College - King Chapel',
          location: 'Atlanta, GA',
          date: '2024-03-18',
          time: '18:30',
          setup_time: '15:30',
          soundcheck_time: '17:00',
          capacity: 300,
          technical_requirements: 'Organ, microphones, choir risers',
          catering_arranged: false,
          transportation_arranged: true,
          accommodation_arranged: false,
          status: 'pending'
        }
      ];

      setTours(mockTours);
      setLogistics(mockLogistics);
    } catch (error) {
      console.error('Error fetching tours and logistics:', error);
      toast({
        title: "Error",
        description: "Failed to load tours and logistics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
      case 'planning':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bus className="h-5 w-5" />
            Tours & Concert Logistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading tours and logistics...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bus className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Active Tours</p>
                <p className="text-2xl font-bold">{tours.filter(t => t.status === 'in_progress').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Upcoming Concerts</p>
                <p className="text-2xl font-bold">{logistics.filter(l => l.status === 'confirmed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Total Participants</p>
                <p className="text-2xl font-bold">{tours.reduce((sum, tour) => sum + tour.participants, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="text-sm font-medium">Total Venues</p>
                <p className="text-2xl font-bold">{tours.reduce((sum, tour) => sum + tour.venues, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bus className="h-5 w-5" />
                Tours & Concert Logistics Management
              </CardTitle>
              <CardDescription>
                Plan and coordinate tours, concerts, and logistics for the Glee Club
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Tour
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tours" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tours">Tours Overview</TabsTrigger>
              <TabsTrigger value="logistics">Concert Logistics</TabsTrigger>
              <TabsTrigger value="resources">Resources & Planning</TabsTrigger>
            </TabsList>

            <TabsContent value="tours" className="space-y-4">
              <div className="space-y-4">
                {tours.map((tour) => (
                  <Card key={tour.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{tour.name}</h3>
                            <Badge className={getStatusColor(tour.status)}>
                              {getStatusIcon(tour.status)}
                              <span className="ml-1 capitalize">{tour.status.replace('_', ' ')}</span>
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(tour.start_date).toLocaleDateString()} - {new Date(tour.end_date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {tour.venues} venues
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {tour.participants} participants
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{tour.notes}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-semibold">${tour.budget.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">Budget</p>
                          </div>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="logistics" className="space-y-4">
              <div className="mb-4">
                <Select value={selectedTour || ""} onValueChange={setSelectedTour}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Filter by tour" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Tours</SelectItem>
                    {tours.map((tour) => (
                      <SelectItem key={tour.id} value={tour.id}>
                        {tour.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {logistics
                  .filter(logistic => !selectedTour || logistic.tour_id === selectedTour)
                  .map((logistic) => (
                  <Card key={logistic.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{logistic.venue_name}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {logistic.location}
                          </p>
                        </div>
                        <Badge className={getStatusColor(logistic.status)}>
                          {getStatusIcon(logistic.status)}
                          <span className="ml-1 capitalize">{logistic.status}</span>
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(logistic.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{logistic.time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{logistic.capacity} capacity</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Music className="h-4 w-4 text-muted-foreground" />
                          <span>Setup: {logistic.setup_time}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <Hotel className={`h-4 w-4 ${logistic.accommodation_arranged ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">Accommodation</span>
                          {logistic.accommodation_arranged && <CheckCircle className="h-4 w-4 text-green-600" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <Bus className={`h-4 w-4 ${logistic.transportation_arranged ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">Transportation</span>
                          {logistic.transportation_arranged && <CheckCircle className="h-4 w-4 text-green-600" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className={`h-4 w-4 ${logistic.catering_arranged ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">Catering</span>
                          {logistic.catering_arranged && <CheckCircle className="h-4 w-4 text-green-600" />}
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground mb-3">
                        <strong>Technical Requirements:</strong> {logistic.technical_requirements}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Details
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Export Info
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="resources" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Planning Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Tour Planning Template
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Venue Contact Sheet
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Budget Tracking Spreadsheet
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Emergency Contact List
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full justify-start">
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule New Concert
                    </Button>
                    <Button className="w-full justify-start" variant="secondary">
                      <Calendar className="h-4 w-4 mr-2" />
                      View Master Calendar
                    </Button>
                    <Button className="w-full justify-start" variant="secondary">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Participants
                    </Button>
                    <Button className="w-full justify-start" variant="secondary">
                      <Bus className="h-4 w-4 mr-2" />
                      Transportation Coordinator
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};