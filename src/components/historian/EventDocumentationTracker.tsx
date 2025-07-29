import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  Search, 
  Filter, 
  CheckCircle, 
  X, 
  Camera, 
  FileText,
  Download,
  Eye
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  type: string;
  mediaUploaded: boolean;
  journalEntry: boolean;
  documented: boolean;
  tags: string[];
}

export const EventDocumentationTracker = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [showDocumented, setShowDocumented] = useState(true);
  const [showUndocumented, setShowUndocumented] = useState(true);

  // Mock data
  const [events, setEvents] = useState<Event[]>([
    {
      id: "1",
      title: "MLK Convocation",
      date: "2024-01-15",
      location: "Sisters Chapel",
      type: "Service",
      mediaUploaded: true,
      journalEntry: true,
      documented: true,
      tags: ["MLK", "Service", "Centennial"]
    },
    {
      id: "2",
      title: "Fall Concert",
      date: "2024-11-20",
      location: "Spelman College",
      type: "Concert",
      mediaUploaded: true,
      journalEntry: false,
      documented: false,
      tags: ["Concert", "Fall"]
    },
    {
      id: "3",
      title: "Homecoming Performance",
      date: "2024-10-15",
      location: "Alumni Stadium",
      type: "Performance",
      mediaUploaded: false,
      journalEntry: false,
      documented: false,
      tags: ["Homecoming", "Alumni"]
    },
    {
      id: "4",
      title: "Christmas Concert",
      date: "2024-12-10",
      location: "Atlanta Symphony Hall",
      type: "Concert",
      mediaUploaded: false,
      journalEntry: false,
      documented: false,
      tags: ["Concert", "Christmas", "Community"]
    }
  ]);

  const toggleEventDocumentation = (eventId: string, field: keyof Event, value: boolean) => {
    setEvents(events.map(event => 
      event.id === eventId 
        ? { ...event, [field]: value }
        : event
    ));
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMonth = !filterMonth || event.date.includes(filterMonth);
    
    const matchesTag = !filterTag || event.tags.some(tag => 
      tag.toLowerCase().includes(filterTag.toLowerCase())
    );
    
    const matchesDocumentationFilter = 
      (showDocumented && event.documented) || 
      (showUndocumented && !event.documented);
    
    return matchesSearch && matchesMonth && matchesTag && matchesDocumentationFilter;
  });

  const getDocumentationStatus = (event: Event) => {
    if (event.documented) return { label: "Completed", variant: "default" as const };
    if (event.mediaUploaded && event.journalEntry) return { label: "Ready", variant: "secondary" as const };
    if (event.mediaUploaded || event.journalEntry) return { label: "In Progress", variant: "outline" as const };
    return { label: "Not Started", variant: "destructive" as const };
  };

  const completionStats = {
    total: events.length,
    documented: events.filter(e => e.documented).length,
    mediaUploaded: events.filter(e => e.mediaUploaded).length,
    journalEntries: events.filter(e => e.journalEntry).length
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{completionStats.documented}</div>
            <div className="text-sm text-muted-foreground">Events Documented</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{completionStats.mediaUploaded}</div>
            <div className="text-sm text-muted-foreground">Media Uploaded</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{completionStats.journalEntries}</div>
            <div className="text-sm text-muted-foreground">Journal Entries</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {Math.round((completionStats.documented / completionStats.total) * 100)}%
            </div>
            <div className="text-sm text-muted-foreground">Completion Rate</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Event Documentation Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Months</SelectItem>
                <SelectItem value="2024-01">January 2024</SelectItem>
                <SelectItem value="2024-10">October 2024</SelectItem>
                <SelectItem value="2024-11">November 2024</SelectItem>
                <SelectItem value="2024-12">December 2024</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="documented"
                  checked={showDocumented}
                  onCheckedChange={(checked) => setShowDocumented(checked as boolean)}
                />
                <label htmlFor="documented" className="text-sm">Documented</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="undocumented"
                  checked={showUndocumented}
                  onCheckedChange={(checked) => setShowUndocumented(checked as boolean)}
                />
                <label htmlFor="undocumented" className="text-sm">Undocumented</label>
              </div>
            </div>
          </div>

          {/* Events Table */}
          <div className="border rounded-lg">
            <div className="grid grid-cols-12 gap-4 p-4 border-b bg-muted/50 font-medium text-sm">
              <div className="col-span-3">Event</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-1">Media</div>
              <div className="col-span-1">Journal</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Actions</div>
            </div>
            
            {filteredEvents.map((event) => {
              const status = getDocumentationStatus(event);
              return (
                <div key={event.id} className="grid grid-cols-12 gap-4 p-4 border-b last:border-b-0 items-center hover:bg-muted/20">
                  <div className="col-span-3">
                    <div className="font-medium">{event.title}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {event.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2 text-sm">
                    {new Date(event.date).toLocaleDateString()}
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground">
                    {event.location}
                  </div>
                  <div className="col-span-1">
                    <Checkbox
                      checked={event.mediaUploaded}
                      onCheckedChange={(checked) => 
                        toggleEventDocumentation(event.id, 'mediaUploaded', checked as boolean)
                      }
                    />
                  </div>
                  <div className="col-span-1">
                    <Checkbox
                      checked={event.journalEntry}
                      onCheckedChange={(checked) => 
                        toggleEventDocumentation(event.id, 'journalEntry', checked as boolean)
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <Checkbox
                        checked={event.documented}
                        onCheckedChange={(checked) => 
                          toggleEventDocumentation(event.id, 'documented', checked as boolean)
                        }
                      />
                    </div>
                  </div>
                  <div className="col-span-1">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};