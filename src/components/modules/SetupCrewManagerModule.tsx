import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Settings, MessageSquare, Move, Calendar, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ModuleProps } from '@/types/unified-modules';

export const SetupCrewManagerModule: React.FC<ModuleProps> = ({ user, isFullPage }) => {
  const [activeTab, setActiveTab] = useState('crews');

  const crewMembers = [
    { id: 1, name: 'Sarah Johnson', year: 'First Year', status: 'Available', crew: 'Equipment Setup' },
    { id: 2, name: 'Maria Rodriguez', year: 'First Year', status: 'Assigned', crew: 'Sound Tech' },
    { id: 3, name: 'Ashley Chen', year: 'Second Year', status: 'Lead', crew: 'Stage Setup' },
  ];

  const equipmentTasks = [
    { id: 1, task: 'Move piano to rehearsal room', status: 'Pending', assignedTo: 'Setup Team A' },
    { id: 2, task: 'Set up microphones for concert', status: 'In Progress', assignedTo: 'Sound Tech' },
    { id: 3, task: 'Organize music stands', status: 'Completed', assignedTo: 'Stage Setup' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-green-500/20 text-green-700';
      case 'Assigned': return 'bg-blue-500/20 text-blue-700';
      case 'Lead': return 'bg-purple-500/20 text-purple-700';
      case 'Pending': return 'bg-yellow-500/20 text-yellow-700';
      case 'In Progress': return 'bg-blue-500/20 text-blue-700';
      case 'Completed': return 'bg-green-500/20 text-green-700';
      default: return 'bg-gray-500/20 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="crews" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Crew Teams
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-2">
            <Move className="w-4 h-4" />
            Equipment
          </TabsTrigger>
          <TabsTrigger value="communication" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Communication
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Schedule
          </TabsTrigger>
        </TabsList>

        <TabsContent value="crews" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Crew Management</h3>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New Member
            </Button>
          </div>

          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search crew members..." className="pl-9" />
            </div>
          </div>

          <div className="grid gap-4">
            {crewMembers.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{member.name}</h4>
                      <p className="text-sm text-muted-foreground">{member.year}</p>
                      <p className="text-sm font-medium text-primary">{member.crew}</p>
                    </div>
                    <Badge className={getStatusColor(member.status)}>
                      {member.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Equipment & Setup Tasks</h3>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Task
            </Button>
          </div>

          <div className="grid gap-4">
            {equipmentTasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{task.task}</h4>
                      <p className="text-sm text-muted-foreground">Assigned to: {task.assignedTo}</p>
                    </div>
                    <Badge className={getStatusColor(task.status)}>
                      {task.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="communication" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">First Year Communications</h3>
            <Button className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Send Message
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Communications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="border-l-4 border-primary pl-4">
                  <p className="font-medium">Equipment Training Session</p>
                  <p className="text-sm text-muted-foreground">Sent to all first-year crew members</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="font-medium">Setup Schedule for Spring Concert</p>
                  <p className="text-sm text-muted-foreground">Sent to Setup Team A & B</p>
                  <p className="text-xs text-muted-foreground">1 day ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Crew Schedule</h3>
            <Button className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Add Event
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Concert Setup</p>
                    <p className="text-sm text-muted-foreground">March 15, 2024 - 8:00 AM</p>
                    <p className="text-xs text-primary">All crews required</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Equipment Training</p>
                    <p className="text-sm text-muted-foreground">March 12, 2024 - 3:00 PM</p>
                    <p className="text-xs text-primary">First-year orientation</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};