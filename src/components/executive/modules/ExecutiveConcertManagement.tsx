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
  Music, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Mic, 
  Volume2, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Edit,
  Download,
  FileText,
  Camera,
  Headphones
} from "lucide-react";

interface Concert {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  location: string;
  type: 'formal' | 'informal' | 'competition' | 'special';
  capacity: number;
  ticket_price: number;
  repertoire: string[];
  status: 'planning' | 'rehearsing' | 'ready' | 'completed';
  technical_notes: string;
}

interface Rehearsal {
  id: string;
  concert_id: string;
  date: string;
  time: string;
  location: string;
  focus_areas: string[];
  attendance_required: boolean;
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export const ExecutiveConcertManagement = () => {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConcert, setSelectedConcert] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchConcertData();
  }, []);

  const fetchConcertData = async () => {
    try {
      // Mock data - would integrate with actual database
      const mockConcerts: Concert[] = [
        {
          id: '1',
          title: 'Annual Spring Gala',
          date: '2024-04-15',
          time: '19:30',
          venue: 'Spelman College Auditorium',
          location: 'Atlanta, GA',
          type: 'formal',
          capacity: 500,
          ticket_price: 25,
          repertoire: ['Ave Maria', 'Lift Every Voice and Sing', 'Georgia On My Mind'],
          status: 'rehearsing',
          technical_notes: 'Piano tuning required, wireless mics preferred'
        },
        {
          id: '2',
          title: 'Community Outreach Performance',
          date: '2024-03-20',
          time: '14:00',
          venue: 'Atlanta Community Center',
          location: 'Atlanta, GA',
          type: 'informal',
          capacity: 200,
          ticket_price: 0,
          repertoire: ['Amazing Grace', 'Swing Low Sweet Chariot', 'Wade in the Water'],
          status: 'ready',
          technical_notes: 'Portable sound system needed'
        }
      ];

      const mockRehearsals: Rehearsal[] = [
        {
          id: '1',
          concert_id: '1',
          date: '2024-03-18',
          time: '18:00',
          location: 'Glee Club Rehearsal Room',
          focus_areas: ['Ave Maria - Soprano sections', 'Stage movements', 'Costume fitting'],
          attendance_required: true,
          notes: 'Final dress rehearsal before Spring Gala',
          status: 'scheduled'
        },
        {
          id: '2',
          concert_id: '1',
          date: '2024-03-15',
          time: '17:30',
          location: 'Glee Club Rehearsal Room',
          focus_areas: ['Vocal warm-ups', 'Georgia On My Mind dynamics'],
          attendance_required: true,
          notes: 'Focus on breath control and projection',
          status: 'completed'
        }
      ];

      setConcerts(mockConcerts);
      setRehearsals(mockRehearsals);
    } catch (error) {
      console.error('Error fetching concert data:', error);
      toast({
        title: "Error",
        description: "Failed to load concert data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-yellow-100 text-yellow-800';
      case 'rehearsing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'formal': return 'bg-purple-100 text-purple-800';
      case 'informal': return 'bg-orange-100 text-orange-800';
      case 'competition': return 'bg-red-100 text-red-800';
      case 'special': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Concert Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading concert data...</div>
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
              <Music className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Upcoming Concerts</p>
                <p className="text-2xl font-bold">{concerts.filter(c => c.status !== 'completed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Scheduled Rehearsals</p>
                <p className="text-2xl font-bold">{rehearsals.filter(r => r.status === 'scheduled').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Total Audience Capacity</p>
                <p className="text-2xl font-bold">{concerts.reduce((sum, concert) => sum + concert.capacity, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="text-sm font-medium">Ready to Perform</p>
                <p className="text-2xl font-bold">{concerts.filter(c => c.status === 'ready').length}</p>
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
                <Music className="h-5 w-5" />
                Concert Management Dashboard
              </CardTitle>
              <CardDescription>
                Coordinate concerts, rehearsals, and performance logistics
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Schedule
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Concert
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="concerts" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="concerts">Concerts</TabsTrigger>
              <TabsTrigger value="rehearsals">Rehearsals</TabsTrigger>
              <TabsTrigger value="repertoire">Repertoire</TabsTrigger>
              <TabsTrigger value="technical">Technical Specs</TabsTrigger>
            </TabsList>

            <TabsContent value="concerts" className="space-y-4">
              <div className="space-y-4">
                {concerts.map((concert) => (
                  <Card key={concert.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{concert.title}</h3>
                            <Badge className={getStatusColor(concert.status)}>
                              <span className="capitalize">{concert.status}</span>
                            </Badge>
                            <Badge className={getTypeColor(concert.type)}>
                              <span className="capitalize">{concert.type}</span>
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(concert.date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {concert.time}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {concert.venue}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {concert.capacity} capacity
                            </div>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Repertoire:</span> {concert.repertoire.join(', ')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Technical Notes:</span> {concert.technical_notes}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-semibold">${concert.ticket_price}</p>
                            <p className="text-sm text-muted-foreground">Ticket Price</p>
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

            <TabsContent value="rehearsals" className="space-y-4">
              <div className="mb-4">
                <Select value={selectedConcert || ""} onValueChange={setSelectedConcert}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Filter by concert" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Concerts</SelectItem>
                    {concerts.map((concert) => (
                      <SelectItem key={concert.id} value={concert.id}>
                        {concert.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {rehearsals
                  .filter(rehearsal => !selectedConcert || rehearsal.concert_id === selectedConcert)
                  .map((rehearsal) => (
                  <Card key={rehearsal.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              {concerts.find(c => c.id === rehearsal.concert_id)?.title} - Rehearsal
                            </h3>
                            <Badge className={getStatusColor(rehearsal.status)}>
                              <span className="capitalize">{rehearsal.status}</span>
                            </Badge>
                            {rehearsal.attendance_required && (
                              <Badge variant="destructive">Required</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(rehearsal.date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {rehearsal.time}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {rehearsal.location}
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm font-medium mb-1">Focus Areas:</p>
                        <div className="flex flex-wrap gap-1">
                          {rehearsal.focus_areas.map((area, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Notes:</span> {rehearsal.notes}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="repertoire" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Current Repertoire
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Array.from(new Set(concerts.flatMap(c => c.repertoire))).map((piece, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="font-medium">{piece}</span>
                        <Button variant="ghost" size="sm">
                          <Headphones className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="h-5 w-5" />
                      Performance Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label>Add Performance Notes</Label>
                      <Textarea placeholder="Notes about specific pieces, arrangements, or performance instructions..." />
                      <Button size="sm">Save Notes</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="technical" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Technical Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Sound System Requirements</Label>
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                        <Mic className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Wireless microphones (8)</span>
                        <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                        <Volume2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Main PA system</span>
                        <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                        <Settings className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm">Piano tuning required</span>
                        <AlertCircle className="h-4 w-4 text-yellow-600 ml-auto" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Documentation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Camera className="h-4 w-4 mr-2" />
                      Performance Photos
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Headphones className="h-4 w-4 mr-2" />
                      Audio Recordings
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Program Notes
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Technical Rider
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