import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, Bus, MapPin, Music, Users, Package, CheckCircle2, 
  AlertCircle, Plus, Edit, Trash2, Save, Calendar, Megaphone,
  ShoppingBag, ClipboardList, UserCheck, Timer, DoorOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeSlot {
  id: string;
  label: string;
  time: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed';
}

interface CrewAssignment {
  id: string;
  name: string;
  role: string;
  callTime: string;
  duties: string[];
}

interface MerchItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

// Mock data for demonstration
const mockEventTimeline: TimeSlot[] = [
  { id: '1', label: 'Setup Crew Call', time: '10:00 AM', status: 'confirmed', notes: 'Load in through back entrance' },
  { id: '2', label: 'Bus Departure', time: '11:00 AM', status: 'confirmed', notes: 'Depart from Spelman campus' },
  { id: '3', label: 'Arrival at Venue', time: '2:00 PM', status: 'pending' },
  { id: '4', label: 'Sound Check', time: '3:00 PM', status: 'pending', notes: 'Full ensemble run-through' },
  { id: '5', label: 'Performer Call Time', time: '5:00 PM', status: 'pending' },
  { id: '6', label: 'Off Stage (Doors Open)', time: '6:30 PM', status: 'pending' },
  { id: '7', label: 'Performance Start', time: '7:00 PM', status: 'pending' },
  { id: '8', label: 'Performance End', time: '9:00 PM', status: 'pending' },
  { id: '9', label: 'Load Out Complete', time: '10:30 PM', status: 'pending' },
];

const mockCrewAssignments: CrewAssignment[] = [
  { id: '1', name: 'Stage Manager', role: 'Lead', callTime: '10:00 AM', duties: ['Coordinate load-in', 'Manage backstage', 'Cue performers'] },
  { id: '2', name: 'Sound Tech', role: 'Audio', callTime: '10:00 AM', duties: ['Set up microphones', 'Sound check', 'Mix during performance'] },
  { id: '3', name: 'Lighting Tech', role: 'Lighting', callTime: '10:00 AM', duties: ['Program lighting cues', 'Operate light board'] },
  { id: '4', name: 'Merch Lead', role: 'Merchandise', callTime: '5:00 PM', duties: ['Set up merch table', 'Handle sales', 'Inventory tracking'] },
];

const mockMerchItems: MerchItem[] = [
  { id: '1', name: 'Concert T-Shirt', quantity: 50, price: 25, notes: 'Sizes S-XXL' },
  { id: '2', name: 'Tour Hoodie', quantity: 30, price: 45 },
  { id: '3', name: 'CD Album', quantity: 100, price: 15 },
  { id: '4', name: 'Poster', quantity: 75, price: 10 },
];

