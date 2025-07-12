import { useState } from "react";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, DollarSign, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventsList } from "@/components/events/EventsList";
import { CreateEventDialog } from "@/components/events/CreateEventDialog";

export default function EventPlanner() {
  const [activeTab, setActiveTab] = useState("events");

  return (
    <UniversalLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-white">Event Budget Planner</h1>
          <p className="text-white/70">
            Plan events, manage budgets, and track expenses for student functions
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Events
            </TabsTrigger>
            <TabsTrigger value="budget" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Budget Overview
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your Events</h2>
              <CreateEventDialog />
            </div>
            <EventsList />
          </TabsContent>

          <TabsContent value="budget" className="space-y-6">
            <Card>
              <CardContent className="py-12 text-center">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Budget Overview</h3>
                <p className="text-muted-foreground mb-4">
                  Select an event to view its budget details and line items.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Team Management</h3>
                <p className="text-muted-foreground mb-4">
                  Select an event to manage team members and assign roles.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </UniversalLayout>
  );
}