export const TourLogisticsSection = () => {
  const [activeTab, setActiveTab] = useState('timeline');
  const [timeline, setTimeline] = useState<TimeSlot[]>(mockEventTimeline);
  const [crewAssignments, setCrewAssignments] = useState<CrewAssignment[]>(mockCrewAssignments);
  const [merchItems, setMerchItems] = useState<MerchItem[]>(mockMerchItems);
  const [isAddingTime, setIsAddingTime] = useState(false);
  const [isAddingCrew, setIsAddingCrew] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>('');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'confirmed':
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Completed</Badge>;
      case 'confirmed':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">Confirmed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Tour Logistics</h2>
          <p className="text-muted-foreground">Manage call times, schedules, crew, and merchandise</p>
        </div>
        <Select value={selectedEvent} onValueChange={setSelectedEvent}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select Tour Event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="spring-tour-2025">Spring Tour 2025 - Atlanta</SelectItem>
            <SelectItem value="homecoming-2025">Homecoming Concert 2025</SelectItem>
            <SelectItem value="christmas-tour">Christmas Tour - NYC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="timeline" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="crew" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Crew</span>
          </TabsTrigger>
          <TabsTrigger value="merch" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Merch</span>
          </TabsTrigger>
          <TabsTrigger value="checklist" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Checklist</span>
          </TabsTrigger>
        </TabsList>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Event Timeline</h3>
            <Dialog open={isAddingTime} onOpenChange={setIsAddingTime}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time Slot
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Time Slot</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Event Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call">Call Time</SelectItem>
                          <SelectItem value="departure">Bus Departure</SelectItem>
                          <SelectItem value="arrival">Arrival</SelectItem>
                          <SelectItem value="soundcheck">Sound Check</SelectItem>
                          <SelectItem value="doors">Doors Open</SelectItem>
                          <SelectItem value="performance">Performance</SelectItem>
                          <SelectItem value="loadout">Load Out</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input type="time" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea placeholder="Additional details..." />
                  </div>
                  <Button className="w-full" onClick={() => setIsAddingTime(false)}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Time Slot
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Timeline Visual */}
          <Card>
            <CardContent className="p-6">
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                
                <div className="space-y-6">
                  {timeline.map((slot, index) => (
                    <div key={slot.id} className="relative flex gap-4 pl-10">
                      {/* Timeline dot */}
                      <div className={cn(
                        "absolute left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-background",
                        slot.status === 'completed' ? "border-green-500" :
                        slot.status === 'confirmed' ? "border-blue-500" : "border-muted-foreground"
                      )}>
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          slot.status === 'completed' ? "bg-green-500" :
                          slot.status === 'confirmed' ? "bg-blue-500" : "bg-muted-foreground"
                        )} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 bg-muted/30 rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-primary">{slot.time}</span>
                            <h4 className="font-medium">{slot.label}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(slot.status)}
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {slot.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{slot.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Time Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4 text-center">
                <Bus className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <p className="text-sm text-muted-foreground">Bus Leaves</p>
                <p className="text-xl font-bold text-blue-600">11:00 AM</p>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4 text-center">
                <MapPin className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <p className="text-sm text-muted-foreground">Arrival</p>
                <p className="text-xl font-bold text-purple-600">2:00 PM</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
              <CardContent className="p-4 text-center">
                <Music className="h-8 w-8 mx-auto mb-2 text-amber-600" />
                <p className="text-sm text-muted-foreground">Sound Check</p>
                <p className="text-xl font-bold text-amber-600">3:00 PM</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CardContent className="p-4 text-center">
                <DoorOpen className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm text-muted-foreground">Doors Open</p>
                <p className="text-xl font-bold text-green-600">6:30 PM</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Crew Tab */}
        <TabsContent value="crew" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Setup Crew Assignments</h3>
            <Dialog open={isAddingCrew} onOpenChange={setIsAddingCrew}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Crew Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Crew Assignment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Role/Position</Label>
                    <Input placeholder="e.g., Stage Manager" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Assign To</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member1">Jane Doe</SelectItem>
                          <SelectItem value="member2">Mary Smith</SelectItem>
                          <SelectItem value="member3">Sarah Johnson</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Call Time</Label>
                      <Input type="time" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Duties</Label>
                    <Textarea placeholder="List responsibilities..." />
                  </div>
                  <Button className="w-full" onClick={() => setIsAddingCrew(false)}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Assignment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {crewAssignments.map((crew) => (
              <Card key={crew.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <UserCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{crew.name}</CardTitle>
                        <Badge variant="outline" className="mt-1">{crew.role}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Call Time</p>
                      <p className="font-bold text-primary">{crew.callTime}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Separator className="my-3" />
                  <div>
                    <p className="text-sm font-medium mb-2">Duties:</p>
                    <ul className="space-y-1">
                      {crew.duties.map((duty, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          {duty}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Merchandise Tab */}
        <TabsContent value="merch" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Merchandise Coordination</h3>
              <p className="text-sm text-muted-foreground">Collaborate with Merch Manager for this event</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Megaphone className="h-4 w-4 mr-2" />
                Contact Merch Manager
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>

          {/* Merch Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Items</p>
                    <p className="text-2xl font-bold">{merchItems.reduce((acc, item) => acc + item.quantity, 0)}</p>
                  </div>
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Potential Revenue</p>
                    <p className="text-2xl font-bold">${merchItems.reduce((acc, item) => acc + (item.quantity * item.price), 0).toLocaleString()}</p>
                  </div>
                  <ShoppingBag className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Product Types</p>
                    <p className="text-2xl font-bold">{merchItems.length}</p>
                  </div>
                  <ClipboardList className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Setup Time</p>
                    <p className="text-2xl font-bold">5:00 PM</p>
                  </div>
                  <Timer className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Merch Items Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inventory for Event</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Item</th>
                      <th className="text-center py-3 px-4 font-medium">Quantity</th>
                      <th className="text-center py-3 px-4 font-medium">Price</th>
                      <th className="text-center py-3 px-4 font-medium">Total Value</th>
                      <th className="text-left py-3 px-4 font-medium">Notes</th>
                      <th className="text-right py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {merchItems.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{item.name}</td>
                        <td className="py-3 px-4 text-center">{item.quantity}</td>
                        <td className="py-3 px-4 text-center">${item.price}</td>
                        <td className="py-3 px-4 text-center font-medium">${(item.quantity * item.price).toLocaleString()}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{item.notes || '-'}</td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist" className="space-y-4">
          <h3 className="text-lg font-semibold">Pre-Event Checklist</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bus className="h-5 w-5" />
                  Transportation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Bus confirmed and inspected', checked: true },
                  { label: 'Driver contact info shared', checked: true },
                  { label: 'Route mapped and shared', checked: false },
                  { label: 'Rest stops planned', checked: false },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center",
                      item.checked ? "bg-green-500 border-green-500" : "border-muted-foreground"
                    )}>
                      {item.checked && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    <span className={cn("text-sm", item.checked && "line-through text-muted-foreground")}>{item.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Sound check time confirmed', checked: true },
                  { label: 'Set list finalized', checked: true },
                  { label: 'Wardrobe ready', checked: false },
                  { label: 'Props/staging confirmed', checked: false },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center",
                      item.checked ? "bg-green-500 border-green-500" : "border-muted-foreground"
                    )}>
                      {item.checked && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    <span className={cn("text-sm", item.checked && "line-through text-muted-foreground")}>{item.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Merchandise
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Inventory counted', checked: true },
                  { label: 'Cash box prepared', checked: false },
                  { label: 'Card reader charged', checked: false },
                  { label: 'Merch table supplies packed', checked: false },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center",
                      item.checked ? "bg-green-500 border-green-500" : "border-muted-foreground"
                    )}>
                      {item.checked && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    <span className={cn("text-sm", item.checked && "line-through text-muted-foreground")}>{item.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Crew & Personnel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'All crew assigned', checked: true },
                  { label: 'Call times communicated', checked: true },
                  { label: 'Emergency contacts shared', checked: true },
                  { label: 'Duty sheets distributed', checked: false },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center",
                      item.checked ? "bg-green-500 border-green-500" : "border-muted-foreground"
                    )}>
                      {item.checked && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    <span className={cn("text-sm", item.checked && "line-through text-muted-foreground")}>{item.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
